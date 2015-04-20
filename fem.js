"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

var VNode = _interopRequire(require("virtual-dom/vnode/vnode"));

var VText = _interopRequire(require("virtual-dom/vnode/vtext"));

var diff = _interopRequire(require("virtual-dom/diff"));

var toVdom = _interopRequire(require("html-to-vdom"));

var Store = _interopRequire(require("jfs"));

var _ = _interopRequire(require("lodash"));

var htmlToVDOM = toVdom({
    VNode: VNode,
    VText: VText
});

var noop = function () {};

/** removes duplicate elements from a list
 *
 * list -> Array of Leadfoot::Element
 *
 * returns the filtered list
 */
var removeDuplicateElements = _.partialRight(_.uniq, "_elementId");

/** removes undefined and falsy values **/
var removeUndefined = function (arr) {
    return arr.filter(function (item) {
        return !!item;
    });
};

var flattenDedupeSanitise = _.compose(removeUndefined, removeDuplicateElements, _.flattenDeep);

var sum = function (fold, n) {
    return fold + n;
};

/** specifies where all the specs are persisted – https://github.com/flosse/json-file-store#json-file-store
 *
 * FIXME: we must be able to initialise it with a custom path, move it into constructor?
 */
var SPEC_STORE = null;

/** finds a list of candidate elements in a session, based on a HTML element
 *
 * vnode    - VirtualNode, the node used as a baseline for queries
 * session  - Leadfoot::Session
 *
 * returns an Array of Leadfoot::Element
 */
var getCandidates = function (vnode, session) {
    // console.log('getCandidates() ======');
    var classQueries = Promise.all(vnode.properties.className.split(" ").map(function (className) {
        return session.findAllByClassName(className)["catch"](noop);
    }));
    return Promise.all([session.findAllByTagName(vnode.tagName)["catch"](noop), classQueries, session.findById(vnode.properties.id)["catch"](noop)]);
};

/** finds the best match from a list of candidates
 *
 * README: think of a way of adding some weight to attributes. e.g. `id` should be more important than `textContent`.
 *
 * vnode        - VirtualNode representing the current version of the element, or the one to be "diffed against"
 * candidates   - List of Objects like { original: Leadfoot::Element, html: String, vnode: VirtualNode(s) }
 *
 * returns an Object, which is the best match.
 */
var findBestMatch = function (vnode, candidates) {
    // console.log('findBestMatch() ======');
    var candidates = candidates
    // FIXME: this is a little confusing and naive, simply counts the differences
    .map(function (candidate) {

        var patches = diff(vnode, candidate.vnode);
        var topLevelDiffs = Object.keys(patches).length - 1;

        var deepDiffs = Object.keys(patches).map(function (item) {

            if (item === "a") {
                return 0;
            }

            return Object.keys(patches[item].patch).length; // get number of lower level diffs
        }).reduce(sum, 0);

        candidate.diffs = topLevelDiffs + deepDiffs;
        return candidate;
    });

    return _.sortBy(candidates, "diffs")[0]; // return the one with the least amount of diffs
};

/** converts Leadfoot::Element(s) to outerHTML
 *
 * list - List of Leadfoot::Element(s)
 *
 * returns a string (outerHTML)
 */
var elementsToHTML = function (list) {
    // console.log('elementsToHTML() ======');
    return Promise.all(list.map(function (node) {
        return node.getProperty("outerHTML").then(function (outerHTML) {
            return { original: node, html: outerHTML };
        });
    }));
};

/** converts HTML strings to VDOM Nodes
 *
 * list - List of objects like { original: Leadfoot::Element, html: String }
 *
 * returns a list of VirtualNode(s)
 */
var nodesToVDOM = function (list) {
    return list.map(function (node) {
        return { original: node.original, html: node.html, vnode: htmlToVDOM(node.html) };
    });
};

/** promisifies the saving of a spec to store
 * key  - the key to save the spec under, also the file name.
 * spec - the spec to be saved
 *
 * retruns a Promise
 */
var saveSpec = function (key, spec) {
    // console.log('saveSpec() ======');

    return new Promise(function (resolve, reject) {
        SPEC_STORE.save(key, spec, function (err, res) {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    })["catch"](function () {
        throw new Error("'ElementMatcher: Could not save Spec " + key + " to " + SPEC_STORE._dir);
    });
};

/** promisifies the reading of a spec to store
 *
 * key  - the key to save the spec under, also the file name.
 * spec - the spec to be saved
 *
 * retruns a Promise
 */
var getSpec = function (key) {
    // console.log('getSpec() ======');

    return new Promise(function (resolve, reject) {
        SPEC_STORE.get(key, function (err, res) {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    })["catch"](function () {
        throw new Error("'ElementMatcher: Could not load Spec " + key + " from " + SPEC_STORE._dir);
    });
};

var ElementMatcher = (function () {
    function ElementMatcher() {
        var opts = arguments[0] === undefined ? {} : arguments[0];

        _classCallCheck(this, ElementMatcher);

        SPEC_STORE = new Store(opts.path || "specs", { pretty: typeof opts.pretty === "undefined" ? true : opts.pretty });
    }

    _createClass(ElementMatcher, {
        get: {

            /** attempts to retrieve a Spec, if not present trigger user to specify the element.
             *
             * key      - the key of the saved Spec.
             * session  - Leadfoot::Session
             *
             * returns a Promise of a Leadfoot::Element.
             */

            value: function get(session, key) {
                // console.log("ElementMatcher::get() ======", key);
                return Promise.resolve().then(function () {

                    if (!session) {
                        throw new Error("ElementMatcher: Please provide a valid Leadfoot::Session");
                    }

                    return getSpec(key);
                }).then(function (spec) {

                    var originalElementVNode = htmlToVDOM(spec.el);
                    var findBestMatchForCurrentEl = _.partial(findBestMatch, originalElementVNode);

                    return getCandidates(originalElementVNode, session) // return [Leadfoot::Element...]
                    .then(flattenDedupeSanitise).then(elementsToHTML).then(nodesToVDOM).then(findBestMatchForCurrentEl).then(function (bestMatch) {
                        return bestMatch.original.getProperty("outerHTML").then(function (outerHTML) {

                            if (spec.el === outerHTML) {
                                return bestMatch;
                            }

                            spec[new Date().getTime()] = spec.el;
                            spec.el = outerHTML;
                            return saveSpec(key, spec).then(function () {
                                return bestMatch;
                            });
                        });
                    }).then(function (bestMatch) {
                        return bestMatch.original;
                    });
                })["catch"](function (err) {
                    throw err;
                });
            }
        },
        set: {

            /** allows the insertion of a new Spec
             *
             * key      - string of the unique identifier for a spec, also its file name.
             * session  - Leadfoot::Session
             * selector - string in CSS selector format that matches the element uniquely.
             *
             * returns a Promise.
             */

            value: function set(key, session, selector) {
                // console.log('ElementMatcher::set() ======');

                // FIXME: must we check if the spec already exists? in order to avoid overwrites.

                return session.findAllByCssSelector(selector).then(function (elements) {
                    /** README: right now, we can set elements by passing a CSS selector and choosing the first element
                     * meaning that your selectors must be accurate. In the future we want to spin up a session to allow
                     * the user to visually set what element she would like to track.
                     */
                    var el = elements[0];
                    return el.getProperty("outerHTML");
                }).then(function (el) {

                    var spec = {
                        name: key,
                        selector: selector, // FIXME: this is never used again, is there a need to persist it?
                        el: el
                    };

                    return saveSpec(key, spec);
                });
            }
        }
    });

    return ElementMatcher;
})();

module.exports = ElementMatcher;

"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

var _slicedToArray = function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { var _arr = []; for (var _iterator = arr[Symbol.iterator](), _step; !(_step = _iterator.next()).done;) { _arr.push(_step.value); if (i && _arr.length === i) break; } return _arr; } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

var Store = _interopRequire(require("jfs"));

var _ = _interopRequire(require("lodash"));

/** where all the specs are saved an kept.
 *
 * FIXME: we must be able to initialise it with a custom path
 */
var SPEC_STORE = new Store("specs", { pretty: true });

/** finds a list of candidate elements in a session, based on a spec
 *
 * specs        - Object representing the spec to be compared to
 * session      - Leadfoot::Session

 * returns an Array of Leadfoot::Element
 */
var findCandidates = function (spec, session) {
    console.log("findCandidates() ======");
    var classSearch = Promise.all(spec.classes.split(" ").map(function (className) {
        return session.findAllByClassName(className);
    }));
    return Promise.all([session.findAllByTagName(spec.tag), classSearch, session.findById(spec.id)]);
};

/** finds the best match from a list of candidates
 *
 * specs        - Object representing the spec to be compared to
 * candidates   - Array of Leadfoot::Element
 *
 * returns a Leadfoot::Element
 */
var findBestMatch = function (spec, candidates) {

    return _.flattenDeep(candidates).map(function (candidate) {
        console.log("candidate:", candidate);
    })[0]; // FIXME: THIS IS PICKING THE FIRST ELEMENT, REMOVE REMOVE.

    return Promise.all([true]);
};

/** promisifies saving of a spec
 */
var saveSpec = function (key, spec) {
    console.log("saveSpec() ======");
    return new Promise(function (resolve, reject) {
        SPEC_STORE.save(key, spec, function (err, res) {
            if (err) {
                console.log("error on setting to store() ======");
                reject(err);
            } else {
                console.log("resolving on setting to store() ======");
                resolve(res);
            }
        });
    });
};

var ElementMatcher = (function () {
    function ElementMatcher() {
        _classCallCheck(this, ElementMatcher);

        console.log("ElementMatcher::constructor() =====");
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
                console.log("ElementMatcher::get() ======", key);
                return new Promise(function (resolve, reject) {
                    // FIXME: PROMISEEEEEEES!
                    SPEC_STORE.get(key, function (err, spec) {
                        if (err) {
                            reject(err);
                        } else {

                            var withSpecfindBestMatch = _.partial(findBestMatch, spec);

                            return findCandidates(spec, session).then(withSpecfindBestMatch).then(function (bestMatch) {
                                console.log("bestMatch:", bestMatch);
                            });
                        }
                    });
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
             * returns a Promise of a Leadfoot::Element.
             */

            value: function set(key, session, selector) {
                console.log("ElementMatcher::set() ======");

                // FIXME: we must check if the spec already exists, in order to avoid overwrites.

                return session.findAllByCssSelector(selector).then(function (elements) {
                    var el = elements[0];
                    return Promise.all([el.getTagName(), el.getAttribute("class"), el.getAttribute("id")]);
                }).then(function (el) {
                    var _el = _slicedToArray(el, 3);

                    var tag = _el[0];
                    var classes = _el[1];
                    var id = _el[2];

                    var spec = {
                        selector: selector,
                        name: key,
                        tag: tag,
                        classes: classes,
                        id: id
                    };
                    return saveSpec(key, spec);
                });
            }
        }
    });

    return ElementMatcher;
})();

module.exports = ElementMatcher;

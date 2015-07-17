'use strict';

import Immutable from 'immutable';

import VNode from 'virtual-dom/vnode/vnode';
import VText from 'virtual-dom/vnode/vtext';
import diff from 'virtual-dom/diff';
import toVdom from 'html-to-vdom';

import Store from 'jfs';
import _ from 'lodash';

const htmlToVDOM = toVdom({
    VNode: VNode,
    VText: VText
});

const noop = () => {};

/** removes duplicate elements from a list
 *
 * list -> Array of Leadfoot::Element
 *
 * returns the filtered list
 */
var removeDuplicateElements = _.partialRight(_.uniq, '_elementId');

/** removes undefined and falsy values **/
var removeUndefined = arr => arr.filter(item => !!item);

var flattenDedupeSanitise = _.compose(removeUndefined, removeDuplicateElements, _.flattenDeep);

var sum = (fold, n) => fold + n;

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
var getCandidates = (vnode, session) => {
    return Promise.all([
        session.findAllByTagName(vnode.tagName).catch(noop),
        Promise.all(vnode.properties.className.split(' ').map(className => session.findAllByClassName(className).catch(noop))),
        session.findById(vnode.properties.id).catch(noop)
    ]);
};

/** converts Leadfoot::Element(s) to outerHTML
 *
 * list - List of Leadfoot::Element(s)
 *
 * returns a string (outerHTML)
 */
var elementsToHTML = list => {
    // console.log('elementsToHTML() ======', list);
    return Promise.resolve()
        .then(() => {
            if (list.length === 0) {
                throw new Error('ElementMatcher: No candidate nodes were found on the page.');
            }
            return Promise.all(list.map(node => {
                    return node.getProperty('outerHTML').then(outerHTML => Immutable.Map({ original: node, html: outerHTML }));
                })
            );
        });
};

/** converts HTML strings to VDOM Nodes
 *
 * list - List of Immutable::Map(s) like { original: Leadfoot::Element, html: String }
 *
 * returns a list of VirtualNode(s)
 */
var nodesToVDOM = list => list.map(node => node.set('vnode', htmlToVDOM(node.get('html'))));

/** finds the best match from a list of candidates
 *
 * README: think of a way of adding some weight to attributes. e.g. `id` should be more important than `textContent`.
 *
 * vnode        - VirtualNode representing the current version of the element, or the one to be "diffed against"
 * candidates   - List of Objects like { original: Leadfoot::Element, html: String, vnode: VirtualNode(s) }
 *
 * returns an Object, which is the best match.
 */
var findBestMatch = (vnode, candidates) => {
    // console.log('findBestMatch() ======');
    let candidates = candidates
        // FIXME: this is a little confusing and naive, simply counts the differences
        .map(candidate => {

            let patches = diff(vnode, candidate.get('vnode'));
            let topLevelDiffs = Object.keys(patches).length - 1;

            let deepDiffs = Object.keys(patches).map(item => {

                if (item === 'a') {
                    return 0;
                }

                let patch = patches[item].patch;

                return patch ? Object.keys(patch).length : 0; // get number of lower level diffs
            }).reduce(sum, 0);

            return candidate.set('diffs', topLevelDiffs + deepDiffs);
        });

    return _.sortBy(candidates, 'diffs')[0]; // return the one with the least amount of diffs
};

/** promisifies the saving of a spec to store
 * key  - the key to save the spec under, also the file name.
 * spec - the spec to be saved
 *
 * retruns a Promise
 */
var saveSpec = (key, spec) => {
    // console.log('saveSpec() ======');
    return new Promise((resolve, reject) => {
        SPEC_STORE.save(key, spec, (err, res) => {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    }).catch(() => {
        throw new Error(`'ElementMatcher: Could not save Spec ${ key } to ${ SPEC_STORE._dir }`);
    });
};

/** promisifies the reading of a spec to store
 *
 * key  - the key to save the spec under, also the file name.
 * spec - the spec to be saved
 *
 * retruns a Promise
 */
var getSpec = key => {
    // console.log('getSpec() ======');

    return new Promise((resolve, reject) => {
        SPEC_STORE.get(key, (err, res) => {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    }).catch(() => {
        throw new Error(`'ElementMatcher: Could not load Spec ${ key } from ${ SPEC_STORE._dir }`);
    });
};

export default class ElementMatcher {

    constructor(opts={ }) {
        SPEC_STORE = new Store(opts.path || 'specs', { pretty: typeof opts.pretty === 'undefined' ? true : opts.pretty });
    }

    /** attempts to retrieve a Spec, if not present trigger user to specify the element.
     *
     * key      - the key of the saved Spec.
     * session  - Leadfoot::Session
     *
     * returns a Promise of a Leadfoot::Element.
     */
    get(session, key) {
        // console.log("ElementMatcher::get() ======", key);
        return Promise.resolve()
            .then(() => {

                if (!session) {
                    throw new Error('ElementMatcher: Please provide a valid Leadfoot::Session');
                }

                return getSpec(key);
            })
            .then(spec => {

                let originalElementVNode = htmlToVDOM(spec.el);
                let findBestMatchForCurrentEl = _.partial(findBestMatch, originalElementVNode);

                return getCandidates(originalElementVNode, session) // return [Leadfoot::Element...]
                    .then(flattenDedupeSanitise)
                    .then(elementsToHTML)
                    .then(nodesToVDOM)
                    .then(findBestMatchForCurrentEl)
                    .then(bestMatch => {

                        let bestMatch = bestMatch.get('original');

                        return bestMatch.getProperty('outerHTML')
                            .then(outerHTML => {
                                if (spec.el === outerHTML) {
                                    return bestMatch;
                                }

                                spec[new Date().getTime()] = spec.el;
                                spec.el = outerHTML;
                                return saveSpec(key, spec)
                                    .then(() => {
                                        return bestMatch;
                                    });
                            });
                    });
            })
            .catch(err => {
                throw err;
            });
    }

    saveSpec(key, spec) {
        return saveSpec(key, spec);
    }

    /** allows the insertion of a new Spec
     *
     * key      - string of the unique identifier for a spec, also its file name.
     * session  - Leadfoot::Session
     * selector - string in CSS selector format that matches the element uniquely.
     *
     * returns a Promise.
     */
    set(key, session, selector) {
        // console.log('ElementMatcher::set() ======');

        // FIXME: must we check if the spec already exists? in order to avoid overwrites.

        return session
            .findAllByCssSelector(selector)
            .then(elements => {
                /** README: right now, we can set elements by passing a CSS selector and choosing the first element
                 * meaning that your selectors must be accurate. In the future we want to spin up a session to allow
                 * the user to visually set what element she would like to track.
                 */
                let el = elements[0];
                return el.getProperty('outerHTML');
            })
            .then(el => {

                let spec = {
                    name: key,
                    selector: selector, // FIXME: this is never used again, is there a need to persist it?
                    el: el
                };

                return saveSpec(key, spec);
            });
    }
}

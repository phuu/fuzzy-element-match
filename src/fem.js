import VNode from 'virtual-dom/vnode/vnode';
import VText from 'virtual-dom/vnode/vtext';
import diff from 'virtual-dom/diff';
import createElement from 'virtual-dom/create-element';

import toVdom from 'html-to-vdom';

import Store from 'jfs';
import _ from 'lodash';

const htmlToVDOM = toVdom({
    VNode: VNode,
    VText: VText
});

/** specifies where all the specs are persisted – https://github.com/flosse/json-file-store#json-file-store
 *
 * FIXME: we must be able to initialise it with a custom path, move it into constructor?
 */
const SPEC_STORE = new Store('specs', { pretty: true });

/** finds a list of candidate elements in a session, based on a HTML element
 *
 * vnode    - VirtualNode, the node used as a baseline for queries
 * session  - Leadfoot::Session
 *
 * returns an Array of Leadfoot::Element
 */
var getCandidates = (vnode, session) => {
    console.log('getCandidates() ======');
    var classQueries = Promise.all(vnode.properties.className.split(' ').map(className =>  session.findAllByClassName(className)));
    return Promise.all([session.findAllByTagName(vnode.tagName), classQueries, session.findById(vnode.properties.id)]);
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
var findBestMatch = (vnode, candidates) => {
    console.log('findBestMatch() ======');
    let candidates = candidates
        .map(candidate => {
            var patches = diff(vnode, candidate.vnode);
            var topLevelDiffs = Object.keys(patches).length - 1;

            var deepDiffs = Object.keys(patches).map(item => {

                if (item === 'a') {
                    return 0;
                }

                return Object.keys(patches[item].patch).length;
            }).reduce(sum, 0);

            candidate.diffs = topLevelDiffs + deepDiffs;
            return candidate;
        });

    return _.sortBy(candidates, 'diffs')[0]; // return the one with the least amount of diffs
};

/** converts Leadfoot::Element(s) to outerHTML
 *
 * list - List of Leadfoot::Element(s)
 *
 * returns a string (outerHTML)
 */
var elementsToHTML = list => {
    console.log('elementsToHTML() ======');

    let nodes = list.map(node => {
        return node.getProperty('outerHTML').then(outerHTML => ({ original: node, html: outerHTML }));
    });

    return Promise.all(nodes);
}

/** converts HTML strings to VDOM Nodes
 *
 * list - List of objects like { original: Leadfoot::Element, html: String }
 *
 * returns a list of VirtualNode(s)
 */
var nodesToVDOM = list => list.map(node => ({ original: node.original, html: node.html, vnode: htmlToVDOM(node.html) }));

/** promisifies the saving of a spec to store
 * key  - the key to save the spec under, also the file name.
 * spec - the spec to be saved
 *
 * retruns a Promise
 */
var saveSpec = (key, spec) => {
    console.log('saveSpec() ======');
    return new Promise((resolve, reject) => {
        SPEC_STORE.save(key, spec, (err, res) => {
            if (err) {
                console.log('saveSpec::error on setting to store() ======');
                reject(err);
            } else {
                console.log('saveSpec::resolving on setting to store() ======');
                resolve(res);
            }
        })
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
    console.log('saveSpec() ======');

    return new Promise((resolve, reject) => {
        SPEC_STORE.get(key, (err, res) => {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        })
    });
};

/** removes duplicate elements from a list
 *
 * list -> Array of Leadfoot::Element
 *
 * returns the filtered list
 */
var removeDuplicateElements = _.partialRight(_.uniq, '_elementId');

var sum = (fold, n) => fold + n;

var doSome = f => ([candidates, data]) => {
    return Promise.resolve(f(data))
        .then((res) => {
            return [candidates, res];
        });
};

export default class ElementMatcher {

    constructor() {
        console.log('ElementMatcher::constructor() =====');
    }

    /** attempts to retrieve a Spec, if not present trigger user to specify the element.
     *
     * key      - the key of the saved Spec.
     * session  - Leadfoot::Session
     *
     * returns a Promise of a Leadfoot::Element.
     */
    get(session, key) {
        console.log("ElementMatcher::get() ======", key);
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
                    .then(_.flattenDeep)
                    .then(removeDuplicateElements)
                    .then(elementsToHTML)
                    .then(nodesToVDOM)
                    .then(findBestMatchForCurrentEl)
                    .then(bestMatch => {
                        // TODO: need to overwrite the spec with best match, ensuring it is up to date...
                        // var el = createElement(bestMatch.vnode);
                        console.log('should return best match ======');
                        console.log('bestMatch:', bestMatch);
                        return bestMatch.original;
                    });
            })
            .catch(err => {
                console.log('err:', err);
                throw err;
            });
    }

    /** allows the insertion of a new Spec
     *
     * key      - string of the unique identifier for a spec, also its file name.
     * session  - Leadfoot::Session
     * selector - string in CSS selector format that matches the element uniquely.
     *
     * returns a Promise of a Leadfoot::Element.
     */
    set(key, session, selector) {
        console.log('ElementMatcher::set() ======');

        // FIXME: we must check if the spec already exists, in order to avoid overwrites.

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
                    selector: selector,
                    el: el
                };

                return saveSpec(key, spec);
            });
    }
}

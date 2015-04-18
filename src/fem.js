import Store from 'jfs';
import _ from 'lodash';

/** where all the specs are saved an kept.
 *
 * FIXME: we must be able to initialise it with a custom path
 */
const SPEC_STORE = new Store('specs', { pretty: true });

/** finds a list of candidate elements in a session, based on a spec
 *
 * specs        - Object representing the spec to be compared to
 * session      - Leadfoot::Session

 * returns an Array of Leadfoot::Element
 */
var findCandidates = (spec, session) => {
    console.log('findCandidates() ======');
    var classSearch = Promise.all(spec.classes.split(' ').map(className =>  session.findAllByClassName(className)));
    return Promise.all([session.findAllByTagName(spec.tag), classSearch, session.findById(spec.id)]);
};

/** finds the best match from a list of candidates
 *
 * specs        - Object representing the spec to be compared to
 * candidates   - Array of Leadfoot::Element
 *
 * returns a Leadfoot::Element
 */
var findBestMatch = (spec, candidates) => {

    return _.flattenDeep(candidates)
        .map((candidate) => {
            console.log('candidate:', candidate);
        })
        [0]; // FIXME: THIS IS PICKING THE FIRST ELEMENT, REMOVE REMOVE.

    return Promise.all([true]);
};

/** promisifies saving of a spec
 */
var saveSpec = (key, spec) => {
    console.log('saveSpec() ======');
    return new Promise((resolve, reject) => {
        SPEC_STORE.save(key, spec, (err, res) => {
            if (err) {
                console.log('error on setting to store() ======');
                reject(err);
            } else {
                console.log('resolving on setting to store() ======');
                resolve(res);
            }
        })
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
        return new Promise((resolve, reject) => {
            // FIXME: PROMISEEEEEEES!
            SPEC_STORE.get(key, (err, spec) => {
                if (err) {
                    reject(err);
                } else {

                    let withSpecfindBestMatch = _.partial(findBestMatch, spec);

                    return findCandidates(spec, session)
                        .then(withSpecfindBestMatch)
                        .then(bestMatch => {
                            console.log('bestMatch:', bestMatch);
                        });
                }
            });
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
                let el = elements[0];
                return Promise.all([el.getTagName(), el.getAttribute('class'), el.getAttribute('id')]);
            })
            .then(el => {
                let [tag, classes, id] = el;
                let spec = {
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

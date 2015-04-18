import _ from 'lodash';
import VNode from 'virtual-dom/vnode/vnode';
import VText from 'virtual-dom/vnode/vtext';
import createElement from 'virtual-dom/create-element'; // decode - takes "model" returns an element
import toVdom from 'html-to-vdom';
import diffDOM from 'diff-dom';

import utils from './utils';
import ranDOM from './ran-dom';

(function (window, document) {

  var temp = document.querySelector('#myButton');

  console.debug('fuzzy-element-match ======');

  const DD = new diffDOM(true, 500);

  const htmlToVDOM = toVdom({
    VNode: VNode,
    VText: VText
  });

  // takes element returns a "model"
  const toSpec = element => { return htmlToVDOM(element.outerHTML); };
  // take a spec returns element
  const toElement = spec => { return createElement(spec); };
  
  const props = {
    className: 'btn btn--primary',
    id: 'lol',
    'data-foo': 'walter'
  };

  var selector = utils.picker({
    className: (val) => {
      return val.split(' ')
        .map(item => { return `.${ item }`; }); 
    },
    id: (val) => { return `#${ val }`; }
  }, (val) => { return `[${ val }]`; });

  var selectors = Object.keys(props)
    .reduce((fold, key) => {
      return fold.concat(selector(key)(props[key]) || [`[${key}]`]);
    }, [])
    .reduce((fold, selector) => {
      return fold.concat(document.querySelectorAll(selector));
    }, []);

  var extractSelectors = model => {  
    return [model.tagName].concat();
  };

  // finds a list of candidates based on a model
  const findCandidates = model => {
    return [].slice.call(output.querySelectorAll(model.tagName));
  };

  const bestMatch = (model, list) => {
    return list.reduce((fold, candidate) => {
        // console.debug("candidate:", candidate);
        var currentDiff = DD.diff(candidate, model).length;
        if (currentDiff < fold.diff) {
          fold = { el: candidate, diff: currentDiff };
        }
        return fold;
      }, { diff: Infinity, el: null }).el;
  }

  // demo
  var output = document.querySelector('.js-output');
  var setModelButton = document.querySelector('.js-set-model');
  var findCandidatesButton = document.querySelector('.js-find-candidates');
  var findBestMatchButton = document.querySelector('.js-find-best-match');
  var el = null;
  var candidates = null;

  function handleSetModel(e) {
    el = e.target;
    if (el) {
      findCandidatesButton.disabled = false;
    }
    window.removeEventListener('click', handleSetModel, true);
  }

  setModelButton.addEventListener('click', function () {
    alert('now click on the element to track');
    window.addEventListener('click', handleSetModel, true);
  });

  findCandidatesButton.addEventListener('click', function () {
    if (!el) {
      alert(`element is ${ el }`);
    }
    console.log('model', el);
    console.debug("candidates: ======");
    candidates = findCandidates(el);
    candidates.map(function (node) {
      console.log(node);
    });

    if (candidates.length) {
      findBestMatchButton.disabled = false;
    }
  });

  findBestMatchButton.addEventListener('click', function () {
    var match = bestMatch(el, candidates);
    console.log("best match:", match);
    match.focus();
  });

})(window, document, undefined);

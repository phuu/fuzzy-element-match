import ranDOM from './ran-dom';
import VNode from 'virtual-dom/vnode/vnode';
import VText from 'virtual-dom/vnode/vtext';
import createElement from 'virtual-dom/create-element'; // decode - takes "model" returns an element
import htv from 'html-to-vdom';
import diffDOM from 'diff-dom';

const utils = {
  identity: x => x
};

(function (window, document) {

  console.debug('fuzzy-element-match ======');

  const DD = new diffDOM(true, 500);

  const htmlToVDOM = htv({
    VNode: VNode,
    VText: VText
  });

  // takes element returns a "model"
  var toSpec = element => { return htmlToVDOM(element.outerHTML); };
  // take a spec returns element
  var toElement = spec => { return createElement(spec); };
  
  const props = {
    className: 'btn btn--primary',
    id: 'lol',
    'data-foo': 'walter'
  };

  var picker = (obj) => {
    return (attr) => {
      return obj[attr] || utils.identity;
    };
  };

  var selector = picker({
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
  function findCandidates(model) {
    console.debug('findCandidates() ======', arguments);
    console.debug('model:', model);
    return document.querySelectorAll(model.tagName);
  }

  ranDOM.generate(10)
    .map(document.body.appendChild.bind(document.body));

  var temp = document.querySelector('#myButton');

  var toCompare = temp.cloneNode();
  toCompare.textContent = 'Login';
  toCompare.className = 'btn--primary btn';

  // debugger;
  console.time('finding best match...');
  var a = [].slice.call(findCandidates(toCompare))
    .reduce((fold, candidate) => {
      // console.debug("candidate:", candidate);
      var currentDiff = DD.diff(candidate, toCompare).length;
      if (currentDiff < fold.diff) {
        fold = { el: candidate, diff: currentDiff };
      }
      return fold;
    }, { diff: Infinity, el: null }).el;
  console.timeEnd('finding best match...');
  console.debug('best match to', toCompare, ':');
  console.debug(a);
})(window, document, undefined);

var createPopulatedArray = n => Array.apply(null, Array(n));

var dedupe = (fold, item) => {
  if (fold.indexOf(item) < 0) {
    fold.push(item);
  }
  return fold;
};

var takeRandom = arr => {
  return arr[~~(Math.random() * (arr.length))];
};

var randomIncluding = n => {
  return ~~(Math.random() * n) + 1
};

var randomRGB = () => {
  return [256, 256, 256].map(randomIncluding);
};

var createRandomElement = spec => {
  var el = document.createElement(spec.el);
  el.className = createPopulatedArray(randomIncluding(spec.classes.length))
    .map(item => takeRandom(spec.classes))
    .reduce(dedupe, [])
    .join(' ');
  el.style.backgroundColor = `rgb(${ randomRGB() })`;
  el.id = takeRandom(spec.id);
  el.textContent = spec.content;
  return el;
};

var ranDOm =  {
  generate: (n=1000, spec={ el: 'button', classes: ['btn', 'btn--primary', 'btn--danger'], id: ['a', 'b', 'c'], content: 'Login' }) => {
    return createPopulatedArray(n)
      .map(createRandomElement.bind(this, spec));
  }
};

export default ranDOm;

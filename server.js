var express = require('express');
var bodyParser = require('body-parser');
var app = express();

var ElementMatcher = require('./fem');
var tracker = new ElementMatcher();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function (req, res) {
  res.sendStatus(200);
});

app.get('/status', function (req, res) {
  res.sendStatus(200);
});

app.post('/track', function (req, res) {
  tracker.saveSpec(req.body.name, {
      name: req.body.name,
      el: req.body.el
    })
    .then(function () {
      res.json(req.body);
    });
});

var server = app.listen(9876, function () {
  console.log('integrator-match server running ======', 9876);
});

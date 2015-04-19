var Server = require('leadfoot/Server');
var ElementMatcher = require('./fem');

var session;

var quitSession = function () {
    try { session.quit() } catch (e) {}
};

process.on('SIGINT', quitSession);
process.on('exit', quitSession);

var tracker = new ElementMatcher({ path: './specs' });

var server = new Server('http://localhost:4444/wd/hub');

server
    .createSession({ browserName: 'chrome' })
    .then(function (_session) {
        session = _session;
        return _session.get('http://localhost:9876');
    })
    // .then(function () {
    //     return tracker.set('myLogin', session, '#myLogin');
    // })
    .then(function () {
        return tracker.get(session, 'myLogin');
    })
    .then(function (el) {
        console.log('el:', el);
        return el.click();
    })
    .catch(function (err) {
        console.log('errored() ======');
        // console.log(err);
    })
    .then(function () {
        console.log('quitting session ======');
        // session.quit();
    });

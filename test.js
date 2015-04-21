var Server = require('leadfoot/Server');
var ElementMatcher = require('./fem');

var session;

var quitSession = function () {
    console.log('quitting session ======');
    try { session.quit(); } catch (e) {}
};

process.on('SIGINT', quitSession);
process.on('exit', quitSession);

var tracker = new ElementMatcher();

var server = new Server('http://localhost:4444/wd/hub');

server
    .createSession({ browserName: 'chrome' })
    .then(function (_session) {
        return _session
            .get('http://localhost:9876').then(function () {
                session = _session;
            });
    })
    .then(function () {
        // console.log('session:', session);
        return tracker.get(session, 'myLogin');
    })
    .then(function (el) {
        return el.click();
    })
    .catch(function (err) {
        console.log(err);
    })
    .then(function () {
        // quitSession();
    });

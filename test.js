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
            .get('http://localhost:8080')
            .then(function () {
                session = _session;
            });
    })
    .then(function () {
        return tracker.get(session, 'SendFlowers');
    })
    .then(function (el) {
        console.log('will click on element ======');
        return el.click()
            .then(function () {
                console.log('click() ======');
            });
    })
    .catch(function (err) {
        console.log(err);
    })
    .then(function () {
        console.log('should quit() ======');
        // quitSession();
    });

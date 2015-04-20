[integrator](https://github.com/phuu/integrator)-match
===

> NOTE: Documentation in Progress!

Part of an ambitious experiment at "fixing" integration tests.

## Reasoning

Integration tests are hard to write, harder to maintain and incredibly brittle. This module aims to solve how these tests interact with DOM Elements. It "keeps track" of an "entity" – such as a login button – based on a [`Spec`](#spec). Referring to it just like a human would.

## Concepts

#### `Spec`

Simply a representation of an element. Not a lot more than the current element itself (`element.outerHTML`) and a `name`, which is unique. It allows for an element to be regarded to as a key, rather than a CSS rule; therefore avoiding brittleness when testing with interactive elements. See below an example `Spec`.

```json
{
    "name": "myInput",
    "el": "<input class='js-todo-input' type='text'>Login!</input>"
}
```

Whenever a change happens to the tracked element, the `el` property becomes the latest `outerHTML` and a timestamp attribute is added with the previous state.

## Requirements

- [Leadfoot](https://github.com/theintern/leadfoot) – "A JavaScript client library that brings cross-platform consistency to the Selenium WebDriver API."

## Installation

`npm i --save integrator-match`

## Usage

Assume you want to track a login button for you app. e.g. `<button id='myLoginButton' class='btn btn--primary' onclick='javascript:alert("wanna track me?");'>Login!</button>`

```javascript
var ElementMatcher = require('integrator-match');
var Server = require('leadfoot/Server');

var matcher = new ElementMatcher({ path: 'mySpecs' });

var session;
server
    .createSession({ browserName: 'chrome' })
    .then(function (_session) {
        session = _session;
        return _session.get('http://localhost:9876');
    })
    .then(function (session) {
        return matcher.set('myLoginButton', session, '#myLoginButton');
    });
```

A file named `myLoginButton.json`, should be created under the folder `mySpecs` containing:

```json
{
    "name": "myLoginButton",
    "selector": "#myLoginButton",
    "el": "<button id='myLoginButton' class='btn btn--primary' onclick='javascript:alert(\"wanna track me?\");'>Login!</button>"
}
```

You are now able to make changes on your HTML and still refer to your button as `myLoginButton`, even if your `id` attribute changes for instance. Right now, we use a pretty naive "less number of differences" approach, but we are aiming to be a little smarter about it.

For this example's sake, lets assume you have added a class to your `button` and chaged its `id` and text content. And now it looks like:

`<button id='loginButton' class='btn btn--secondary' onclick='javascript:alert(\'wanna tracking me?\');'>Login Now</button>`

In most cases with integration tests, you would most likely have to rewrite your test again – probably using a new selector – in order for it to work with the new button. With this tracker you can simply write:

```javascript
var ElementMatcher = require('integrator-match');
var Server = require('leadfoot/Server');

var matcher = new ElementMatcher({ path: 'mySpecs' });

var session;
server
    .createSession({ browserName: 'chrome' })
    .then(function (_session) {
        session = _session;
        return _session.get('http://localhost:9876');
    })
    .then(function (session) {
        return matcher.get(session, 'myLoginButton');
    })
    .then(function (el) {
        el.click(); // Leadfoot::Element
    });
```

The `ElementMatcher::get()` method will find a list of candidate nodes, perform a diff agains them and return the one that is most likely to be your element. Once it finds the top candidate it overwrites the `Spec.el` and adds the old version of the element to its `Spec`, so that we can identify what changes were made over time.

Your `myLoginButton.json` will now look like:

```json
{
    "name": "myLoginButton",
    "selector": "#myLoginButton",
    "el": "<button id='loginButton' class='btn btn--secondary' onclick='javascript:alert(\"wanna track me?\");'>Login Now</button>",
    "1429476475744": "<button id='myLoginButton' class='btn btn--primary' onclick='javascript:alert(\"wanna track me?\");'>Login!</button>"
}
```

## API

#### `new ElementMatcher([Object opts])` -> `ElementMatcher`

###### Option `opts`:
- `[String path]` – default: `'specs'`: path to the folder in which to save the specs.
- `[Boolean pretty]` – default: `true`: whether the saved `JSON` is human readable or not.

#### `ElementMatcher.set(key, session, selector)` -> `Promise`

Saves a new `Spec` under the specified folder path. Return { TODO }.

- `[String key]`: unique identifier to the spec as well as file name.
- `[Leadfoot::Session session]`: the session in which to search for the element, in order to initialise the tracking.
- `[String selector]`: CSS selector used to find the element.


#### `ElementMatcher.get(session, key)` -> `Promise`

Retrieves a spec from disk. Returning a `Promise` of a `Leadfoot::Element`.

- `[Leadfoot::Session session]`: the session in which to search for the element.
- `[String key]`: unique identifier to the spec as well as file name.

## License

The MIT License (MIT)

Copyright (c) 2015 Walter Carvalho & Tom Ashworth

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

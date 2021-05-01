# MockRequests

[![build status](https://travis-ci.org/D-Pow/MockRequests.svg?branch=master)](https://travis-ci.org/D-Pow/MockRequests)
[![coverage status](https://coveralls.io/repos/github/D-Pow/MockRequests/badge.svg?branch=master)](https://coveralls.io/github/D-Pow/MockRequests?branch=master)
[![install size](https://packagephobia.now.sh/badge?p=mock-requests)](https://packagephobia.now.sh/result?p=mock-requests)

Mocks network requests with desired static and dynamic responses automatically so you
never have to change your source code to use mocks ever again.

#### Backed and Used by:

* [<img src="https://cdn2.etrade.net/1/17092613100.0/aempros/content/dam/etrade/retail/en_US/images/global/logos/etrade-logo-rgb-144x22.svg" alt="E-Trade" style="background: white; padding: 5px" />](https://us.etrade.com)

## Contents

* [Features](#features)
* [Installation](#installation)
* [Usage](#usage)
* [Examples](#examples)
    * [Static responses](#example-static)
    * [Dynamic responses](#example-dynamic)
    * [Login mock selections](#example-logins)
* [Separating mocks from source](#separate-from-source)
    * [Simple instructions](#simple-instructions)
    * [Bare-bones instructions](#bare-bones-instructions)
    * [Activating via terminal](#activating-via-terminal)
* [MockRequests API](#api)
* [Final notes](#final-notes)
* [License](#license)

<a name="features"></a>
## Features

This library was made for the purpose of allowing developers to be able to continue to write code
as normal even when their APIs are down, haven't been developed by back-end teams yet, or don't have
internet at all. It provides a quick, single point of entry that can be called once and will work
throughout your entire app.

In particular, most other network-mocking libraries are not user friendly in that they either:
* *Force users to re-write* their source code to use mocks and then *change it back later* in order
to use real network requests, or
* Involve *complex setup* using local servers and proxies, usually in ways that are app-specific and aren't easily
transferable to other projects.

This library differs from the others in that it allows you to continue **writing code as normal** while still
using mock network activity.

Specific benefits provided by this library that aren't offered in others:
* You **never have to change your source code**. This means no more replacing
`fetch()` with `Promise.resolve(mockResponse)`, and no changing URLs from `website.com/api` to `third-party-mocks.com/api`.
* **No painful configuration** of complex node servers, proxies, or anything else to host mock data.
This also means no need to change URLs from `website.com/api` to `localhost/api`.
* Full support for **use along with third-party libraries**, including [Axios](https://github.com/axios/axios) and
[jest](https://github.com/facebook/jest), so they function as normal while still giving you the mocks you want.
* **Dynamically update mock responses** based on request payloads, previous mock responses, and query parameters in
order to mimic back-end alterations of data.
* Query parameter parsing so you can **mock all URLs with the same pathname** using the same dynamic response function.
* Customizable **mock response delays** to mimic natural network resolution times.
* **Mix mocks with real API calls** so you can use both functional and non-functional endpoints simultaneously.
* Simple configuration to **split mock code from production code** and/or **activate mocks via terminal** (e.g. `MOCK=true npm start`).
* No confusing interfaces or multi-step procedures to getting started. Simply **configure it once** and you're good to go.
This becomes extremely useful if you want to **switch app-wide mocks between different logins** when developing.
* **Greatly simplify API testing**. Just define `fetch` and/or `XMLHttpRequest` in a test setup file and configure
`MockRequests` with the responses you expect. It will handle all the heavy-lifting of mocking network responses for you
so you don't have to repetitively use e.g. `fetch = jest.fn()`.
* Compatible with all JavaScript environments, including back-end Node scripts, as long as either `fetch` or
`XMLHttpRequest` are defined and used in that environment (natively or by polyfill).

<a name="installation"></a>
## Installation

* Using npm (see the [npm package](https://www.npmjs.com/package/mock-requests)):

    `npm install --save-dev mock-requests`

* Using git:

    * Via npm:

        `npm install --save-dev https://github.com/D-Pow/MockRequests.git`
    * With locally installed repo:

        `git clone https://github.com/D-Pow/MockRequests.git`

        package.json:

        `"mock-requests": "file:<pathToCloneLocation>/MockRequests`

<a name="usage"></a>
## Usage

API docs can be viewed in the [JSDoc](https://d-pow.github.io/MockRequests/module-mock-requests-MockRequests.html) along with
a [live demo](https://d-pow.github.io/MockRequests/demo/).

This library wraps `XMLHttpRequest` and `fetch` such that any network request to a configured
URL will return the specified mock response instead of actually making the network requests.
Otherwise, if a URL hasn't been configured with a mock response, the standard async request is made.

`MockRequests` was designed to be used in such a way that wherever you configure it, the entire app
experiences the effects. This means you could configure it in one file and then all other files
that make network requests to the configured URLs will receive the mock responses instead,
even without importing `MockRequests`. This makes it very easy to work on the front-end even if
some APIs are down/haven't been developed yet, or if you have no internet access at all.

<a name="examples"></a>
## Examples

Note how in the below examples, the **production-bound code doesn't change** between
mocking and using network calls.

<a name="example-static"></a>
### Static responses

#### Standard configuration

To configure global app usage of `MockRequests`, simply call `configure()` with an object containing URL-responseObject
mappings.

```javascript
// This is the only code you need to add to use this library
// Add in the MockConfig.js file described in the "Separating
// mocks from source code" section
import MockRequests from 'mock-requests';
import {
    myApiUrl,   // 'https://example.com/api/vx/someApi'
    anotherUrl  // '192.168.0.1'
} from '../src/services/Urls.js';

const myApiMockResponse = { someJson: 'responseObject' };
const anotherUrlMockResponse = '<html>some other type of response</html>';

MockRequests.configure({
    [myApiUrl]: myApiMockResponse,
    [anotherUrl]: anotherUrlMockResponse
});

// ...source code

// Using your async requests in source code
// This stays the same regardless of if you're using mocks or the actual endpoint
const jsonResponse = await fetch(myApiUrl).then(res => res.json());
const htmlResponse = await fetch(anotherUrl).then(res => res.text());

useResponseContentAsNormal(jsonResponse);
useResponseContentAsNormal(htmlResponse);
```

Alternatively, you could configure URL-response content individually:

```javascript
// same URLs and mock responses from above
import MockRequests from 'mock-requests';

MockRequests.setMockUrlResponse(myApiUrl, myApiMockResponse);
MockRequests.setMockUrlResponse(anotherUrl, anotherUrlMockResponse);
```

#### Mixing mocks with actual API calls

In the event that some APIs are not functioning correctly but others are, you can configure
the broken APIs using `MockRequests` and then leave the other APIs as-is for normal responses:

```javascript
import MockRequests from 'mock-requests';
import { nonfunctionalApi } from '../src/services/Urls.js';

MockRequests.setMockUrlResponse(nonfunctionalApi, /* mock response */);

// ...source code

// Will receive mock
const mockedResponse = await fetch(nonfunctionalApi).then(res => res.json());
// Will receive actual API response
const realApiResponse = await fetch(functionalApi).then(res => res.json());

useResponseContent(mockedResponse);
useResponseContent(realApiResponse);
```

<a name="example-dynamic"></a>
### Dynamic responses

#### Dynamically modifying subsequent responses

This library also supports dynamically updating your mocked APIs' responses, so as to mimic actual
back-end systems. To utilize this feature, you'll need to call the dynamic counterparts of
`configure/setMockUrlResponse` (`configureDynamicResponses/setDynamicMockUrlResponse`) along with
a slightly modified config object that has `response` and `dynamicResponseModFn` fields:

```javascript
import MockRequests from 'mock-requests';
import { myApiUrl } from '../src/services/Urls.js';

const initialMockResponse = {
    data: ['a', 'b', 'c', 'd', 'e'],
    value: 7
};
const dynamicConfig1 = {
    [myApiUrl]: {
        // The desired response is now nested inside the `response` property.
        // This will be the initial default value of the `response` parameter
        // in the function below, but won't be used after that.
        response: initialMockResponse,
        // The dynamicResponseModFn takes in the request and previous
        // response as arguments to produce the new response.
        // The new response **must** be returned from this function.
        // Feel free to modify `response` as it will be deep-copied later.
        dynamicResponseModFn: (request, response) => {
            // Mix both request and response data to generate new response
            response.data = response.data.concat(request.addLettersArray);
            response.value += request.valueModification;

            return response; // is actually now the new response
        }
    }
};

MockRequests.configureDynamicResponses(dynamicConfig1);

// ...source code

const payload = {
    addLettersArray: ['f', 'g'],
    valueModification: 5
};
const myDynamicallyModifiedResponse = await fetch(myApiUrl, {
    body: JSON.stringify(payload)
}).then(res => res.json());

console.log(myDynamicallyModifiedResponse)

/* Will output:
{
    data: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    value: 12
}
*/
```

#### Mocking families of URLs using query parameters

Additionally, the `dynamicResponseModFn` will receive an object containing query parameters from the request URL,
which means you also have the option to generate dynamic responses based on those.

If you want to mock all URLs with the same pathname but different query parameters, simply add `usePathnameForAllQueries: true`
to your dynamic mock configuration.

Regardless of if you set `usePathnameForAllQueries` or not, `dynamicResponseModFn` will still receive the `queryParamMap`.

```javascript
import {
    searchApiPathname  // 'https://example.com/search'  e.g. search?q=weather
} from '../src/services/Urls.js';

MockRequests.setDynamicMockUrlResponse(searchApiPathname, {
    // `response` field not needed because we don't need an initial `response` value
    dynamicResponseModFn: (request, response, queryParamMap) => {
        const searchQuery = decodeURIComponent(queryParamMap.q);
        return `You searched for ${searchQuery}`;
    },
    usePathnameForAllQueries: true
});

// ...source code

const searchQuery = getSearchFromTextInput(); // let's assume this is `weather`
const searchUrl = `${searchApiPathname}?q=${encodeURIComponent(searchQuery)}`;
const response = await fetch(searchUrl).then(res => res.text());

console.log(response);

/* Will output:
'You searched for weather'
*/
```

#### Delaying mock response resolutions

There is also a `delay` option you can use if you want to mimic network delays:

```javascript
// or configureDynamicResponses({ [myApiUrl]: {...} })
MockRequests.setDynamicMockUrlResponse(myApiUrl, {
    response: myMockResponse,
    dynamicResponseModFn: (req, res, queries) => {/* ... */},
    delay: 1500   // will make fetch take 1.5 seconds to resolve myApiUrl
});
```

<a name="example-logins"></a>
### Sample usage with different logins

Finally, because the configure/setMockUrlResponse functions take in a simple URL-response mapping,
using different mocks at different times becomes incredibly user-friendly. For example,
if your data changes based on which user is logged in, then the `MockRequests` API is
particularly easy to work with. In this case, after defining each user's mock responses,
you could nest them in a single `loginMocks` object and simply choose which login to use:

```javascript
const bobMocks = {
    [homepageUrl]: bobHomepageMock,
    [friendsUrl]: bobFriendsMock
};
const aliceMocks = {
    [homepageUrl]: aliceHomepageMock,
    [friendsUrl]: aliceFriendsMock
};
const loginMocks = {
    bob: bobMocks,
    alice: aliceMocks
};

// Today, I want to be Alice
MockRequests.configure(loginMocks.alice);
// no, wait, I'll be Bob instead
MockRequests.configure(loginMocks.bob);
```

#### Other utility functions

For convenience, a `mapStaticConfigToDynamic()` function has been included to make converting the above
static version of `loginMocks` to the dynamic counterpart easier:

```javascript
// Example 1
// Convert a static URL-response mock to dynamic and add delay to home page
const dynamicBobMocks = MockRequests.mapStaticConfigToDynamic(bobMocks);
dynamicBobMocks[homepageUrl].delay = 1500;
MockRequests.configureDynamicResponses(dynamicBobMocks);

// Example 2
// Convert all loginMocks entries to dynamic counterparts
const dynamicLoginMocks = Object.keys(loginMocks).reduce((dynamicConfigs, user) => {
    dynamicConfigs[user] = MockRequests.mapStaticConfigToDynamic(loginMocks[user]);
    return dynamicConfigs;
}, {});
MockRequests.configureDynamicResponses(dynamicLoginMocks.bob);

// Example 3
// Merge user-agnostic dynamic mocks with static loginMocks
const dynamicMocks = {
    [searchApiPathname]: {
        dynamicResponseModFn: (req, res, queries) => {
            /* ... same as search query above */
        }
    }
};
const staticDynamicMerged = Object.keys(loginMocks).reduce((dynamicConfigs, user) => {
    dynamicConfigs[user] = {
        ...MockRequests.mapStaticConfigToDynamic(loginMocks[user]),
        ...dynamicMocks
    };
    return dynamicConfigs;
}, {});
MockRequests.configureDynamicResponses(staticDynamicMerged.bob);
```

<a name="separate-from-source"></a>
## Separating mocks from source code

<a name="simple-instructions"></a>
### Simple Instructions

If you are using `webpack@>=5`, then simply import the `MockRequestsWebpackPlugin` and use via:

```javascript
// webpack.config.js

const MockRequestsWebpackPlugin = require('mock-requests/bin/MockRequestsWebpackPlugin');

module.exports = {
    // ...
    plugins: [
        // ...
         new MockRequestsWebpackPlugin(
            'myMockDirectory',
            'MockConfig.js', // mock entry file, nested inside `myMockDirectory/`
            process.env.MOCK === 'true' // boolean to determine if you should activate mocks
        ),
        // ...
    ]
};
```

This will automatically transpile and activate mocks according to the entry directory, file, and your desired boolean of whether or not mocks should be activated.

<a name="bare-bones-instructions"></a>
### Bare-bones instructions

In the simplest, bare-bones example, you could just import `MockRequests` into one of your entry JavaScript files
(src/index.js, src/App.js, or similar) and configure your mocks there. As long as MockRequests was installed as a
devDependency and you don't commit this code, it will never enter production.

```javascript
// src/index.js for React project
import React from 'react';
import ReactDOM from 'react-dom';
import App from '/components/App';

import MockRequests from 'mock-requests';

MockRequests.configure(/* ... */);

ReactDOM.render(<App />, document.getElementById('root'));
```

However, for larger apps with many network calls or for sharing mocks with other team members, typing and removing
mocks can get quite cumbersome. To simplify this, you could simply move mock-related code to a separate `mocks/`
folder and only import them when needed. This way, you can commit the mock code to your repo but, just like
test code, it doesn't get deployed into production since it isn't in the src/ folder.
For example, if we have the setup:

```
MyApp
├─── src/
|   ├─── (... source code)
├─── mocks/
|   ├─── MockConfig.js
|   ├─── StaticResponses.js
|   ├─── DynamicResponseConfigs.js
|   ├─── (... other mock files imported by MockConfig.js)
```

where `MockConfig.js` does all the `mock-requests` configuration, e.g.

```javascript
// mocks/MockConfig.js
import MockRequests from 'mock-requests';
import { myStaticApiUrl, myDynamicApiUrl } from '../src/services/Urls.js';
// Imports from mocks/ directory
import { myStaticApiResponse } from './StaticResponses';
import { myDynamicApiConfig } from './DynamicResponseConfigs';

MockRequests.setMockUrlResponse(myStaticApiUrl, myStaticApiResponse);
MockRequests.setDynamicMockUrlResponse(myDynamicApiUrl, myDynamicApiConfig);
```

then in your src/index.js file, just import the MockConfig.js file to activate all mocks, and don't commit that
code change to keep all of it out of production:

```javascript
import React from 'react';
import ReactDOM from 'react-dom';
import App from '/components/App';

import '../mocks/MockConfig';

ReactDOM.render(<App />, document.getElementById('root'));
```

<a name="activating-via-terminal"></a>
### Activating via Terminal

If you prefer not having to change source code to activate/deactivate mocks, then the guide below will explain how to
activate mocks via terminal, e.g. `MOCK=true npm start`.

1. Import the function from the built-in `mock-requests/bin/resolve-mocks.js` script to handle activating/deactivating
mocks for you.
2. Pass in the mocks/ directory, the MockConfig.js entry file, and a boolean that determines if mocks should be
active or not (e.g. `process.env.MOCK === 'true'`). Returns a `resolvedMocks` object with `entry` and `include`
arrays.
3. Spread the `resolvedMocks.entry` array in your webpack config's `entry` field.
4. (Optional) Spread the `resolvedMocks.include` array in your webpack config's `include` field if you need the
mock files to be transformed by your JS-loader to run your app on an older browser.

```javascript
// webpack.config.js

// Returns an object containing arrays to spread in webpack's `include` and `entry` fields.
// resolveMocks(mockDirectory, mockEntryFile, activateMocksBoolean)
const resolveMocks = require('mock-requests/bin/resolve-mocks');
const resolvedMocks = resolveMocks('mocks', 'mocks/MockConfig.js', process.env.MOCK === 'true');

module.exports = {
    entry: [ '@babel/polyfill', './src/index.js', ...resolvedMocks.entry ],
    module: {
        rules: [
            {
                test: /\.jsx?$/,
                include: [ /src/, ...resolvedMocks.include ],
                exclude: [ /node_modules/ ],
                loader: 'babel-loader'
            }
        ]
    }
}
```

and run using `MOCK=true npm start`.

Doing so will allow `MockRequests` to automatically decide whether the mock directory/file should be resolved.
It will return empty arrays if the `activateMocksBoolean` is false or arrays filled with resolved paths if true.
This way, your MockConfig.js file will be added as an entry point to your app only if desired and will be
loaded along with the rest of your code. Optionally, if you're using the latest JavaScript features in your
mock configuration files but want to run them on browsers that lack support, then you'll need those mock files transpiled
by your loader as well; in that case, add the respective spread to the `include` field as well.

In this way, you won't have to change source code between activating and deactivating mocks.

<a name="api"></a>
## MockRequests API

In order to make mocking your network calls simpler, config functions have been added to allow for
setting, getting, and deleting mock responses for your network calls. These are described at length
in the [JSDoc](https://d-pow.github.io/MockRequests/module-mock-requests-MockRequests.html).

##### configure(staticUrlResponseConfigObject, overwritePreviousConfig = true)
##### configureDynamicResponses(dynamicUrlResponseConfigObject, overwritePreviousConfig = true)
##### setMockUrlResponse(url, staticMockResponseObject)
##### setDynamicMockUrlResponse(url, dynamicMockResponseObject)
##### getResponse(url)
##### deleteMockUrlResponse(urlNotMeantToBeMocked)
##### clearAllMocks()
##### mapStaticConfigToDynamic(staticConfig)
##### OriginalXHR()
##### originalFetch()

Note that `OriginalXHR` and `originalFetch` will use the original `XMLHttpRequest` and `fetch` respectively,
regardless of if you've set the mock URL responses in `MockRequests.configure()` or `MockRequests.setMockUrlResponse(...)`.
It will also use `XMLHttpRequest` and `fetch` regardless of if the browser supports them or not (will be `undefined` in
cases where the browser doesn't support them).

<a name="final-notes"></a>
## Final notes

1. This mocks the usage of `XMLHttpRequest` and `fetch` such that the response is always valid.
This means that the instance attributes below are always set. If you want to change any of these, feel free to do
so within `xhr.onreadystatechange`/`fetch().then(fn)`.

    For `XMLHttpRequest`:
    ```javascript
    xhr.readyState = 4;
    xhr.response = mockedResponse;
    xhr.responseText = stringVersionOf(mockedResponse); // either JSON.stringify(mockedResponse) or `${mockedResponse}`
    xhr.responseUrl = urlPassedInXhrOpenMethod;
    xhr.status = 200;
    xhr.statusText = 'OK';
    xhr.timeout = 0;
    ```

    For `fetch().then(response => ...)`:
    ```javascript
    response.status = 200;
    response.statusText = '';
    response.ok = true;
    response.headers = new Headers({ status: '200' });
    response.redirected = false;
    response.type = 'basic';
    ```

2. This library also works with other members of the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API#Fetch_Interfaces),
so you can alternatively use an instance of the `Request` class in your `fetch()` calls, e.g. `fetch(new Request(url, options))`.

3. You may import either the `MockRequests` default export or any of its individual fields, e.g. <br />
`import MockRequests, { setMockUrlResponse } from 'mock-requests';`

4. This works with any environment that uses either `fetch` or `XMLHttpRequest`, regardless of if said
environment is a browser, web/service worker, or a Node script. As long as they are defined (natively or
by polyfill), any usage of `fetch`/`XMLHttpRequest` request to a URL configured by `MockRequests` will be
mocked appropriately. For example,

    ```javascript
    require('isomorphic-fetch');
    const MockRequests = require('mock-requests');

    // ... use fetch and MockRequests as normal
    ```

<a name="license"></a>
## License

MIT

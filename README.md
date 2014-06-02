# Primus Callbacks

Client and server plugin that adds a request/response cycle to [Primus](https://github.com/3rd-Eden/primus).
This is a fork of [primus-responder](https://www.npmjs.org/package/primus-responder) module with a secure request id generation (uuid generation RFC 4122 compliant) and a timeout for each request.
Note: the current 2.x release is not backward compatible with the previous due the new signature of the `writeAndWait` method and the `callback` used as response (see below).

## Installation

	$ npm install primus-callbacks --save

## Use cases

* Wrap existing REST API into a realtime websocket connection
* Simplify program flow if waiting on a specific response is needed

## Usage

Use `requestTimeout` option to define a timeout for every request (both on server and client). If no response is received after requestTimeout ms, the callback is executed passing an Error instance with a `timeout` property (see `test.js`).

### On the server

```javascript
var Primus = require('primus')
  , PrimusCallbacks = require('primus-callbacks')
  , server = require('http').createServer()
  , options = {
      transformer: 'websockets',
      parser: 'JSON',
      requestTimeout: 10000
    }
  , primus = new Primus(server, options);

primus.use('callbacks', PrimusCallbacks);

primus.on('connection', function(spark) {

    // Handle incoming requests:
    spark.on('request', function(data, done) {
        // Echo the received request data
        done(null, data);
    });

    // Request a response from the spark:
    spark.writeAndWait('request from server', function(err, response) {
        // Write the sparks response to console
        console.log('Response from spark:' response);
    });

});

server.listen(8080);
```

### On the client

#### Browser

```javascript
var options = {
  transformer: 'websockets',
  parser: 'JSON',
  requestTimeout: 1000
};
var primus = Primus.connect('ws://localhost:8080', options);

// Handle incoming requests:
primus.on('request', function(data, done) {
    // Echo the received request data
    done(null, data);
});

// Request a response from the server:
primus.writeAndWait('request from client', function(err, response) {
    // Write the servers response to console
    console.log('Response from server:', response);
});
```

#### Node

```javascript
var Primus = require('primus')
  , PrimusCallbacks = require('primus-callbacks')
  , options = {
    transformer: 'websockets',
    parser: 'JSON',
    requestTimeout: 1000,
    plugin: {
        callbacks: PrimusCallbacks
    }
  }
  , primus = new primus.Socket('ws://localhost:8080', options);

// Handle incoming requests:
primus.on('request', function(data, done) {
    // Echo the received request data
    done(null, data);
});

// Request a response from the server:
primus.writeAndWait('request from client', function(err, response) {
    // Write the servers response to console
    console.log('Response from server:', response);
});
```

## API
### Server
#### spark#on('request', fn)
Registers an event handler for incoming requests. The handler has two arguments: `fn(data, done)`

* `data` contains the data which was sent with the request
* `done` is a callback function. The signature is `done (err, res)`, where:
    - `err` is the error if occurred (as an Error instance or String)
    - `res` is the the data you want to transmit.


```javascript
spark.on('request', function(data, done) {
    done('this is an error', 'this is the response');
});
```

#### spark#writeAndWait(data, fn)
Sends `data` to the given spark. As soon as the response from the spark arrives, `fn` is called with the error if occurred and the sparks response as arguments: `fn (err, res)`.

```javascript
spark.writeAndWait('request data', function(err, res) {
    console.log('spark responded:', res);
});
```

### Client
#### primus#on('request', fn)
Registers an event handler for incoming requests. The handler has two arguments: `fn(data, done)`

* `data` contains the data which was sent with the request
* `done` is a callback function. The signature is `done (err, res)`, where:
    - `err` is the error if occurred (as an Error instance or String)
    - `res` is the the data you want to transmit.

```javascript
primus.on('request', function(data, done) {
    done('this is an error', 'this is the response');
});
```

#### primus#writeAndWait(data, fn)
Sends `data` to the connected server. As soon as the response from the spark arrives, `fn` is called with the error if occurred and the sparks response as arguments: `fn (err, res)`.

```javascript
primus.writeAndWait('request data', function(err, res) {
    console.log('server responded:', response);
});
```

## Run tests

You can test in Node environment simply typing:

	$ npm test

To test in browser run:

    $ node test/browser/server.js

and open `test/browser/index.html` in your browser.

## License

Copyright (c) 2014 Yoovant by Marcello Gesmundo. All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

   * Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
   * Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
   * Neither the name of Yoovant nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


Copyright (c) 2013 Manuel Alabor

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

[![githalytics.com alpha](https://cruel-carlota.pagodabox.com/ee2fdab579aeb924bad0df6e6f6beeee "githalytics.com")](http://githalytics.com/swissmanu/primus-responder)

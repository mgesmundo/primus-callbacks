/*global Primus */

var uuid  = require('node-uuid'),
    path  = require('path'),
    fs    = require('fs'),
    load  = require('load');

var file = path.resolve(__dirname, '../common/common.js');
var common = load(file);
var cloneWithSafeError = common.cloneWithSafeError;

function responder() {
  var init = Primus.prototype.initialise
    , responseCallbacks = {}
    , requestTimeouts = {}
    , requestTimeout;

  /** PrivateFunction: requestFulfilled
   * A scoped version of `requestFulfilled` is passed along the "request" event
   * emitted by `dispatchRequest`.
   * The requestId available in the scope is used as responseId and is sent
   * along with the `data` argument.
   *
   * Parameters:
   *     (Error) err - The error if occurred
   *     (Object) data - Data to send with the response.
   */
  function requestFulfilled(err, data) {
    var filledData = {
      plugin: 'primus-callbacks'
        , responseId: this.requestId
        , data: data
    };
    if (err) {
      filledData.error = err;
    }
    this.primus.write(filledData);
  }

  /** PrivateFunction: dispatchRequest
   * Dispatches a request on a response. A "request" event is emitted by the
   * primus object. That event contains the request data and a scoped reference
   * on the `requestFulfilled` function. The subject which reacts on the event
   * calls `requestFulfilled` to send a response related to this request.
   *
   * Parameters:
   *     (String) requestId -  An ID which identifies the request to dispatch.
   *     (Object) data - The request data.
   *     (Error) err - The error if occurred
   */
  function dispatchRequest(requestId, data, err) {
    var scope = {
      primus: this
      , requestId: requestId
    };
    if (err) {
      scope.error = err;
    }
    var scopedRequestFulfilled = requestFulfilled.bind(scope);

    this.emit('request', data, scopedRequestFulfilled);
  }

  /** PrivateFunction: dispatchResponse
   * This dispatches a incoming response on a specific request. It expects a
   * `responseId` and searches a callback in the `responseCallbacks` object. If
   * present, it gets executed and the callback itself is deleted from
   * `responseCallbacks`.
   *
   * Parameters:
   *     (String) responseId - An ID which identifies a callback which should be
   *                           executed as soon as a response for a specific
   *                           request arrives.
   *     (Object) data - The response data transmitted by the server.
   *
   *     (Error) err - The error if occurred
   */
  function dispatchResponse(responseId, data, err) {
    var callback = responseCallbacks[responseId];

    if(callback) {
      delete responseCallbacks[responseId];
      data = cloneWithSafeError(data);
      err = cloneWithSafeError(err);
      callback(err, data);
    }
    if (requestTimeouts[responseId]) {
      clearInterval(requestTimeouts[responseId]);
      delete requestTimeouts[responseId];
    }

  }

  /** PrivateFunction: handleIncoming
   * A Primus transformer for incoming messages. As soon as a PrimusCallbacks
   * related envelope is detected, the contained data is dispatched using
   * `dispatchRequest` or `dispatchResponse`.
   *
   * Parameters:
   *     (Object) message - Incoming message
   */
  function handleIncoming(packet) {
    var proceed = true
      , data = packet.data;

    // Check if message contains PrimusCallbacks envelope
    if(data.plugin && data.plugin === 'primus-callbacks') {
      proceed = false;

      // Check if it is a request or a response and dispatch
      if(data.requestId) {
        dispatchRequest.call(this, data.requestId, data.data, data.error);
      } else if(data.responseId) {
        dispatchResponse.call(this, data.responseId, data.data, data.error);
      }
    }

    return proceed;
  }

  /** Function: initialise
   * Extending Primus initialisation code. Adds the `handleIncoming` transformer
   * to Primus' incoming transformer chain.
   */
  Primus.prototype.initialise = function() {
    this.transform('incoming', handleIncoming);
    init.apply(this, arguments);
    var opts = Array.prototype.slice.call(arguments)[0] || {};
    requestTimeout = opts.requestTimeout || opts.timeout || 10000;
  };

  /** Function: writeAndWait
   * Sends the passed data to the server. As soon as PrimusCallbacks recieved
   * a related response, `callback` is executed.
   *
   * Example:
   *
   *     primus.writeAndWait('PrimusCallbacks test', function(response) {
   *         console.log('PrimusCallbacks response arrived: ' + response);
   *     });
   *
   * Parameters:
   *     (Object) data - Data to send along the request
   *     (Function) callback - Executed as soon as the response on this request
   *                           arrived.
   */
  Primus.prototype.writeAndWait = function writeAndWait(data, callback) {
    var requestId = generateGUID()
      , envelope = {
        plugin: 'primus-callbacks'
        , requestId: requestId
        , data: data
      };

    responseCallbacks[requestId] = callback;
    this.write(envelope);

    function setRequestTimeout(requestId) {
      return setTimeout(function() {
        delete requestTimeouts[requestId];
        // execute the callback with error
        var callback = responseCallbacks[requestId];
        if (callback) {
          delete responseCallbacks[requestId];
          var err = new Error('timedout');
          err.timeout = requestTimeout;
          callback(err);
        }
        delete requestTimeouts[requestId];
      }, requestTimeout);
    }
    requestTimeouts[requestId] = setRequestTimeout(requestId);
  };

  /* jshint latedef: false */
  var generateGUID = function (){
    return uuid.v4();
  };
}

var uuidSource = fs.readFileSync(require.resolve('node-uuid'), 'utf-8');
var commonSource = fs.readFileSync(file, 'utf-8');

responder.source = [
	';(function (Primus, undefined) {',
	'if (undefined === Primus) return;',
  uuidSource,
  commonSource,
	responder.toString(),
	'responder();',
	'})(Primus);'
].join('\n');

module.exports = responder;

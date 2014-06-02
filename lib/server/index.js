var debug = require('debug')('primus-callbacks')
	, spark = require('./spark')
	, _primus
  , requestTimeout
  ;

function objMerge(obj1, obj2) {
  if (obj2) {
    var key, value;
    for (key in obj2) {
      if (key !== '__isError') {
        if (obj2.hasOwnProperty(key)) {
          value = obj2[key];
          try {
            if ( value.constructor === Object ) {
              obj1[key] = ObjectUtils.merge(obj1[key], value);
            } else {
              obj1[key] = value;
            }
          } catch(e) {
            obj1[key] = value;
          }
        }
      }
    }
  }
  return obj1;
}

// enable errors to be sent using websockets
// http://stackoverflow.com/questions/18391212/is-it-not-possible-to-stringify-an-error-using-json-stringify
Object.defineProperty(Error.prototype, 'toJSON', {
  value: function () {
    var alt = {
      __isError: true
    };

    Object.getOwnPropertyNames(this).forEach(function (key) {
      alt[key] = this[key];
    }, this);

    return alt;
  },
  configurable: true
});

/** PrivateFunction: requestFulfilled
 * A scoped version of `requestFulfilled` is passed along the "request" event
 * emitted by `dispatchRequest`.
 * The requestId available in the scope is used as responseId and is sent along
 * with the `data` argument.
 *
 * Parameters:
 *     (Error) err - The error if occurred
 *     (Object) data - Data to send with the response.
 */
function requestFulfilled(err, data) {
	debug('request fulfilled, send now response');

  var filledData = {
    plugin: 'primus-callbacks'
    , responseId: this.requestId
    , data: data
  };
  if (err) {
    filledData.error = err;
  }
  this.spark.write(filledData);
}

/** PrivateFunction: dispatchRequest
 * Dispatches a request on a response. A "request" event is emitted by the
 * spark object. That event contains the request data and a scoped reference
 * on the `requestFulfilled` function. The subject which reacts on the event
 * calls `requestFulfilled` to send a response related to this request.
 *
 * Parameters:
 *     (String) requestId -  An ID which identifies the request to dispatch.
 *     (Object) data - The request data.
 *     (Error) err - The error if occurred
 */
function dispatchRequest(requestId, data, err) {
	debug('dispatch request');

	var scope = {
    spark: this
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
 *     (String) responseId -  An ID which identifies a callback which should be
 *                            executed as soon as a response for a specific
 *                            request arrives.
 *     (Object) data - The response data transmitted by the spark.
 */
function dispatchResponse(responseId, data, err) {
	debug('dispatch response');

	var callback = this.responseCallbacks[responseId];

	if(callback) {
		delete this.responseCallbacks[responseId];
    var _err = err;
    if (_err && _err.__isError) {
      err = new Error();
      err = objMerge(err, _err);
    }
		callback(err, data);
	}
  if (this.requestTimeouts[responseId]) {
    clearInterval(this.requestTimeouts[responseId]);
    delete this.requestTimeouts[responseId];
  }
}

function handleIncoming(request) {
	debug('processing incoming message');

	var proceed = true
		, data = request.data
		, spark = this;

	// Check if message contains PrimusCallbacks envelope
	if(data.plugin && data.plugin === 'primus-callbacks') {
		proceed = false;

		// Check if it is a request or a response and dispatch
		if(data.requestId) {
			dispatchRequest.call(spark, data.requestId, data.data, data.error);
		} else if(data.responseId) {
			dispatchResponse.call(spark, data.responseId, data.data, data.error);
		}
	}

	return proceed;
}


function PrimusCallbacks(primus) {
	debug('initializing primus-callbacks');
	_primus = primus;
  var opts = Array.prototype.slice.call(arguments)[0] || {};
  requestTimeout = opts.options.requestTimeout || opts.options.timeout || 10000;

	// Ensure `writeAndWait` is available for sparks on the server too.
	// Further wrap primus-responders spark initialiser to the existing one.
	var sparkInit = primus.Spark.prototype.initialise;
	primus.Spark.prototype.writeAndWait = spark.writeAndWait;
	primus.Spark.prototype.initialise = function() {
		spark.initialise.call(this, requestTimeout);
		sparkInit.apply(this, arguments);
	};


	// Add the incoming transformer to handle PrimusCallbacks messages:
	primus.transform('incoming', handleIncoming);
}

module.exports = PrimusCallbacks;
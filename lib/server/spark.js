var debug = require('debug')('primus-callbacks.spark')
	, uuid  = require('node-uuid');

/** PrivateFunction: generateGuid()
 * Generates a GUID (globally unique identifier) using node.js' crypto library.
 *
 * See also:
 * http://stackoverflow.com/questions/6906916/
 * collisions-when-generating-uuids-in-javascript
 *
 * Returns:
 *     (String)
 */
function generateGUID() {
  return uuid.v4();
}

/** Function: initialise
 * Ensures that each spark has a `responseCallback` property.
 */
function initialise(timeout) {
	this.responseCallbacks = {};
  this.requestTimeouts = {};
  this.requestTimeout = timeout;
}

/** Function: writeAndWait
 * Sends the passed data to the spark. As soon as PrimusResponder recieved
 * a related response, `callback` is executed.
 *
 * Example:
 *
 *     spark.writeAndWait('primusresponder test', function(response) {
 *         console.log('PrimusResponder response arrived: ' + response);
 *     });
 *
 * Parameters:
 *     (Object) data - Data to send along the request
 *     (Function) callback - Executed as soon as the response on this request
 *                           arrived.
 */
function writeAndWait(data, callback) {
	debug('write request and wait for response');

	var requestId = generateGUID()
		, envelope = {
			plugin: 'primus-callbacks'
			, requestId: requestId
			, data: data
		};

	this.responseCallbacks[requestId] = callback;
	this.write(envelope);

  var self = this;

  function setRequestTimeout(requestId) {
    return setTimeout(function() {
      delete self.requestTimeouts[requestId];
      // execute the callback with error
      var callback = self.responseCallbacks[requestId];
      if (callback) {
        delete self.responseCallbacks[requestId];
        var err = new Error('timedout');
        err.timeout = self.requestTimeout;
        callback(err);
      }
      delete self.requestTimeouts[requestId];
    }, self.requestTimeout);
  }

  this.requestTimeouts[requestId] = setRequestTimeout(requestId);
}

module.exports = {
	initialise: initialise
	, writeAndWait: writeAndWait
};
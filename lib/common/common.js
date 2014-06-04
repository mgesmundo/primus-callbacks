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

/**
 * Create a deep clone of the source restoring Error properties
 *
 * @param {Object} source Source object
 * @param {Object} dest Destination Object (only for recursive use)
 * @return {Object} Destination object or source if it is not an object
 */
function cloneWithSafeError(source, dest) {
  if (source && 'object' === typeof source) {
    dest = dest || {};
    var _source = source;
    if (!(dest instanceof Error) && source.hasOwnProperty('__isError')) {
      _source = cloneWithSafeError(source, new Error());
      return _source;
    }
    var key, value;
    for (key in _source) {
      if (_source.hasOwnProperty(key)) {
        if (key !== '__isError') {
          value = _source[key];
          try {
            if ( 'object' === typeof value) {
              dest[key] = cloneWithSafeError(value, dest[key]);
            } else {
              dest[key] = value;
            }
          } catch(e) {
            dest[key] = value;
          }
        }
      }
    }
  } else {
    dest = source;
  }
  return dest;
}

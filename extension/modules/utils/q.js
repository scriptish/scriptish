var EXPORTED_SYMBOLS = ["Q"];

Components.utils.import("resource://scriptish/constants.js");

let Q = {};

Q.defer = jetpack('sdk/core/promise').defer;

Q.chain = function chain() {
  var funcs = Array.prototype.slice.call(arguments);
  if (!funcs.length) return true;
  return funcs.shift()().then(function() Q.chain.apply(null, funcs));
}

var EXPORTED_SYMBOLS = ["Q"];

Components.utils.import("resource://scriptish/constants.js");

const setTimeout = timeout;

Services.scriptloader
    .loadSubScript("chrome://scriptish/content/js/third-party/q.js", this);

Q.and = function and() {
  var promises = Array.prototype.slice.call(arguments);
  if (!promises.length) return true;
  return promises.shift().then(function() Q.and.apply(null, promises));
}

Q.chain = function chain() {
  var funcs = Array.prototype.slice.call(arguments);
  if (!funcs.length) return true;
  return funcs.shift()().then(function() Q.chain.apply(null, funcs));
}

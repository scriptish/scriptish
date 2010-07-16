
// JSM exported symbols
var EXPORTED_SYMBOLS = ["GM_listen"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");

const GM_listen = function(source, event, listener, opt_capture) {
  Cu.lookupMethod(source, "addEventListener")(event, listener, opt_capture);
}

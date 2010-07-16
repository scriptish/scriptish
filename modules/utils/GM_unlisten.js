
// JSM exported symbols
var EXPORTED_SYMBOLS = ["GM_unlisten"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");

const GM_unlisten = function(source, event, listener, opt_capture) {
  Cu.lookupMethod(source, "removeEventListener")(event, listener, opt_capture);
}


// JSM exported symbols
var EXPORTED_SYMBOLS = ["GM_ScriptLogger"];

const Cu = Components.utils;
Cu.import("resource://scriptish/utils.js");

function GM_ScriptLogger(script) {
  var namespace = script.namespace;

  if (namespace.substring(namespace.length - 1) != "/") {
    namespace += "/";
  }

  this.prefix = [namespace, script.name, ": "].join("");
}

GM_ScriptLogger.prototype.log = function(message) {
  GM_log(this.prefix + message, true);
};
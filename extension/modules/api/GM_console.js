var EXPORTED_SYMBOLS = ["GM_console"];
Components.utils.import("resource://scriptish/api/GM_ScriptLogger.js");

// based on http://www.getfirebug.com/firebug/firebugx.js
const keys = [
    "debug", "warn", "error", "info", "assert", "dir", "dirxml",
    "group", "groupEnd", "time", "timeEnd", "count", "trace", "profile",
    "profileEnd"];

function GM_console(script) {
  for (var i = keys.length - 1, key; key = keys[i--];)
    this[key] = function() {};

  // Important to use this private variable so that user scripts can't make
  // this call something else by redefining <this> or <logger>.
  var logger = new GM_ScriptLogger(script);
  this.log = function() { logger.log(Array.slice(arguments).join("\n")); };
}

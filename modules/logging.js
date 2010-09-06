
// JSM exported symbols
var EXPORTED_SYMBOLS = ["Scriptish_logError", "Scriptish_log"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
Cu.import("resource://scriptish/prefmanager.js");

const consoleService = Cc["@mozilla.org/consoleservice;1"]
                           .getService(Ci.nsIConsoleService);

/**
 * Utility to create an error message in the log without throwing an error.
 */
function Scriptish_logError(e, opt_warn, fileName, lineNumber) {
  var consoleError = Cc["@mozilla.org/scripterror;1"]
    .createInstance(Ci.nsIScriptError);

  var flags = opt_warn ? 1 : 0;

  // third parameter "sourceLine" is supposed to be the line, of the source,
  // on which the error happened.  we don't know it. (directly...)
  consoleError.init(e.message, fileName, null, lineNumber,
                    e.columnNumber, flags, null);

  consoleService.logMessage(consoleError);
}

function Scriptish_log(message, force) {
  if (force || Scriptish_prefRoot.getValue("logChrome", false)) {
    // make sure message is a string, and remove NULL bytes which truncate it
    consoleService.logStringMessage((message + '').replace("\0","","g"));
  }
}

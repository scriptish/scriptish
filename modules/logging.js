var EXPORTED_SYMBOLS = ["Scriptish_logError", "Scriptish_log"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
Cu.import("resource://scriptish/prefmanager.js");

// Utility to create an error message in the log without throwing an error.
function Scriptish_logError(e, opt_warn, fileName, lineNumber) {
  var err = Scriptish_Services.se;

  // third parameter "sourceLine" is supposed to be the line, of the source,
  // on which the error happened.  we don't know it. (directly...)
  err.init(
     e.message, fileName, null, lineNumber,
     e.columnNumber, opt_warn ? 1 : 0, null);

  Services.console.logMessage(err);
}

function Scriptish_log(message, force) {
  if (force || Scriptish_prefRoot.getValue("logChrome", false)) {
    // make sure message is a string, and remove NULL bytes which truncate it
    Services.console.logStringMessage((message + '').replace("\0","","g"));
  }
}

var EXPORTED_SYMBOLS = ["Scriptish_logError", "Scriptish_logScriptError", "Scriptish_log"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
lazyImport(this, "resource://scriptish/prefmanager.js", ["Scriptish_prefRoot"]);

// Utility to create an error message in the log without throwing an error.
function Scriptish_logError(aErr, opt_warn, fileName, lineNumber) {
  var e = Instances.se;

  // third parameter "sourceLine" is supposed to be the line, of the source,
  // on which the error happened.  we don't know it. (directly...)
  e.init(
      aErr.message, fileName, null, lineNumber, aErr.columnNumber,
      opt_warn ? 1 : 0, null);

  Services.console.logMessage(e);
}

/**
 * Utility to log scripts in such a way that the web console will pick it up
 *
 * @author nmaier
 * @param aError {object} Any supported script error
 * @param aWindow {window} The content window to associate the error with
 * @param aFileURL {object} Optional. nsIURI or .toString() giving the error location
 * @param aId {string} Optional. Script id.
 */
function Scriptish_logScriptError(aError, aWindow, aFileURL, aId) {
  try {
    let se = Instances.se;

    let windowId = 0;
    try {
      windowId = aWindow.QueryInterface(Ci.nsIInterfaceRequestor)
        .getInterface(Ci.nsIDOMWindowUtils)
        .outerWindowID;
    }
    catch (ex) {
      throw new Error("failed to get window id window id");
    }

    // defaults
    var errorMessage = "";
    var sourceName = null;
    var sourceLine = "";
    var lineNumber = 0;
    var columnNumber = 0;
    var flags = se.errorFlag;
    var category = "scriptish userscript error";

    // get what we can
    if ((aError instanceof Ci.nsIScriptError) || (aError instanceof Ci.nsIScriptError2)) {
      var {errorMessage, sourceName, sourceLine, lineNumber, columnNumber, flags, category} = aError;
    }
    else if (aError instanceof Ci.nsIException) {
      var {message:errorMessage, filename:sourceName, lineNumber, columnNumber} = aError;
    }
    // generic script error
    else if ("message" in aError) {
      // do not use aError.message, as this might hide the Error prefix
      // such as "SyntaxError: ..."
      errorMessage = aError.toString() || errorMessage;

      lineNumber = aError.lineNumber || lineNumber;
      columnNumber = aError.columnNumber || columnNumber;

      // We don't want that injected "scriptish/service.js -> realfile" stuff
      // Currently, moz will do this for us :p
      if (!/->/.test(aError.fileName || "->")) {
        sourceName = aError.fileName;
      }
    }
    else {
      errorMessage = aError.toString();
    }

    // if we haven't a sourceName yet, then derive it from aFileURL
    if (!sourceName) {
      aFileURL = aFileURL || "[user.js]";
      if (aFileURL instanceof Ci.nsIURI) {
        sourceName = aFileURL.spec;
      }
      else {
        sourceName = aFileURL.toString();
      }
    }

    // dispatch
    se.initWithWindowID(
      "[" + (aId  || "Scriptish") + "] " + errorMessage,
      sourceName,
      sourceLine,
      lineNumber,
      columnNumber,
      flags,
      category,
      windowId
      );
    Services.console.logMessage(se);
  }
  catch (ex) {
    // You never know :p
    Scriptish_logError(aError, false, aFileURL, aError.lineNumber);
  }
}

function Scriptish_log(aMsg, aForce) {
  if (!aForce && !Scriptish_prefRoot.getBoolValue("logChrome")) return;
  // make sure msg is a string, and remove NULL bytes which truncate it
  Services.console.logStringMessage(("[Scriptish] " + aMsg).replace("\0","","g"));
}

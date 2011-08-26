var EXPORTED_SYMBOLS = [
  "Scriptish_evalInSandbox",
  "Scriptish_evalInSandbox_filename"
];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
lazyImport(this, "resource://scriptish/logging.js", ["Scriptish_logError", "Scriptish_logScriptError"]);
lazyUtil(this, "stringBundle");

const fileURLPrefix = "chrome://scriptish/content/scriptish.js -> ";
const Scriptish_evalInSandbox_filename = Components.stack.filename;

function Scriptish_evalInSandbox(aScript, aSandbox, aWindow) {
  const jsVer = aScript.jsversion;
  const fileURL = aScript.fileURL;

  /*
  try {
    for (let [, req] in Iterator(aScript.requires)) {
      var rfileURL = req.fileURL;
      try {
        Cu.evalInSandbox(
          req.textContent + "\n",
          aSandbox,
          jsVer,
          fileURLPrefix + rfileURL,
          1
          );
      } catch (ex) {
        Scriptish_logScriptError(ex, aWindow, rfileURL, aScript.id);
      }
    }
  } catch (e) {
    return Scriptish_logError(e, 0, fileURL, e.lineNumber);
  }
  */

  try {
    try {
      Cu.evalInSandbox(
        aScript.textContent + "\n",
        aSandbox,
        jsVer,
        fileURLPrefix + fileURL,
        1
        );
    }
    catch (e if (e.message == "return not in function"
        || /\(NS_ERROR_OUT_OF_MEMORY\) \[nsIXPCComponents_Utils.evalInSandbox\]/.test(e.message))) {
      // catch errors when return is not in a function or when a window global
      // is being overwritten (which throws NS_ERROR_OUT_OF_MEMORY..)
      var sw = Instances.se;
      sw.init(
        Scriptish_stringBundle("warning.returnfrommain"),
        fileURL,
        "",
        e.lineNumber || 0,
        e.columnNumber || 0,
        sw.warningFlag,
        "scriptish userscript warnings"
        );
      Scriptish_logScriptError(sw, aWindow, fileURL, aScript.id);
      Cu.evalInSandbox(
        "(function(){" + aScript.textContent + "\n})()",
        aSandbox,
        jsVer,
        fileURLPrefix + fileURL,
        1
        );
    }
  } catch (e) {
    Scriptish_logScriptError(e, aWindow, fileURL, aScript.id);
  }
}

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

function Scriptish_evalInSandbox(aScript, aSandbox, aWindow, options) {
  const jsVer = aScript.jsversion;
  const fileURL = aScript.fileURL;
  const id = aScript.id;

  // e10s
  if (options && options.global && options.global.sendSyncMessage) {
    var reqAry = options.global.sendSyncMessage("Scriptish:GetScriptRequires", id)[0];
    var scriptText = options.global.sendSyncMessage("Scriptish:GetScriptContents", id)[0];
  }
  else {
    var reqAry = aScript.requires;
    var scriptText = aScript.textContent;
  }

  // eval script @requires
  try {
    for (let [, req] in Iterator(reqAry)) {
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
        Scriptish_logScriptError(ex, aWindow, rfileURL, id);
      }
    }
  } catch (e) {
    return Scriptish_logError(e, 0, fileURL, e.lineNumber);
  }

  // eval script
  try {
    try {
      Cu.evalInSandbox(
        scriptText + "\n",
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
      Scriptish_logScriptError(sw, aWindow, fileURL, id);
      Cu.evalInSandbox(
        "(function(){" + scriptText + "\n})()",
        aSandbox,
        jsVer,
        fileURLPrefix + fileURL,
        1
        );
    }
  } catch (e) {
    Scriptish_logScriptError(e, aWindow, fileURL, id);
  }
}

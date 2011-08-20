var EXPORTED_SYMBOLS = [
  "Scriptish_injectScripts",
  "Scriptish_injectScripts_filename"
];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");

lazyImport(this, "resource://scriptish/logging.js", ["Scriptish_log"]);
lazyImport(this, "resource://scriptish/prefmanager.js", ["Scriptish_prefRoot"]);
lazyImport(this, "resource://scriptish/api.js", ["GM_API"]);
lazyImport(this, "resource://scriptish/api/GM_sandboxScripts.js", ["GM_sandboxScripts"]);
lazyImport(this, "resource://scriptish/api/GM_console.js", ["GM_console"]);
lazyImport(this, "resource://scriptish/api/GM_ScriptLogger.js", ["GM_ScriptLogger"]);
lazyImport(this, "resource://scriptish/third-party/Timer.js", ["Timer"]);

const Scriptish_injectScripts_filename = Components.stack.filename;
const gTimer = new Timer();
const {nsIDOMXPathResult: XPATH_RESULT} = Ci;

lazyUtil(this, "evalInSandbox");
lazyUtil(this, "getWindowIDs");
lazyUtil(this, "windowUnloader");

function Scriptish_injectScripts(scripts, url, winID, wrappedContentWin, chromeWin) {
  if (0 >= scripts.length) return;
  let unsafeContentWin = wrappedContentWin.wrappedJSObject;

  let delays = [];
  let winID = Scriptish_getWindowIDs(wrappedContentWin).innerID;
  Scriptish_windowUnloader(function() {
    for (let [, id] in Iterator(delays)) gTimer.clearTimeout(id);
  }, winID);

  for (var i = 0, e = scripts.length; i < e; ++i) {
    // Do not "optimize" |script| out of the loop block and into the loop
    // declaration!
    // Need to keep a valid reference to |script| around so that GM_log
    // and the delay code (and probably other consumer work).
    let script = scripts[i];
    let sandbox = new Cu.Sandbox(wrappedContentWin);
    Cu.evalInSandbox(GM_sandboxScripts, sandbox);

    let GM_api = new GM_API(
        script, url, winID, wrappedContentWin, unsafeContentWin, chromeWin);

    // hack XPathResult since that is so commonly used
    sandbox.XPathResult = XPATH_RESULT;

    // add GM_* API to sandbox
    for (var funcName in GM_api) {
      sandbox[funcName] = GM_api[funcName];
    }
    XPCOMUtils.defineLazyGetter(sandbox, "console", function() {
      return GM_console(script, wrappedContentWin, chromeWin);
    });
    XPCOMUtils.defineLazyGetter(sandbox, "GM_log", function() {
      if (Scriptish_prefRoot.getValue("logToErrorConsole")) {
        var logger = new GM_ScriptLogger(script);
        return function() {
          logger.log(Array.slice(arguments).join(" "));
          sandbox.console.log.apply(sandbox.console, arguments);
        }
      }
      return sandbox.console.log.bind(sandbox.console);
    });

    sandbox.unsafeWindow = unsafeContentWin;
    sandbox.__proto__ = wrappedContentWin;

    let delay = script.delay;
    if (delay || delay === 0) {
      // don't use window's setTimeout, b/c then window could clearTimeout
      delays.push(gTimer.setTimeout(function() {
        Scriptish_evalInSandbox(script, sandbox, wrappedContentWin);
      }, delay));
    } else {
      Scriptish_evalInSandbox(script, sandbox, wrappedContentWin);
    }
  }
}

var EXPORTED_SYMBOLS = [
  "Scriptish_injectScripts",
  "Scriptish_injectScripts_filename"
];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");

lazyImport(this, "resource://scriptish/logging.js", ["Scriptish_log", "Scriptish_logError"]);
lazyImport(this, "resource://scriptish/prefmanager.js", ["Scriptish_prefRoot"]);
lazyImport(this, "resource://scriptish/api.js", ["GM_API"]);
lazyImport(this, "resource://scriptish/api/GM_sandboxScripts.js", ["GM_updatingEnabled", "GM_xpath"]);
lazyImport(this, "resource://scriptish/api/GM_console.js", ["GM_console"]);
lazyImport(this, "resource://scriptish/api/GM_ScriptLogger.js", ["GM_ScriptLogger"]);

lazyImport(this, "resource://scriptish/third-party/Scriptish_getBrowserForContentWindow.js", ["Scriptish_getBrowserForContentWindow"]);

lazyUtil(this, "evalInSandbox");
lazyUtil(this, "getWindowIDs");
lazyUtil(this, "windowUnloader");

const Scriptish_injectScripts_filename = Components.stack.filename;
const gTimer = jetpack('sdk/timers');
const {nsIDOMXPathResult: XPATH_RESULT} = Ci;

function Scriptish_injectScripts(options) {
  var {scripts, url, safeWin} = options;
  var chromeWin = Scriptish_getBrowserForContentWindow(safeWin).wrappedJSObject;
  if (!chromeWin || !chromeWin.Scriptish_BrowserUI) return;

  if (0 >= scripts.length) return;

  let unsafeContentWin = safeWin.wrappedJSObject;
  let winID = Scriptish_getWindowIDs(safeWin).innerID;

  let delays = [];

  // window destroyed handler
  Scriptish_windowUnloader(function() {
    // destroy a possible inject @delay
    for (let [, id] in Iterator(delays)) gTimer.clearTimeout(id);
    delays.length = 0;
  }, winID);

  for (let i = 0, e = scripts.length; i < e; ++i) {
    // Do not "optimize" |script| out of the loop block and into the loop
    // declaration!
    // Need to keep a block scoped reference to |script| around so that GM_log
    // and the delay code (and probably other consumer work).
    let script = scripts[i];

    let sandbox = new Cu.Sandbox(safeWin, {
      sandboxName: script.fileURL,
      sandboxPrototype: safeWin,
      wantXrays: true
    });

    // hack XPathResult since that is so commonly used
    sandbox.XPathResult = XPATH_RESULT;

    Cu.evalInSandbox(GM_updatingEnabled, sandbox);

    if (script.grant['GM_xpath']) {
      Cu.evalInSandbox(GM_xpath, sandbox);
    }

    // add GM_* API to sandbox
    let (GM_api = new GM_API(extend(options, {
      script: script,
      url: url,
      winID: winID,
      safeWin: safeWin,
      unsafeWin: unsafeContentWin,
      chromeWin: chromeWin
    }))) {
      for (var funcName in GM_api) {
        if (script.grant[funcName]) {
          sandbox[funcName] = GM_api[funcName];
        }
        else {
          delete GM_api[funcName];
        }
      }
    }

    lazy(sandbox, "console", function() {
      return GM_console(script, safeWin, chromeWin);
    });

    if (script.grant['GM_log']) {
      lazy(sandbox, "GM_log", function() {
        if (Scriptish_prefRoot.getValue("logToErrorConsole")) {
          var logger = new GM_ScriptLogger(script);
          return function() {
            const args = Array.slice(arguments);
            logger.log(args.join(" "));
            sandbox.console.log.apply(sandbox.console, args);
          }
        }
        return sandbox.console.log.bind(sandbox.console);
      });
    }

    sandbox.unsafeWindow = unsafeContentWin;

    let delay = script.delay;
    if (delay || delay === 0) {
      // don't use window's setTimeout, b/c then window could clearTimeout
      delays.push(gTimer.setTimeout(function() {
        Scriptish_evalInSandbox(script, sandbox, safeWin, options);
      }, delay));
    }
    else {
      Scriptish_evalInSandbox(script, sandbox, safeWin, options);
    }

    // window destroyed handler
    Scriptish_windowUnloader(function() {
      // try to nuke the sandbox (FF 17+ see bug 769273)
      Cu.nukeSandbox(sandbox);
    }, winID);
  }
}

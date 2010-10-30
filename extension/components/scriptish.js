const DESCRIPTION = "ScriptishService";
const CONTRACTID = "@scriptish.erikvold.com/scriptish-service;1";
const CLASSID = Components.ID("{ca39e060-88ab-11df-a4ee-0800200c9a66}");

const filename = Components.stack.filename;
const fileURLPrefix = "chrome://scriptish/content/scriptish.js -> ";

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
Cu.import("resource://scriptish/logging.js");
Cu.import("resource://scriptish/scriptish.js");
Cu.import("resource://scriptish/third-party/Timer.js");
Cu.import("resource://scriptish/utils/Scriptish_getFirebugConsole.js");

const {nsIContentPolicy: CP, nsIDOMXPathResult: XPATH_RESULT} = Ci;

function ScriptishService() {
  this.wrappedJSObject = this;
  this.timer = new Timer();
  this.updateChk = function() {
    Services.scriptloader
        .loadSubScript("chrome://scriptish/content/js/updatecheck.js");
    delete this.updateChk;
  }
}

ScriptishService.prototype = {
  classDescription:  DESCRIPTION,
  classID:           CLASSID,
  contractID:        CONTRACTID,
  _xpcom_categories: [{category: "content-policy",
                       entry: CONTRACTID,
                       value: CONTRACTID,
                       service: true}],
  QueryInterface: XPCOMUtils.generateQI([
      Ci.nsISupports, Ci.nsISupportsWeakReference, Ci.nsIContentPolicy]),

  get filename() filename,
  _scriptFoldername: "scriptish_scripts",

  _config: null,
  get config() {
    if (!this._config) {
      var tools = {};
      Cu.import("resource://scriptish/config/config.js", tools);
      this._config = new tools.Config(this._scriptFoldername);
    }

    return this._config;
  },

  domContentLoaded: function(wrappedContentWin, chromeWin) {
    var url = wrappedContentWin.document.location.href;
    var scripts = this.initScripts(url, wrappedContentWin, chromeWin);
    if (scripts.length > 0)
      this.injectScripts(scripts, url, wrappedContentWin, chromeWin);
  },

  shouldLoad: function(ct, cl, org, ctx, mt, ext) {
    var tools = {};
    Cu.import("resource://scriptish/utils/Scriptish_installUri.js", tools);

    // block content detection of scriptish by denying it chrome: & resource:
    // content, unless loaded from chrome: or about:
    if (org && !/^(?:chrome|about)$/.test(org.scheme)
        && /^(?:chrome|resource)$/.test(cl.scheme) && cl.host == "scriptish") {
      return CP.REJECT_SERVER;
    }

    var ret = CP.ACCEPT;
    // don't intercept anything when Scriptish is not enabled
    if (!Scriptish.enabled) return ret;
    // don't interrupt the view-source: scheme
    if ("view-source" == cl.scheme) return ret;

    if (ct == CP.TYPE_DOCUMENT && cl.spec.match(/\.user\.js$/)
        && !this.ignoreNextScript_ && !this.isTempScript(cl)) {
      tools.Scriptish_installUri(cl, ctx.contentWindow);
      ret = CP.REJECT_REQUEST;
    }

    this.ignoreNextScript_ = false;
    return ret;
  },

  shouldProcess: function(ct, cl, org, ctx, mt, ext) CP.ACCEPT,

  ignoreNextScript: function() {
    dump("ignoring next script...\n");
    this.ignoreNextScript_ = true;
  },

  isTempScript: function(uri) {
    if (uri.scheme != "file") return false;

    var fph = Cc["@mozilla.org/network/protocol;1?name=file"]
        .getService(Ci.nsIFileProtocolHandler);

    var file = fph.getFileFromURLSpec(uri.spec);
    var tmpDir = Services.dirsvc.get("TmpD", Ci.nsILocalFile);

    return file.parent.equals(tmpDir) && file.leafName != "newscript.user.js";
  },

  initScripts: function(url, wrappedContentWin, chromeWin) {
    var scripts;
    var tools = {};
    Cu.import("resource://scriptish/prefmanager.js", tools);

    // Todo: Try to implement this w/out global state.
    this.config.wrappedContentWin = wrappedContentWin;
    this.config.chromeWin = chromeWin;

    if (tools.Scriptish_prefRoot.getValue('enableScriptRefreshing'))
      this.config.updateModifiedScripts();

    var basicCheck = function(script) {
      return !script.delayInjection && script.enabled &&
          !script.needsUninstall && script.matchesURL(url);
    };

    // is the window the top most window in the iframe stack?
    if (wrappedContentWin !== wrappedContentWin.top) {
      scripts = this.config.getMatchingScripts(function(script) {
        return !script.noframes && basicCheck(script);
      });
    } else {
      scripts = this.config.getMatchingScripts(basicCheck);
    }

    return scripts;
  },

  injectScripts: function(scripts, url, wrappedContentWin, chromeWin) {
    let self = this;
    let sandbox;
    let script;
    let unsafeContentWin = wrappedContentWin.wrappedJSObject;
    let tools = {};
    Cu.import("resource://scriptish/api/GM_console.js", tools);
    Cu.import("resource://scriptish/api.js", tools);

    let delays = [];
    wrappedContentWin.addEventListener("unload", function() {
      for (let [, timerID] in Iterator(delays))
        self.timer.clearTimeout(timerID);
    }, true);

    // detect and grab reference to firebug console and context, if it exists
    let fbConsole = Scriptish_getFirebugConsole(unsafeContentWin, chromeWin);

    for (var i = 0; script = scripts[i++];) {
      sandbox = new Cu.Sandbox(wrappedContentWin);

      let GM_API = new tools.GM_API(
          script, url, wrappedContentWin, unsafeContentWin, chromeWin);

      // hack XPathResult since that is so commonly used
      sandbox.XPathResult = XPATH_RESULT;

      // add GM_* API to sandbox
      for (var funcName in GM_API) sandbox[funcName] = GM_API[funcName];
      sandbox.console = fbConsole || new tools.GM_console(script);

      sandbox.unsafeWindow = unsafeContentWin;
      sandbox.__proto__ = wrappedContentWin;

      let delay = script.delay;
      if (delay || delay === 0) {
        let (script = script, sb = sandbox) {
          delays.push(self.timer.setTimeout(function() {
            self.evalInSandbox(script, sandbox);
          }, script.delay));
        }
      } else {
        this.evalInSandbox(script, sandbox);
      }
    }
  },

  evalInSandbox: function(aScript, aSandbox) {
    var jsVer = aScript.jsversion;
    var fileURL;

    try {
      for (let [, req] in Iterator(aScript.requires)) {
        fileURL = req.fileURL;
        Cu.evalInSandbox(req.textContent, aSandbox, jsVer, fileURLPrefix+fileURL, 1);
      }
    } catch (e) {
      return Scriptish_logError(e, 0, fileURL, e.lineNumber);
    }

    var src = aScript.textContent + "\n";
    fileURL = aScript.fileURL;
    try {
      try {
        Cu.evalInSandbox(src, aSandbox, jsVer, fileURLPrefix+fileURL, 1);
      // catch errors when return is not in a function or when a window global
      // is being overwritten (which throws NS_ERROR_OUT_OF_MEMORY..)
      } catch (e if (e.message == "return not in function"
          || /\(NS_ERROR_OUT_OF_MEMORY\) \[nsIXPCComponents_Utils.evalInSandbox\]/.test(e.message))) {
        Cu.evalInSandbox(
            "(function(){"+src+"})()", aSandbox, jsVer, fileURLPrefix+fileURL, 1);
      }
    } catch (e) {
      Scriptish_logError(e, 0, fileURL, e.lineNumber);
    }
  }
}

var NSGetFactory = XPCOMUtils.generateNSGetFactory([ScriptishService]);

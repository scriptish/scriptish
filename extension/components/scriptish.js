const DESCRIPTION = "ScriptishService";
const CONTRACTID = "@scriptish.erikvold.com/scriptish-service;1";
const CLASSID = Components.ID("{ca39e060-88ab-11df-a4ee-0800200c9a66}");

const filename = Components.stack.filename;
const fileURLPrefix = "chrome://scriptish/content/scriptish.js -> ";

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
Cu.import("resource://scriptish/logging.js");

function ScriptishService() {
  this.wrappedJSObject = this;
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

  // nsISupports
  QueryInterface: XPCOMUtils.generateQI([
      Ci.nsISupports,
      Ci.nsISupportsWeakReference,
      Ci.nsIContentPolicy
  ]),

  get filename() filename,
  _scriptFoldername: "scriptish_scripts",

  _config: null,
  get config() {
    if (!this._config) {
      this.updateChk && this.updateChk();
      var tools = {};
      Cu.import("resource://scriptish/config/config.js", tools);
      this._config = new tools.Config(this._scriptFoldername);
    }

    return this._config;
  },

  domContentLoaded: function(wrappedContentWin, chromeWin, gmBrowser) {
    var url = wrappedContentWin.document.location.href;
    var scripts = this.initScripts(url, wrappedContentWin, chromeWin);

    if (scripts.length > 0) {
      this.injectScripts(scripts, url, wrappedContentWin, chromeWin, gmBrowser);
    }
  },

  shouldLoad: function(ct, cl, org, ctx, mt, ext) {
    var tools = {};
    Cu.import("resource://scriptish/utils/Scriptish_installUri.js", tools);
    Cu.import("resource://scriptish/utils/Scriptish_getEnabled.js", tools);

    var ret = Ci.nsIContentPolicy.ACCEPT;

    // block content detection of scriptish by denying it chrome: & resource:
    // content, unless loaded from chrome: or about:
    if (org && !/^(?:chrome|about)$/.test(org.scheme)
        && /^(?:chrome|resource)$/.test(cl.scheme) && cl.host == "scriptish") {
      return Ci.nsIContentPolicy.REJECT_SERVER;
    }

    // don't intercept anything when Scriptish is not enabled
    if (!tools.Scriptish_getEnabled()) return ret;

    // don't interrupt the view-source: scheme
    // (triggered if the link in the error console is clicked)
    if ("view-source" == cl.scheme) return ret;

    if (ct == Ci.nsIContentPolicy.TYPE_DOCUMENT &&
        cl.spec.match(/\.user\.js$/)) {

      dump("shouldload: " + cl.spec + "\n");
      dump("ignorescript: " + this.ignoreNextScript_ + "\n");

      if (!this.ignoreNextScript_ &&
          !this.isTempScript(cl)) {
        tools.Scriptish_installUri(cl, ctx.contentWindow);
        ret = Ci.nsIContentPolicy.REJECT_REQUEST;
      }
    }

    this.ignoreNextScript_ = false;
    return ret;
  },

  shouldProcess: function(ct, cl, org, ctx, mt, ext) {
    return Ci.nsIContentPolicy.ACCEPT;
  },

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

    if (tools.Scriptish_prefRoot.getValue('enableScriptRefreshing')) {
      this.config.updateModifiedScripts();
    }

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

  injectScripts: function(scripts, url, wrappedContentWin, chromeWin, gmBrowser) {
    var sandbox;
    var script;
    var unsafeContentWin = wrappedContentWin.wrappedJSObject;

    var tools = {};
    Cu.import("resource://scriptish/api/GM_console.js", tools);
    Cu.import("resource://scriptish/api.js", tools);

    // detect and grab reference to firebug console and context, if it exists
    var firebugConsole = this.getFirebugConsole(unsafeContentWin, chromeWin);

    for (var i = 0; script = scripts[i]; i++) {
      sandbox = new Cu.Sandbox(wrappedContentWin);

      var GM_API = new tools.GM_API(
          script,
          url,
          wrappedContentWin,
          unsafeContentWin,
          Services.ass.hiddenDOMWindow,
          chromeWin,
          gmBrowser);

      sandbox.unsafeWindow = unsafeContentWin;

      // hack XPathResult since that is so commonly used
      sandbox.XPathResult = Ci.nsIDOMXPathResult;

      // add our own APIs
      for (var funcName in GM_API) sandbox[funcName] = GM_API[funcName];
      sandbox.console =
          firebugConsole ? firebugConsole : new tools.GM_console(script);

      sandbox.__proto__ = wrappedContentWin;

      this.evalInSandbox(script, sandbox);
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

    var src = aScript.textContent;
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
  },

  getFirebugConsole: function(unsafeContentWin, chromeWin) {
    // If we can't find this object, there's no chance the rest of this
    // function will work.
    if ('undefined' == typeof chromeWin.Firebug) return null;

    try {
      chromeWin = chromeWin.top;
      var fbVersion = parseFloat(chromeWin.Firebug.version, 10);
      var fbConsole = chromeWin.Firebug.Console;
      var fbContext = chromeWin.TabWatcher &&
        chromeWin.TabWatcher.getContextByWindow(unsafeContentWin);

      // Firebug 1.4 will give no context, when disabled for the current site.
      // We can't run that way.
      if ('undefined' == typeof fbContext) return null;

      function findActiveContext() {
        for (var i=0; i<fbContext.activeConsoleHandlers.length; i++) {
          if (fbContext.activeConsoleHandlers[i].window == unsafeContentWin)
            return fbContext.activeConsoleHandlers[i];
        }
        return null;
      }

      if (!fbConsole.isEnabled(fbContext)) return null;

      if (1.2 == fbVersion) {
        var tools = {};
        Services.scriptloader
            .loadSubScript("chrome://global/content/XPCNativeWrapper.js", tools);
        var safeWin = new tools.XPCNativeWrapper(unsafeContentWin);

        if (fbContext.consoleHandler) {
          for (var i = 0; i < fbContext.consoleHandler.length; i++) {
            if (fbContext.consoleHandler[i].window == safeWin) {
              return fbContext.consoleHandler[i].handler;
            }
          }
        }

        var dummyElm = safeWin.document.createElement("div");
        dummyElm.setAttribute("id", "_firebugConsole");
        safeWin.document.documentElement.appendChild(dummyElm);
        chromeWin.Firebug.Console.injector.addConsoleListener(fbContext, safeWin);
        dummyElm.parentNode.removeChild(dummyElm);

        return fbContext.consoleHandler.pop().handler;
      } else if (fbVersion >= 1.3) {
        fbConsole.injector.attachIfNeeded(fbContext, unsafeContentWin);
        return findActiveContext();
      }
    } catch (e) {
      dump('Scriptish getFirebugConsole() error:\n'+uneval(e)+'\n');
    }
    return null;
  }
};

var NSGetFactory = XPCOMUtils.generateNSGetFactory([ScriptishService]);

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
Cu.import("resource://scriptish/utils/Scriptish_alert.js");
Cu.import("resource://scriptish/utils/Scriptish_getBrowserForContentWindow.js");
Cu.import("resource://scriptish/utils/Scriptish_getFirebugConsole.js");
Cu.import("resource://scriptish/utils/Scriptish_getWindowIDs.js");

const {nsIContentPolicy: CP, nsIDOMXPathResult: XPATH_RESULT} = Ci;
const docRdyStates = ["uninitialized", "loading", "loaded", "interactive", "complete"];

function isScriptRunnable(script, url, topWin) {
  if (!script.fileExists()) {
    script.uninstall();
    return false;
  }
  let chk = !(!topWin && script.noframes)
      && !script.delayInjection
      && script.enabled
      && !script.needsUninstall
      && script.matchesURL(url);
  return chk;
}

let windows = {};

function ScriptishService() {
  this.wrappedJSObject = this;
  this.timer = new Timer();
  this.updateChk = function() {
    Services.scriptloader
        .loadSubScript("chrome://scriptish/content/js/updatecheck.js");
    delete this.updateChk;
  }

  Services.obs.addObserver(this, "chrome-document-global-created", false);
  Services.obs.addObserver(this, "content-document-global-created", false);
  Services.obs.addObserver(this, "inner-window-destroyed", false);
  Services.obs.addObserver(this, "install-userscript", false);
  Services.obs.addObserver(this, "scriptish-enabled", false);
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

  observe: function(aSubject, aTopic, aData) {
    switch (aTopic) {
      case "chrome-document-global-created":
      case "content-document-global-created":
        this.docReady(aSubject, Scriptish_getBrowserForContentWindow(aSubject));
        break;
      case "inner-window-destroyed":
        this.innerWinDestroyed(aSubject.QueryInterface(Components.interfaces.nsISupportsPRUint64).data);
        break;
      case "install-userscript":
        let win = Scriptish.getMostRecentWindow("navigator:browser");
        if (win) win.Scriptish_BrowserUI.installCurrentScript();
        break;
      case "scriptish-enabled":
        aData = Instances.json.decode(aData);
        let bWins = Scriptish.getWindows();
        let on = aData.enabling;
        while (bWins.hasMoreElements()) {
          let bWin = bWins.getNext();
          bWin.Scriptish_BrowserUI.statusCasterEle.setAttribute("checked", on.toString());
          bWin.Scriptish_BrowserUIM.refreshStatus();
        }
        break;
    }
  },

  get filename() filename,

  innerWinDestroyed: function(aWinID) {
    let window = windows[aWinID];
    if (!window || !window.unloaders || !window.unloaders.length) return;
    for (var i = window.unloaders.length - 1; ~i; i--)
      window.unloaders[i]();
    delete windows[aWinID];
  },

  docReady: function(safeWin, chromeWin) {
    if (!Scriptish.enabled || !chromeWin) return;

    let currentInnerWindowID = Scriptish_getWindowIDs(safeWin).innerID;
    windows[currentInnerWindowID] = {unloaders: []};
    let gmBrowserUI = chromeWin.Scriptish_BrowserUI;
    let gBrowser = chromeWin.gBrowser;
    let href = (safeWin.location.href
        || (safeWin.frameElement && safeWin.frameElement.src))
        || "";

    // Show the scriptish install banner if the user is navigating to a .user.js
    // file in a top-level tab.  If the file was previously cached it might have
    // been given a number after .user, like gmScript.user-12.js
    if (safeWin === safeWin.top && href.match(/\.user(?:-\d+)?\.js$/)
        && !/text\/html/i.test(safeWin.document.contentType)) {
      gmBrowserUI.showInstallBanner(
          gBrowser.getBrowserForDocument(safeWin.document));
    }

    if (!Scriptish.isGreasemonkeyable(href)) return;

    let unsafeWin = safeWin.wrappedJSObject;
    let self = this;
    let tools = {};
    let winClosed = false;
    Cu.import("resource://scriptish/prefmanager.js", tools);

    function shouldNotRun() (
      winClosed || !Scriptish.enabled || !Scriptish.isGreasemonkeyable(href));

    // check if there are any modified scripts
    if (tools.Scriptish_prefRoot.getValue("enableScriptRefreshing"))
      Scriptish.getConfig(function(config) config.updateModifiedScripts(function(script) {
        if (shouldNotRun()
            || !isScriptRunnable(script, href, safeWin === safeWin.top))
          return;

        let rdyStateIdx = docRdyStates.indexOf(safeWin.document.readyState);
        function inject() {
          if (shouldNotRun()) return;
          self.injectScripts([script], href, currentInnerWindowID, safeWin, chromeWin);
        }
        switch (script.runAt) {
        case "document-end":
          if (2 > rdyStateIdx) {
            safeWin.addEventListener("DOMContentLoaded", inject, true);
            return;
          }
          break;
        case "document-idle":
          if (2 > rdyStateIdx) {
            safeWin.addEventListener(
                "DOMContentLoaded", function() timeout(inject), true);
            return;
          }
          break;
        case "window-load":
          if (4 > rdyStateIdx) {
            safeWin.addEventListener("load", inject, true);
            return;
          }
          break;
        }
        inject();
      }));

    // if the focused tab's window is loading, then attach menuCommander
    if (safeWin === gBrowser.selectedBrowser.contentWindow) {
      if (gmBrowserUI.currentMenuCommander)
        gmBrowserUI.currentMenuCommander.detach();
      gmBrowserUI.currentMenuCommander =
          gmBrowserUI.getCommander(currentInnerWindowID).attach();
    }

    // find matching scripts
    this.initScripts(href, safeWin, function(scripts) {
      if (scripts["document-end"].length || scripts["document-idle"].length) {
        safeWin.addEventListener("DOMContentLoaded", function() {
          if (shouldNotRun()) return;

          // inject @run-at document-idle scripts
          if (scripts["document-idle"].length)
            timeout(function() {
              if (shouldNotRun()) return;
              self.injectScripts(
                  scripts["document-idle"], href, currentInnerWindowID, safeWin, chromeWin);
            });

          // inject @run-at document-end scripts
          self.injectScripts(scripts["document-end"], href, currentInnerWindowID, safeWin, chromeWin);
        }, true);
      }

      if (scripts["window-load"].length) {
        safeWin.addEventListener("load", function() {
          if (shouldNotRun()) return;
          // inject @run-at window-load scripts
          self.injectScripts(scripts["window-load"], href, currentInnerWindowID, safeWin, chromeWin);
        }, true);
      }

      // inject @run-at document-start scripts
      self.injectScripts(scripts["document-start"], href, currentInnerWindowID, safeWin, chromeWin);

      windows[currentInnerWindowID].unloaders.push(function() {
        winClosed = true;
        self.docUnload(currentInnerWindowID, gmBrowserUI);
      });
    });
  },

  docUnload: function(aWinID, aGMBrowserUI) {
    let menuCmders = aGMBrowserUI.menuCommanders;
    if (!menuCmders || 0 == menuCmders.length) return;

    let curMenuCmder = this.currentMenuCommander;
    for (let [i, item] in Iterator(menuCmders)) {
      if (item.winID !== aWinID) continue;
      if (item.commander === curMenuCmder) curMenuCmder = curMenuCmder.detach();
      menuCmders.splice(i, 1);
      break;
    }
    return;
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

    if ((ct == CP.TYPE_DOCUMENT || CP.TYPE_SUBDOCUMENT)
        && cl.spec.match(/\.user\.js$/)
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

  initScripts: function(url, wrappedContentWin, aCallback) {
    let scripts = {
      "document-start": [],
      "document-end": [],
      "document-idle": [],
      "window-load": []
    };

    let isTopWin = wrappedContentWin === wrappedContentWin.top;
    Scriptish.getConfig(function(config) {
      config.getMatchingScripts(function(script) {
        let chk = isScriptRunnable(script, url, isTopWin);
        if (chk) scripts[script.runAt].push(script);
        return chk;
      }, [url]);

      aCallback(scripts);
    });
  },

  injectScripts: function(scripts, url, winID, wrappedContentWin, chromeWin) {
    if (0 >= scripts.length) return;
    let self = this;
    let sandbox;
    let script;
    let unsafeContentWin = wrappedContentWin.wrappedJSObject;
    let tools = {};
    Cu.import("resource://scriptish/api/GM_console.js", tools);
    Cu.import("resource://scriptish/api.js", tools);

    let delays = [];
    let winID = Scriptish_getWindowIDs(wrappedContentWin).innerID;
    windows[winID].unloaders.push(function() {
      for (let [, id] in Iterator(delays)) self.timer.clearTimeout(id);
    });

    // detect and grab reference to firebug console and context, if it exists
    let fbConsole = Scriptish_getFirebugConsole(wrappedContentWin, chromeWin);

    for (var i = 0; script = scripts[i++];) {
      sandbox = new Cu.Sandbox(wrappedContentWin);

      let GM_API = new tools.GM_API(
          script, url, winID, wrappedContentWin, unsafeContentWin, chromeWin);

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
          // don't use window's setTimeout, b/c then window could clearTimeout
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
        Cu.evalInSandbox(
            req.textContent + "\n", aSandbox, jsVer, fileURLPrefix+fileURL, 1);
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

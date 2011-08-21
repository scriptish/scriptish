const DESCRIPTION = "ScriptishService";
const CONTRACTID = "@scriptish.erikvold.com/scriptish-service;1";
const CLASSID = Components.ID("{ca39e060-88ab-11df-a4ee-0800200c9a66}");

const filename = Components.stack.filename;

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");

lazyImport(this, "resource://scriptish/logging.js", ["Scriptish_logError", "Scriptish_logScriptError", "Scriptish_log"]);
lazyImport(this, "resource://scriptish/prefmanager.js", ["Scriptish_prefRoot"]);
lazyImport(this, "resource://scriptish/scriptish.js", ["Scriptish"]);
lazyImport(this, "resource://scriptish/manager.js", ["Scriptish_manager"]);
lazyImport(this, "resource://scriptish/config.js", ["Scriptish_config"]);
lazyImport(this, "resource://scriptish/third-party/Scriptish_getBrowserForContentWindow.js", ["Scriptish_getBrowserForContentWindow"]);

lazyUtil(this, "alert");
lazyUtil(this, "injectScripts");
lazyUtil(this, "installUri");
lazyUtil(this, "isScriptRunnable");
lazyUtil(this, "getWindowIDs");
lazyUtil(this, "stringBundle");
lazyUtil(this, "windowUnloader");

const {nsIContentPolicy: CP} = Ci;
const docRdyStates = ["uninitialized", "loading", "loaded", "interactive", "complete"];

// If the file was previously cached it might have been given a number after
// .user, like gmScript.user-12.js
const RE_USERSCRIPT = /\.user(?:-\d+)?\.js$/;
const RE_CONTENTTYPE = /text\/html/i;

function ScriptishService() {
  this.wrappedJSObject = this;
  this.updateChk = function() {
    Services.scriptloader
        .loadSubScript("chrome://scriptish/content/js/updatecheck.js");
    delete this.updateChk;
  }

  Scriptish_manager.setup.call(this);
  Services.obs.addObserver(this, "install-userscript", false);
  Services.obs.addObserver(this, "scriptish-enabled", false);
}

ScriptishService.prototype = {
  classDescription: DESCRIPTION,
  classID: CLASSID,
  contractID: CONTRACTID,
  _xpcom_categories: [{
    category: "content-policy",
    entry: CONTRACTID,
    value: CONTRACTID,
    service: true
  }],
  QueryInterface: XPCOMUtils.generateQI([
      Ci.nsISupports, Ci.nsISupportsWeakReference, Ci.nsIContentPolicy]),

  observe: function(aSubject, aTopic, aData) {
    switch (aTopic) {
      case "install-userscript":
        let win = Scriptish.getMostRecentWindow("navigator:browser");
        if (win) win.Scriptish_BrowserUI.installCurrentScript();
        break;
      case "scriptish-enabled":
        aData = JSON.parse(aData);
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

  docReady: function(safeWin) {
    var chromeWin = Scriptish_getBrowserForContentWindow(safeWin).wrappedJSObject;
    if (!Scriptish.enabled || !chromeWin) return;

    let gmBrowserUI = chromeWin.Scriptish_BrowserUI;
    let gBrowser = chromeWin.gBrowser;
    if (!gmBrowserUI || !gBrowser) return;

    let currentInnerWindowID = Scriptish_getWindowIDs(safeWin).innerID;

    let href = (safeWin.location.href
        || (safeWin.frameElement && safeWin.frameElement.src))
        || "";

    if (!href && safeWin.frameElement) {
      Scriptish_manager.waitForFrame.call(this, safeWin, chromeWin);
      return;
    }

    // Show the scriptish install banner if the user is navigating to a .user.js
    // file in a top-level tab.
    if (gmBrowserUI.scriptDownloader_
        && safeWin === safeWin.top && RE_USERSCRIPT.test(href)
        && !RE_CONTENTTYPE.test(safeWin.document.contentType)) {
      gmBrowserUI.showInstallBanner(
          gBrowser.getBrowserForDocument(safeWin.document));
    }

    if (!Scriptish.isGreasemonkeyable(href)) return;

    let unsafeWin = safeWin.wrappedJSObject;
    let self = this;
    let winClosed = false;
    let isTop = (safeWin === safeWin.top);

    // rechecks values that can change at any moment
    function shouldNotRun() (
      winClosed || !Scriptish.enabled || !Scriptish.isGreasemonkeyable(href));

    // check if there are any modified scripts
    if (Scriptish_prefRoot.getValue("enableScriptRefreshing")) {
       Scriptish_config.updateModifiedScripts(function(script) {
        if (shouldNotRun()
            || !Scriptish_isScriptRunnable(script, href, isTop))
          return;

        let rdyStateIdx = docRdyStates.indexOf(safeWin.document.readyState);
        function inject() {
          if (shouldNotRun()) return;
          Scriptish_injectScripts([script], href, currentInnerWindowID, safeWin, chromeWin);
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
      });
    }

    // if the focused tab's window is the one loading, then attach menuCommander
    if (safeWin === gBrowser.selectedBrowser.contentWindow) {
      if (gmBrowserUI.currentMenuCommander)
        gmBrowserUI.currentMenuCommander.detach();
      gmBrowserUI.currentMenuCommander =
          gmBrowserUI.getCommander(currentInnerWindowID).attach();
    }

    // if the url is a excluded url then stop
    if (Scriptish_config.isURLExcluded(href)) return;

    // find matching scripts
    Scriptish_config.initScripts(href, isTop, function(scripts) {
      if (scripts["document-end"].length || scripts["document-idle"].length) {
        safeWin.addEventListener("DOMContentLoaded", function() {
          if (shouldNotRun()) return;

          // inject @run-at document-idle scripts
          if (scripts["document-idle"].length)
            timeout(function() {
              if (shouldNotRun()) return;
              Scriptish_injectScripts(
                  scripts["document-idle"], href, currentInnerWindowID, safeWin, chromeWin);
            });

          // inject @run-at document-end scripts
          Scriptish_injectScripts(scripts["document-end"], href, currentInnerWindowID, safeWin, chromeWin);
        }, true);
      }

      if (scripts["window-load"].length) {
        safeWin.addEventListener("load", function() {
          if (shouldNotRun()) return;
          // inject @run-at window-load scripts
          Scriptish_injectScripts(scripts["window-load"], href, currentInnerWindowID, safeWin, chromeWin);
        }, true);
      }

      // inject @run-at document-start scripts
      Scriptish_injectScripts(scripts["document-start"], href, currentInnerWindowID, safeWin, chromeWin);

      Scriptish_windowUnloader(function() {
        winClosed = true;
        gmBrowserUI.docUnload(currentInnerWindowID);
      }, currentInnerWindowID);
    });
  },

  _test_org: {
    "chrome": true,
    "about": true
  },
  _test_cl: {
    "chrome": true,
    "resource": true
  },
  _reg_userjs: /\.user\.js$/,
  shouldLoad: function(ct, cl, org, ctx, mt, ext) {
    // block content detection of scriptish by denying it chrome: & resource:
    // content, unless loaded from chrome: or about:
    if (org && !this._test_org[org.scheme]
        && this._test_cl[cl.scheme]
        && cl.host == "scriptish") {
      return CP.REJECT_SERVER;
    }

    // don't intercept anything when Scriptish is not enabled
    if (!Scriptish.enabled) return CP.ACCEPT;

    // don't interrupt the view-source: scheme
    if ("view-source" == cl.scheme) return CP.ACCEPT;

    // CP.TYPE is not binary, so do not use bitwise logic tricks
    if ((ct == CP.TYPE_DOCUMENT || ct == CP.TYPE_SUBDOCUMENT)
        && this._reg_userjs.test(cl.spec) && !this.isTempScript(cl)) {
      Scriptish_installUri(cl);
    }

    return CP.ACCEPT;
  },

  shouldProcess: function(ct, cl, org, ctx, mt, ext) CP.ACCEPT,

  _tmpDir: Services.dirsvc.get("TmpD", Ci.nsILocalFile),
  isTempScript: function(uri) {
    if (!(uri instanceof Ci.nsIFileURL)) return false;

    var file = uri.file;
    return file.parent.equals(this._tmpDir) && file.leafName != "newscript.user.js";
  }
}

var NSGetFactory = XPCOMUtils.generateNSGetFactory([ScriptishService]);

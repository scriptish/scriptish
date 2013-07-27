"use strict";
const DESCRIPTION = "ScriptishService";
const CONTRACTID = "@scriptish.erikvold.com/scriptish-service;1";
const CLASSID = Components.ID("{ca39e060-88ab-11df-a4ee-0800200c9a66}");

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
Cu.import("resource://scriptish/addonprovider.js");

lazyImport(this, "resource://scriptish/logging.js", ["Scriptish_logError", "Scriptish_log"]);
lazyImport(this, "resource://scriptish/prefmanager.js", ["Scriptish_prefRoot"]);
lazyImport(this, "resource://scriptish/scriptish.js", ["Scriptish"]);
lazyImport(this, "resource://scriptish/manager.js", ["Scriptish_manager"]);
lazyImport(this, "resource://scriptish/third-party/Scriptish_getBrowserForContentWindow.js", ["Scriptish_getBrowserForContentWindow"]);

lazyUtil(this, "injectScripts");
lazyUtil(this, "installUri");
lazyUtil(this, "isGreasemonkeyable");
lazyUtil(this, "isScriptRunnable");
lazyUtil(this, "stringBundle");
lazyUtil(this, "windowEventTracker");
lazyUtil(this, "windowUnloader");

const { getInnerId } = jetpack('sdk/window/utils');

const CP = Ci.nsIContentPolicy;

// If the file was previously cached it might have been given a number after
// .user, like gmScript.user-12.js
const RE_USERSCRIPT = /\.user(?:-\d+)?\.js$/;
const RE_CONTENTTYPE = /text\/html/i;

// load the USo HTTPS redirector
jetpack('scriptish/uso-redirector');

function ScriptishService() {
  // load the manager
  Scriptish_manager();

  Services.obs.addObserver(this, "install-userscript", false);
  Services.obs.addObserver(this, "scriptish-enabled", false);
  Services.obs.addObserver(this, "content-document-global-created", false);
  Services.obs.addObserver(this, "chrome-document-global-created", false);
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
      case "content-document-global-created":
      case "chrome-document-global-created":
        let safeWin = aSubject;
        let chromeWin = Scriptish_getBrowserForContentWindow(safeWin).wrappedJSObject;
        if (!chromeWin) return;

        let gmBrowserUI = chromeWin.Scriptish_BrowserUI;
        let gBrowser = chromeWin.gBrowser;
        if (!gmBrowserUI || !gBrowser) return;

        // Show the scriptish install banner if the user is navigating to a .user.js
        // file in a top-level tab.
        if (gmBrowserUI.scriptDownloader_
            && safeWin === safeWin.top
            && RE_USERSCRIPT.test(safeWin.location.href)
            && !RE_CONTENTTYPE.test(safeWin.document.contentType)) {
          gmBrowserUI.showInstallBanner(
              gBrowser.getBrowserForDocument(safeWin.document));
        }

        let currentInnerWindowID = getInnerId(safeWin);
        // if the focused tab's window is the one loading, then attach menuCommander
        if (safeWin === gBrowser.selectedBrowser.contentWindow) {
          if (gmBrowserUI.currentMenuCommander)
            gmBrowserUI.currentMenuCommander.detach();

          gmBrowserUI.currentMenuCommander =
              gmBrowserUI.getCommander(currentInnerWindowID).attach();
        }

        Scriptish_windowUnloader(function() {
          gmBrowserUI.docUnload(currentInnerWindowID);
        }, currentInnerWindowID);
        break;
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

  _test_org: {
    "chrome": true,
    "about": true
  },
  _test_cl: {
    "chrome": true,
    "resource": true
  },
  _reg_userjs: /^[^#\?=]+\.user\.js$/,
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
      Scriptish_installUri(cl, ctx);
    }

    return CP.ACCEPT;
  },

  shouldProcess: function(ct, cl, org, ctx, mt, ext) CP.ACCEPT,

  _tmpDir: Services.dirsvc.get("TmpD", Ci.nsIFile),
  isTempScript: function(uri) {
    if (!(uri instanceof Ci.nsIFileURL))
      return false;

    let file = uri.file;
    return file.parent.equals(this._tmpDir) && file.leafName != "newscript.user.js";
  }
}

var NSGetFactory = XPCOMUtils.generateNSGetFactory([ScriptishService]);

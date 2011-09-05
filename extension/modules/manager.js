var EXPORTED_SYMBOLS = ["Scriptish_manager"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");

lazyImport(this, "resource://scriptish/prefmanager.js", ["Scriptish_prefRoot"]);
lazyImport(this, "resource://scriptish/logging.js", ["Scriptish_log"]);
lazyImport(this, "resource://scriptish/scriptish.js", ["Scriptish"]);

lazyUtil(this, "injectScripts");
lazyUtil(this, "isGreasemonkeyable");
lazyUtil(this, "isScriptRunnable");
lazyUtil(this, "isURLExcluded");
lazyUtil(this, "getWindowIDs");
lazyUtil(this, "windowEventTracker");
lazyUtil(this, "windowUnloader");

const tests = {
  _test_org: {
    "chrome": true,
    "about": true
  },
  _test_cl: {
    "chrome": true,
    "resource": true
  },
  _reg_userjs: /\.user\.js$/,
  isTempScript: function(uri) {
    if (!(uri instanceof Ci.nsIFileURL)) return false;

    var file = uri.file;
    return file.parent.equals(this._tmpDir) && file.leafName != "newscript.user.js";
  }
}

const Scriptish_manager = {
  setup: function(options) {
    options = options || {};

    var observer = {
      observe: (function(aSubject, aTopic, aData) {
        switch (aTopic) {
        case "chrome-document-global-created":
        case "content-document-global-created":
          Scriptish_manager.docReady_start.call(this, aSubject, options);
          break;
        }
      }).bind(this)
    };

    Services.obs.addObserver(observer, "content-document-global-created", false);
    Services.obs.addObserver(observer, "chrome-document-global-created", false);
  },

  docReady_start: function(safeWin, options) {
    // TODO: disable observer that calls this when Scriptish is disabled
    if (!Scriptish.enabled) return;

    // start tracking the window's progress
    Scriptish_windowEventTracker(safeWin);

    // try to get the windows href..
    let href = getURLForWin(safeWin);

    // if we don't have a href and the window is a frame, then wait until we do
    if (!href && safeWin.frameElement) {
      Scriptish_manager.waitForFrame.call(this, safeWin, options);
      return;
    }

    if (!href || "about:blank" == href) {
      if ("complete" != safeWin.document.readyState) {
        Scriptish_manager.waitForAboutBlank.call(this, safeWin, options);
        return;
      }
    }

    if (!Scriptish_isGreasemonkeyable(href)) return;

    // if the url is a excluded url then stop
    if (Scriptish_isURLExcluded(href)) return;

    this.docReady(href, safeWin, options);
  },

  docReady: function(href, safeWin, options) {
    // ignore window if it is not the same window used by options
    if (JSON.stringify(Scriptish_getWindowIDs(options.content))
        != JSON.stringify(Scriptish_getWindowIDs(safeWin)))
      return;

    var uri = Services.io.newURI(href, null, null);
    if (tests._reg_userjs.test(href) && !tests.isTempScript(uri)
        && "view-source" != uri.scheme) {
      options.global.sendAsyncMessage("Scriptish:InstallScriptURL", href);
    }

    var scripts = {
      "document-start": [],
      "document-end": [],
      "document-idle": [],
      "window-load": []
    };

    options.scripts.forEach(function(script) {
      if (Scriptish_isScriptRunnable(script, href, (safeWin === safeWin.top))) {
        scripts[script.runAt].push(script);
      }
    });

    let tracker = Scriptish_windowEventTracker(safeWin);
    let (windowLoaded = ("load" == tracker)) {
      if (windowLoaded || "DOMContentLoaded" == tracker) {
        scripts["document-start"] = scripts["document-start"].concat(scripts["document-end"], scripts["document-idle"]);
        scripts["document-end"] = scripts["document-idle"] = [];
      }

      if (windowLoaded) {
        scripts["document-start"] = scripts["document-start"].concat(scripts["window-load"]);
        scripts["window-load"] = [];
      }
    }

    if (scripts["document-end"].length || scripts["document-idle"].length) {
      safeWin.addEventListener("DOMContentLoaded", function() {
        //if (shouldNotRun()) return;

        // inject @run-at document-idle scripts
        if (scripts["document-idle"].length) {
          timeout(function() {
            //if (shouldNotRun()) return;
            Scriptish_injectScripts(extend(options, {
              scripts: scripts["document-idle"],
              url: href,
              safeWin: safeWin
            }));
          });
        }

        // inject @run-at document-end scripts
        Scriptish_injectScripts(extend(options, {
          scripts: scripts["document-end"],
          url: href,
          safeWin: safeWin
        }));
      }, true);
    }

    if (scripts["window-load"].length) {
      safeWin.addEventListener("load", function() {
        if (shouldNotRun()) return;
        // inject @run-at window-load scripts
        Scriptish_injectScripts(extend(options, {
          scripts: scripts["window-load"],
          url: href,
          safeWin: safeWin
        }));
      }, true);
    }

    // inject @run-at document-start scripts
    Scriptish_injectScripts(extend(options, {
      scripts: scripts["document-start"],
      url: href,
      safeWin: safeWin
    }));
  },

  waitForFrame: function(safeWin, options) {
    let self = this;
    safeWin.addEventListener("DOMContentLoaded", function _frame_loader() {
      // not perfect, but anyway
      let href = getURLForWin(safeWin);

      if (!href) return; // wait for it :p
      safeWin.removeEventListener("DOMContentLoaded", _frame_loader, false);
      Scriptish_manager.docReady_start.call(self, safeWin, options);
    }, false);
  },

  // not perfect, but anyway
  waitForAboutBlank: function(safeWin, options) {
    let self = this;

    // check if we have a url @ DOMContentLoaded
    function _loader1() {
      safeWin.removeEventListener("DOMContentLoaded", _loader1, false);

      let href = getURLForWin(safeWin);

      if (!href || "about:blank" == href) return; // not done yet..
      Scriptish_manager.docReady_start.call(self, safeWin, options);
      safeWin.document.removeEventListener("readystatechange", _loader2, false);
    }
    safeWin.addEventListener("DOMContentLoaded", _loader1, false);

    // check if we have a url @ readyState == "complete"
    function _loader2() {
      if ("complete" != safeWin.document.readyState) return;

      safeWin.removeEventListener("DOMContentLoaded", _loader1, false);
      safeWin.document.removeEventListener("readystatechange", _loader2, false);

      let href = getURLForWin(safeWin);
      Scriptish_manager.docReady_start.call(self, safeWin, options);

      // fake DOMContentLoaded to get things rolling
      var evt = safeWin.document.createEvent("Events");
      evt.initEvent("DOMContentLoaded", true, true);
      safeWin.dispatchEvent(evt);
    }
    safeWin.document.addEventListener("readystatechange", _loader2, false);
  }
};

function getURLForWin(safeWin) {
  return (safeWin.location.href
      || (safeWin.frameElement && safeWin.frameElement.src))
      || "";
}

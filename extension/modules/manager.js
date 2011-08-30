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
lazyUtil(this, "windowUnloader");

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

    // try to get the windows href..
    let href = (safeWin.location.href
        || (safeWin.frameElement && safeWin.frameElement.src))
        || "";

    // if we don't have a href and the window is a frame, then wait until we do
    if (!href && safeWin.frameElement) {
      Scriptish_manager.waitForFrame.call(this, safeWin, options);
      return;
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
    //Scriptish_log(JSON.stringify(Scriptish_getWindowIDs(safeWin)));

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
  },

  waitForFrame: function(safeWin, options) {
    let self = this;
    safeWin.addEventListener("DOMContentLoaded", function _frame_loader() {
      // not perfect, but anyway
      let href = (safeWin.location.href
          || (safeWin.frameElement && safeWin.frameElement.src));

      if (!href) return; // wait for it :p
      safeWin.removeEventListener("DOMContentLoaded", _frame_loader, false);
      Scriptish_manager.docReady_start.call(self, safeWin, options);

      // fake DOMContentLoaded to get things rolling
      var evt = safeWin.document.createEvent("Events");
      evt.initEvent("DOMContentLoaded", true, true);
      safeWin.dispatchEvent(evt);
    }, false);
  },
};

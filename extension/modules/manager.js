var EXPORTED_SYMBOLS = ["Scriptish_manager"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");

lazyImport(this, "resource://scriptish/prefmanager.js", ["Scriptish_prefRoot"]);
lazyImport(this, "resource://scriptish/logging.js", ["Scriptish_log"]);
lazyImport(this, "resource://scriptish/scriptish.js", ["Scriptish"]);
lazyUtil(this, "getWindowIDs");

let windows = {};

const Scriptish_manager = {
  setup: function(aContentScope) {
    var observer = {
      observe: (function(aSubject, aTopic, aData) {
        switch (aTopic) {
        case "chrome-document-global-created":
        case "content-document-global-created":
          this.docReady(aSubject);
          break;
        }
      }).bind(this)
    }

    Services.obs.addObserver(observer, "content-document-global-created", false);
    Services.obs.addObserver(observer, "chrome-document-global-created", false);
  },

  // TODO: remove chromeWin, or use it
  docReady: function(safeWin) {
    if (!Scriptish.enabled) return;

    let currentInnerWindowID = Scriptish_getWindowIDs(safeWin).innerID;
    windows[currentInnerWindowID] = {unloaders: []};

    let href = (safeWin.location.href
        || (safeWin.frameElement && safeWin.frameElement.src))
        || "";

    if (!href && safeWin.frameElement) {
      Scriptish_mananger.waitForFrame(safeWin);
      return;
    }

    if (!Scriptish.isGreasemonkeyable(href)) return;

    
  },

  waitForFrame: function(safeWin, chromeWin) {
    let self = this;
    safeWin.addEventListener("DOMContentLoaded", function _frame_loader() {
      // not perfect, but anyway
      let href = (safeWin.location.href
          || (safeWin.frameElement && safeWin.frameElement.src));

      if (!href) return; // wait for it :p
      safeWin.removeEventListener("DOMContentLoaded", _frame_loader, false);
      self.docReady(safeWin, chromeWin);

      // fake DOMContentLoaded to get things rolling
      var evt = safeWin.document.createEvent("Events");
      evt.initEvent("DOMContentLoaded", true, true);
      safeWin.dispatchEvent(evt);
    }, false);
  },
};

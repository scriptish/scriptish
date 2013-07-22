var EXPORTED_SYMBOLS = ["Scriptish_manager"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");

lazyImport(this, "resource://scriptish/prefmanager.js", ["Scriptish_prefRoot"]);
lazyImport(this, "resource://scriptish/logging.js", ["Scriptish_log"]);
lazyImport(this, "resource://scriptish/scriptish.js", ["Scriptish"]);
lazyImport(this, "resource://scriptish/config.js", ["Scriptish_config"]);

lazyUtil(this, "injectScripts");
lazyUtil(this, "isGreasemonkeyable");
lazyUtil(this, "isScriptRunnable");
lazyUtil(this, "isURLExcluded");
lazyUtil(this, "updateModifiedScripts");
lazyUtil(this, "windowEventTracker");
lazyUtil(this, "windowUnloader");

const { Class } = jetpack('sdk/core/heritage');
const { add } = jetpack('sdk/deprecated/observer-service');
const { getInnerId } = jetpack('sdk/window/utils');

const windowsTracked = Object.create(null);

const Scriptish_manager = Class({
  initialize: function() {
    const self = this;

    add("document-element-inserted", function(aDocument) {
      let win = aDocument.defaultView;
      if (!win) {
        return;
      }
      self.docReady_start(win);
    });

    add("content-document-global-created", self.docReady_start.bind(self));
    add("chrome-document-global-created", self.docReady_start.bind(self));
  },

  docReady_start: function(safeWin) {
    // TODO: disable observer that calls this when Scriptish is disabled
    if (!Scriptish.enabled)
      return;

    if (!('document' in safeWin && safeWin.document.documentElement)) {
      return;
    }

    let id = getInnerId(safeWin);
    if (windowsTracked[id]) {
      return;
    }
    windowsTracked[id] = true;

    // start tracking the window's progress
    Scriptish_windowEventTracker(safeWin);

    // try to get the windows href..
    let href = getURLForWin(safeWin);

    if (!Scriptish_isGreasemonkeyable(href))
      return;

    // if the url is a excluded url then stop
    if (Scriptish_isURLExcluded(href))
      return;

    this.docReady(href, safeWin);
  },

  docReady: function(href, safeWin) {
    let unsafeWin = safeWin.wrappedJSObject;
    let id = getInnerId(safeWin);

    let winClosed = false;    
    Scriptish_windowUnloader(function() {
      winClosed = true;
      delete windowsTracked[id];
    }, id);

    let tracker = Scriptish_windowEventTracker(safeWin);

    // rechecks values that can change at any moment
    function shouldNotRun() (
      winClosed || !Scriptish.enabled || !Scriptish_isGreasemonkeyable(href));

    // check if there are any modified scripts
    Scriptish_updateModifiedScripts(href, safeWin, shouldNotRun);

    // find matching scripts
    Scriptish_config.initScripts(href, (safeWin === safeWin.top), function(scripts) {
      let windowLoaded = ("load" == tracker); 

      if (windowLoaded || "DOMContentLoaded" == tracker) {
        scripts["document-start"] = scripts["document-start"].concat(scripts["document-end"], scripts["document-idle"]);
        scripts["document-end"] = scripts["document-idle"] = [];
      }

      if (windowLoaded || "readystate@complete" == tracker) {
        scripts["document-start"] = scripts["document-start"].concat(scripts["document-complete"]);
        scripts["document-complete"] = [];
      }

      if (windowLoaded) {
        scripts["document-start"] = scripts["document-start"].concat(scripts["window-load"]);
        scripts["window-load"] = [];
      }

      // inject @run-at document-start scripts
      Scriptish_injectScripts({
        scripts: scripts["document-start"],
        url: href,
        safeWin: safeWin
      });

      // handle @run-at document-end and document-idle
      if (scripts["document-end"].length || scripts["document-idle"].length) {
        safeWin.addEventListener("DOMContentLoaded", function listener() {
          safeWin.removeEventListener("DOMContentLoaded", listener, true);
          if (shouldNotRun())
            return;

          // inject @run-at document-end scripts
          Scriptish_injectScripts({
            scripts: scripts["document-end"],
            url: href,
            safeWin: safeWin
          });

          // handle @run-at document-idle
          if (scripts["document-idle"].length) {
            timeout(function() {
              if (shouldNotRun())
                return;

              // inject @run-at document-idle scripts
              Scriptish_injectScripts({
                scripts: scripts["document-idle"],
                url: href,
                safeWin: safeWin
              });
            });
          }
        }, true);
      }

      // handle @run-at document-complete
      if (scripts["document-complete"].length) {
        safeWin.document.addEventListener("readystatechange", function listener() {
          if ("complete" != safeWin.document.readyState)
            return;
          safeWin.document.removeEventListener("readystatechange", listener, true);
          if (shouldNotRun())
            return;

          // inject @run-at document-complete scripts
          Scriptish_injectScripts({
            scripts: scripts["document-complete"],
            url: href,
            safeWin: safeWin
          });
        }, true);
      }

      // handle @run-at window-load
      if (scripts["window-load"].length) {
        safeWin.addEventListener("load", function listener() {
          safeWin.removeEventListener("load", listener, true);
          if (shouldNotRun())
            return;

          // inject @run-at window-load scripts
          Scriptish_injectScripts({
            scripts: scripts["window-load"],
            url: href,
            safeWin: safeWin
          });
        }, true);
      }
    });
  }
});

function getURLForWin(safeWin) {
  return (safeWin.location.href
      || (safeWin.frameElement && safeWin.frameElement.src))
      || "";
}

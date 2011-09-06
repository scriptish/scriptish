var EXPORTED_SYMBOLS = ["Scriptish_updateModifiedScripts"];

Components.utils.import("resource://scriptish/constants.js");

lazyImport(this, "resource://scriptish/prefmanager.js", ["Scriptish_prefRoot"]);
lazyImport(this, "resource://scriptish/config.js", ["Scriptish_config"]);

lazyUtil(this, "injectScripts");
lazyUtil(this, "isScriptRunnable");

const docRdyStates = ["uninitialized", "loading", "loaded", "interactive", "complete"];

function Scriptish_updateModifiedScripts(href, safeWin, shouldNotRun) {
  if (!Scriptish_prefRoot.getValue("enableScriptRefreshing"))
    return;

  Scriptish_config.updateModifiedScripts(function(script) {
    if (shouldNotRun()
        || !Scriptish_isScriptRunnable(script, href, (safeWin === safeWin.top)))
      return;

    let rdyStateIdx = docRdyStates.indexOf(safeWin.document.readyState);
    function inject() {
      if (shouldNotRun()) return;
      Scriptish_injectScripts({
        scripts: [script],
        url: href,
        safeWin: safeWin
      });
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

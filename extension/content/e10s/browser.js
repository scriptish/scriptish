
(function(inc, tools, global){
  inc("resource://scriptish/constants.js", tools);
  const {lazyImport, lazyUtil, Services} = tools;
  lazyImport(global, "resource://scriptish/logging.js", ["Scriptish_log"]);
  lazyImport(global, "resource://scriptish/manager.js", ["Scriptish_manager"]);
  lazyImport(this, "resource://scriptish/utils/Scriptish_isURLExcluded.js", [
    "Scriptish_isURLExcluded",
    "Scriptish_addExcludes",
    "Scriptish_setExcludes",
    "Scriptish_getExcludes"
  ]);

  Scriptish_log("step 1a");
  addEventListener("load", function() {
    // Check if Scriptish has been updated/installed
    Services.scriptish.updateChk && setTimeout(function() {
      Services.scriptish.updateChk();
    }, 750);
  }, false);

  var mm = messageManager;

  mm.addMessageListener("Scriptish:GlobalExcludesUpdate", Scriptish_getExcludes);

  mm.loadFrameScript(
      "chrome://scriptish/content/e10s/browser-content.js",
      true); // no delay loading frame script
  Scriptish_log("step 1b");
})(Components.utils.import, {}, this);


(function(inc, tools, global){
  inc("resource://scriptish/constants.js", tools);
  const {lazyImport, lazyUtil, Services} = tools;
  lazyImport(global, "resource://scriptish/logging.js", ["Scriptish_log"]);
  lazyImport(global, "resource://scriptish/manager.js", ["Scriptish_manager"]);
  lazyImport(global, "resource://scriptish/config.js", ["Scriptish_config"]);

  lazyUtil(global, "installUri");

  Scriptish_log("step 1a");
  addEventListener("load", function() {
    // Check if Scriptish has been updated/installed
    inc("resource://scriptish/utils/Scriptish_updateChk.js");
  }, false);

  var mm = messageManager;

  mm.addMessageListener("Scriptish:FrameSetup", function() {
    return Scriptish_config.toJSON();
  });

  mm.addMessageListener("Scriptish:GetScriptContents", function({json}) {
    return Scriptish_config.getScriptById(json).textContent;
  });

  mm.loadFrameScript(
      "chrome://scriptish/content/e10s/browser-content.js",
      true); // no delay loading frame script
  Scriptish_log("step 1b");
})(Components.utils.import, {}, this);

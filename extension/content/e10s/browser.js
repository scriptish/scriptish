
(function(inc, tools, global){

inc("resource://scriptish/constants.js", tools);
const {lazyImport, lazyUtil, Services} = tools;
lazyImport(global, "resource://scriptish/logging.js", ["Scriptish_log"]);
lazyImport(global, "resource://scriptish/manager.js", ["Scriptish_manager"]);

Scriptish_log("step 1a");

messageManager.loadFrameScript("chrome://scriptish/content/e10s/browser-content.js", true);

addEventListener("load", function() {
  // Check if Scriptish has been updated/installed
  Services.scriptish.updateChk && setTimeout(function() {
    Services.scriptish.updateChk();
  }, 750);
}, false);


Scriptish_log("step 1b");

})(Components.utils.import, {}, this);

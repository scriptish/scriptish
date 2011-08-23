
var erik = "";
(function(inc, tools, global){

inc("resource://scriptish/constants.js", tools);
const {lazyImport, lazyUtil} = tools;
lazyImport(global, "resource://scriptish/logging.js", ["Scriptish_log"]);
lazyImport(global, "resource://scriptish/manager.js", ["Scriptish_manager"]);
lazyImport(global, "resource://scriptish/utils/Scriptish_isURLExcluded.js", [
  "Scriptish_setExcludes"
]);

Scriptish_log("step 2a");


function updateExcludes({json}) {
  Scriptish_setExcludes(json);
}

(function(configJSON) {
  Scriptish_setExcludes(configJSON.excludes);

  var scripts = configJSON.scripts;
})(sendSyncMessage("Scriptish:FrameSetup", ""));

addMessageListener("Scriptish:GlobalExcludesUpdate", updateExcludes);

Scriptish_manager.setup(content);


Scriptish_log("step 2b");
})(Components.utils.import, {}, this);


addEventListener("DOMContentLoaded", function() {
  //content.alert(erik);
}, true);

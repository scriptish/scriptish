
var erik = "";
(function(inc, tools, global){

inc("resource://scriptish/constants.js", tools);
const {lazyImport, lazyUtil} = tools;
lazyImport(global, "resource://scriptish/logging.js", ["Scriptish_log"]);
lazyImport(global, "resource://scriptish/manager.js", ["Scriptish_manager"]);
lazyImport(global, "resource://scriptish/utils/Scriptish_isURLExcluded.js", [
  "Scriptish_isURLExcluded",
  "Scriptish_addExcludes",
  "Scriptish_setExcludes",
  "Scriptish_getExcludes"
]);

Scriptish_log("step 2");

Scriptish_setExcludes(sendSyncMessage("Scriptish:GlobalExcludesUpdate"));
addMessageListener("Scriptish:GlobalExcludesUpdate", function({json}) {
  Scriptish_setExcludes(json);
});

Scriptish_manager.setup(content);

})(Components.utils.import, {}, this);


addEventListener("DOMContentLoaded", function() {
  //content.alert(erik);
}, true);

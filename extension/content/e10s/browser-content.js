
(function(inc, tools, global){

inc("resource://scriptish/constants.js", tools);
const {lazyImport, lazyUtil} = tools;
lazyImport(global, "resource://scriptish/logging.js", ["Scriptish_log"]);
lazyImport(global, "resource://scriptish/manager.js", ["Scriptish_manager"]);

Scriptish_log("step 2");

Scriptish_manager.setup(content);

})(Components.utils.import, {}, this);


addEventListener("DOMContentLoaded", function() {
  //content.alert("window");
}, true);

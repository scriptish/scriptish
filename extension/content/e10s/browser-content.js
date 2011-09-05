(function(inc, tools, global){
inc("resource://scriptish/constants.js", tools);
const {lazyImport, lazyUtil} = tools;
lazyImport(global, "resource://scriptish/logging.js", ["Scriptish_log"]);
lazyImport(global, "resource://scriptish/manager.js", ["Scriptish_manager"]);
lazyImport(global, "resource://scriptish/script/simple-script.js", ["SimpleScript"]);
lazyImport(global, "resource://scriptish/utils/Scriptish_isURLExcluded.js", [
  "Scriptish_setExcludes"
]);

global.Scriptish_installUri = function(aURL) {
  sendAsyncMessage("Scriptish:InstallScriptURL", aURL);
}

function updateExcludes({json}) {
  Scriptish_setExcludes(json);
}

var configJSON = sendSyncMessage("Scriptish:FrameSetup", "")[0];
var scripts;

(function(configJSON) {
  Scriptish_setExcludes(configJSON.excludes);

  scripts = configJSON.scripts.map(function(i) {
    return SimpleScript.loadFromJSON(i);
  });

  Scriptish_manager.setup({
    global: global,
    content: content,
    scripts: scripts
  });
})(configJSON);

addMessageListener("Scriptish:GlobalExcludesUpdate", updateExcludes);
addMessageListener("Scriptish:ScriptInstalled", function({json}) {
  scripts.push(SimpleScript.loadFromJSON(json));
});
addMessageListener("Scriptish:ScriptChanged", function({json}) {
  var script = SimpleScript.loadFromJSON(json);
  for (var i = scripts.length - 1; ~i; i--) {
    if (scripts[i].id == script.id) {
      scripts[i] = script;
      return;
    }
  }
});
})(Components.utils.import, {}, this);


addEventListener("load", function() {
  ContextHandler.registerType("userscript-install", function(popupState, element) {
    if (/\.user\.js$/.test(element.href)) {
      return true;
    }
    return false;
  });
}, true);

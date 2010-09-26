
Components.utils.import("resource://scriptish/addonprovider.js");
Components.utils.import("resource://scriptish/utils/Scriptish_stringBundle.js");

window.addEventListener("load", function() {
  document.getElementById("category-userscripts")
      .setAttribute("name", Scriptish_stringBundle("userscripts"));
}, false);

window.addEventListener("unload", function() {
  var tools = {};
  Cu.import("resource://scriptish/constants.js", tools);

  var config = tools.gmService.config;
  var scripts = config.scripts;

  for (var i = scripts.length - 1; i >= 0; i--) {
    if (scripts[i].needsUninstall) config.uninstall(i);
  }
}, false);

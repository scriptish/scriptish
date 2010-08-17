
Cu.import("resource://scriptish/addonprovider.js");

(function() {

function GM_ExtendedStringBundle(aBase) {
  this.basebundle = aBase;
  this.strings = {};
}

GM_ExtendedStringBundle.prototype = {
  strings: null,
  basebundle: null,

  GetStringFromName: function(aName) {
    if (aName in this.strings)
      return this.strings[aName];
    return this.basebundle.GetStringFromName(aName);
  },

  formatStringFromName: function(aName, aArgs, aLength) {
    return this.basebundle.formatStringFromName(aName, aArgs, aLength);
  }
};

var GM_bundle = new GM_ExtendedStringBundle(window.gStrings.ext);
GM_bundle.strings["header-userscript"] = "User Scripts";
window.gStrings.ext = GM_bundle;

})();

window.addEventListener("unload", function() {
  var tools = {};
  Cu.import("resource://scriptish/constants.js", tools);

  var config = tools.gmService.config;
  var scripts = config.scripts;

  for (var i = scripts.length - 1; i >= 0; i--) {
    if (scripts[i].needsUninstall) config.uninstall(scripts[i]);
  }
}, false);

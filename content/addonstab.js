
Components.utils.import("resource://scriptish/addonprovider.js");

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

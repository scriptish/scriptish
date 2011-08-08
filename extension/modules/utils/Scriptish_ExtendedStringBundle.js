var EXPORTED_SYMBOLS = ["Scriptish_ExtendedStringBundle"];

function Scriptish_ExtendedStringBundle(aBase) {
  this.basebundle = aBase;
  this.strings = {};
}
Scriptish_ExtendedStringBundle.prototype = {
  GetStringFromName: function(aName) {
    if (aName in this.strings) return this.strings[aName];
    return this.basebundle.GetStringFromName(aName);
  },
  formatStringFromName: function(aName, aArgs, aLength) (
      this.basebundle.formatStringFromName(aName, aArgs, aLength))
}

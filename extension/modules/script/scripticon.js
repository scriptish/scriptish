var EXPORTED_SYMBOLS = ["ScriptIcon"];
Components.utils.import("resource://scriptish/script/scriptdependency.js");
Components.utils.import("resource://scriptish/utils/Scriptish_getUriFromFile.js");

function ScriptIcon() {
  ScriptDependency.apply(this, [].concat(["icon"], Array.slice(arguments)));
  this._dataURI = null;
}
ScriptIcon.prototype = new ScriptDependency();
ScriptIcon.prototype.constructor = ScriptIcon;
ScriptIcon.prototype.hasDownloadURL = function() !!this._downloadURL;
ScriptIcon.prototype.__defineGetter__("filename", function() (
    this._filename || this._dataURI));
ScriptIcon.prototype.__defineGetter__("fileURL", function() {
  if (this._dataURI) return this._dataURI;
  if (this._filename) return Scriptish_getUriFromFile(this._file).spec;
  return null;
});
ScriptIcon.prototype.__defineSetter__("fileURL", function(aURL) {
  // is icon url a data: url?
  if (/^data:/i.test(aURL)) return this._dataURI = aURL;
  return this._filename = aURL;
});

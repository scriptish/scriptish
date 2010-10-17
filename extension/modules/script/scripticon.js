var EXPORTED_SYMBOLS = ["ScriptIcon"];
Components.utils.import("resource://scriptish/constants.js");
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
  return "chrome://scriptish/skin/third-party/uso_medium.png";
});
ScriptIcon.prototype.__defineSetter__("fileURL", function(aURL) {
  // is icon url a data: url?
  if (/^data:/i.test(aURL)) return this._dataURI = aURL;
  return this._filename = aURL;
});
ScriptIcon.prototype.setIcon = function(aVal, aURI) {
  // aceept data uri schemes for image MIME types
  if (/^data:image\//i.test(aVal)) return this._dataURI = aVal;
  if (/^data:/i.test(aVal)) throw new Error("Invalid data: URL for @icon");
  try {
    this._downloadURL = NetUtil.newURI(aVal, null, aURI).spec;
  } catch (e) {
    throw new Error("Invalid URL for @icon");
  }
}
ScriptIcon.prototype.isImage = function(aMIMEType) /^image\//i.test(aMIMEType);

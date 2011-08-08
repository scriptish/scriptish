var EXPORTED_SYMBOLS = ["ScriptIcon"];
Components.utils.import("resource://scriptish/constants.js");
lazyImport(this, "resource://scriptish/script/scriptdependency.js", ["ScriptDependency"]);
lazyUtil(this, "getUriFromFile");
lazyUtil(this, "stringBundle");

function ScriptIcon() {
  ScriptDependency.apply(this, arguments);
  this._dataURI = null;
}
ScriptIcon.prototype = new ScriptDependency();
ScriptIcon.prototype.constructor = ScriptIcon;
ScriptIcon.prototype.DEFAULT_ICON_URL = "chrome://scriptish/skin/third-party/uso_medium.png";
ScriptIcon.prototype.reset = function() {
  var script = this._script;
  if (this === script.icon) {
    script.icon = new ScriptIcon(script);
  } else if (this === script.icon64) {
    script.icon64 = new ScriptIcon(script);
  }
};
ScriptIcon.prototype.hasDownloadURL = function() !!this._downloadURL;
ScriptIcon.prototype.__defineGetter__("filename", function() (
    this._filename || this._dataURI));
ScriptIcon.prototype.__defineGetter__("fileURL", function() {
  if (this._dataURI) return this._dataURI;
  if (this._filename) return Scriptish_getUriFromFile(this._file).spec;
  return this.DEFAULT_ICON_URL;
});
ScriptIcon.prototype.__defineSetter__("fileURL", function(aURL) {
  // is icon url a data: url?
  if (/^data:/i.test(aURL)) return this._dataURI = aURL;
  return this._filename = aURL;
});
ScriptIcon.prototype.setIcon = function(aVal, aURI) {
  // aceept data uri schemes for image MIME types
  if (/^data:image\//i.test(aVal)) return this._dataURI = aVal;
  if (/^data:/i.test(aVal))
    throw new Error(Scriptish_stringBundle("error.icon.dataURL"));
  try {
    this._downloadURL = NetUtil.newURI(aVal, null, aURI).spec;
  } catch (e) {
    throw new Error(Scriptish_stringBundle("error.icon.URL"));
  }
}
ScriptIcon.prototype.isImage = function(aMIMEType) /^image\//i.test(aMIMEType);

var EXPORTED_SYMBOLS = ["ScriptResource"];
Components.utils.import("resource://scriptish/constants.js");
lazyImport(this, "resource://scriptish/script/scriptdependency.js", ["ScriptDependency"]);
lazyUtil(this, "getBinaryContents");

function ScriptResource() {
  ScriptDependency.apply(this, arguments);
  this._name = null;
}
ScriptResource.prototype = new ScriptDependency();
ScriptResource.prototype.constructor = ScriptResource;
ScriptResource.prototype.__defineGetter__("name", function() this._name);
ScriptResource.prototype.__defineGetter__("dataContent", function() {
  var binaryContents = Scriptish_getBinaryContents(this._file);
  var mimetype = this._mimetype;

  if (this._charset && this._charset.length > 0)
    mimetype += ";charset=" + this._charset;

  return "data:" + mimetype + ";base64," +
      encodeURIComponent(btoa(binaryContents));
});

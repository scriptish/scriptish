var EXPORTED_SYMBOLS = ["ScriptCSS"];
Components.utils.import("resource://scriptish/script/scriptdependency.js");

function ScriptCSS() {
  ScriptDependency.apply(this, arguments);
}
ScriptCSS.prototype = new ScriptDependency();
ScriptCSS.prototype.constructor = ScriptCSS;

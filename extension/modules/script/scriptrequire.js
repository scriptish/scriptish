var EXPORTED_SYMBOLS = ["ScriptRequire"];
Components.utils.import("resource://scriptish/script/scriptdependency.js");

function ScriptRequire() {
  ScriptDependency.apply(this, [].concat(["require"], Array.slice(arguments)));
}
ScriptRequire.prototype = new ScriptDependency();
ScriptRequire.prototype.constructor = ScriptRequire;

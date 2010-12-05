var EXPORTED_SYMBOLS = ["GM_ScriptStorage"];

const Cu = Components.utils;
Cu.import("resource://scriptish/prefmanager.js");
Cu.import("resource://scriptish/utils/Scriptish_stringBundle.js");

function GM_ScriptStorage(script) {
  this.prefMan = new Scriptish_PrefManager(script.prefroot);
}

GM_ScriptStorage.prototype.setValue = function(name, val) {
  if (2 !== arguments.length) {
    throw new Error(Scriptish_stringBundle("error.api.noSecondArgValue"));
  }

  this.prefMan.setValue(name, val);
};

GM_ScriptStorage.prototype.getValue = function(name, defVal) {
  return this.prefMan.getValue(name, defVal);
};

GM_ScriptStorage.prototype.deleteValue = function(name) {
  return this.prefMan.remove(name);
};

GM_ScriptStorage.prototype.listValues = function() {
  return this.prefMan.listValues();
};

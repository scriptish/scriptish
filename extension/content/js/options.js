"use strict";

Components.utils.import("resource://scriptish/scriptish.js");
Components.utils.import("resource://scriptish/logging.js");
Components.utils.import("resource://scriptish/utils/Scriptish_localizeDOM.js");
Components.utils.import("resource://scriptish/utils/Scriptish_stringBundle.js");

function $(aID) document.getElementById(aID);

function changeEditor() {
  var tools = {};
  Components.utils.import("resource://scriptish/utils/Scriptish_getEditor.js", tools);
  tools.Scriptish_getEditor(window, true);
}

function saveExcludes() {
  Scriptish.getConfig(function(config) (
    config.excludes = $("excludes").value.match(/.+/g)));
  Scriptish.notify(null, "scriptish-preferences-change", true);
}

Scriptish_localizeOnLoad(this);

addEventListener("load", function init() {
  removeEventListener("load", init, false);

  let instantApply = $('pref-editor').instantApply;

  // init custom excludes preferences
  let excludes = $("excludes");
  Scriptish.getConfig(function(config) (
    excludes.value = config.excludes.join("\n")));
  if (instantApply) {
    excludes.addEventListener("input", saveExcludes, false);
  }
  else {
    addEventListener("dialogaccept", saveExcludes, true);
  }
}, false);

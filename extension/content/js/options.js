"use strict";

Components.utils.import("resource://scriptish/constants.js");

lazyImport(this, "resource://scriptish/config.js", ["Scriptish_config"]);
lazyImport(this, "resource://scriptish/scriptish.js", ["Scriptish"]);
lazyImport(this, "resource://scriptish/utils/Scriptish_localizeDOM.js", ["Scriptish_localizeOnLoad"]);

lazyUtil(this, "getEditor");
lazyUtil(this, "stringBundle");

function $(aID) document.getElementById(aID);

function changeEditor() Scriptish_getEditor(window, true);

function saveExcludes() {
  Scriptish_config.excludes = $("excludes").value.match(/.+/g);
  Scriptish.notify(null, "scriptish-preferences-change", true);
}

Scriptish_localizeOnLoad(this);

addEventListener("load", function init() {
  removeEventListener("load", init, false);

  let instantApply = $("pref-editor").instantApply;

  // init custom excludes preferences
  let excludes = $("excludes");
  excludes.value = Scriptish_config.excludes.join("\n");
  if (instantApply) {
    excludes.addEventListener("input", saveExcludes, false);
  }
  else {
    addEventListener("dialogaccept", saveExcludes, true);
  }
}, false);

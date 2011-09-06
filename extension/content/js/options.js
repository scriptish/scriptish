"use strict";

Components.utils.import("resource://scriptish/constants.js");

lazyImport(this, "resource://scriptish/config.js", ["Scriptish_config"]);
lazyImport(this, "resource://scriptish/scriptish.js", ["Scriptish"]);
lazyImport(this, "resource://scriptish/utils/Scriptish_localizeDOM.js", ["Scriptish_localizeOnLoad"]);
lazyImport(this, "resource://scriptish/utils/Scriptish_isURLExcluded.js", [
  "Scriptish_isURLExcluded",
  "Scriptish_addExcludes",
  "Scriptish_setExcludes",
  "Scriptish_getExcludes"
]);

lazyUtil(this, "getEditor");
lazyUtil(this, "sendAsyncE10SMessage");
lazyUtil(this, "stringBundle");

function $(aID) document.getElementById(aID);

function changeEditor() Scriptish_getEditor(window, true);

function saveExcludes() {
  Scriptish_setExcludes($("excludes").value.match(/.+/g));
  if (e10s)
    Scriptish_sendAsyncE10SMessage("Scriptish:GlobalExcludesUpdate", Scriptish_getExcludes());
  Scriptish.notify(null, "scriptish-preferences-change", true);
}

Scriptish_localizeOnLoad(this);

addEventListener("load", function init() {
  removeEventListener("load", init, false);

  let instantApply = $("pref-editor").instantApply;

  // init custom excludes preferences
  let excludes = $("excludes");
  excludes.value = Scriptish_getExcludes().join("\n");
  if (instantApply) {
    excludes.addEventListener("input", saveExcludes, false);
  }
  else {
    addEventListener("dialogaccept", saveExcludes, true);
  }
}, false);

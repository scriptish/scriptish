"use strict";

Components.utils.import("resource://scriptish/constants.js");

lazyImport(this, "resource://scriptish/config.js", ["Scriptish_config"]);
lazyImport(this, "resource://scriptish/scriptish.js", ["Scriptish"]);
lazyImport(this, "resource://scriptish/prefmanager.js", ["Scriptish_prefRoot", "Scriptish_PrefManager"]);
lazyImport(this, "resource://scriptish/utils/Scriptish_localizeDOM.js", ["Scriptish_localizeOnLoad"]);
lazyImport(this, "resource://scriptish/utils/Scriptish_isURLExcluded.js", [
  "Scriptish_isURLExcluded",
  "Scriptish_addExcludes",
  "Scriptish_setExcludes",
  "Scriptish_getExcludes"
]);

lazyUtil(this, "getEditor");
lazyUtil(this, "stringBundle");

const RE_scriptishPrefix = /^extensions\.scriptish\./;

function $(aID) document.getElementById(aID);

function changeEditor() Scriptish_getEditor(window, true);

function saveExcludes() {
  Scriptish_setExcludes($("excludes").value.match(/.+/g));
  Scriptish.notify(null, "scriptish-preferences-change", true);
}

function checkSync() {
  let Scriptish_SyncManager = new Scriptish_PrefManager(null, true);
  let prefSyncEnabled;

  try {
    prefSyncEnabled = Services.prefs.getBoolPref("services.sync.engine.prefs");
  }
  catch(e) {
    prefSyncEnabled = false;
  }

  // Do nothing if pref syncing isn't enabled
  if (!prefSyncEnabled) {
    return;
  }

  // Sync "common" preferences?
  let syncCommonPrefName = "sync.ScriptishPrefs.common";
  let syncCommon = Scriptish_prefRoot.getValue(syncCommonPrefName, false);

  // Sync the editor preference?
  let syncEditorPrefName = "sync.ScriptishPrefs.editor";
  let syncEditor = Scriptish_prefRoot.getValue(syncEditorPrefName, false);

  // Collect preferences used in Options... considering these "common" prefs.
  // Others can be added to the prefNames array as needed.
  let prefNodes = document.getElementsByTagName("preference");
  let prefNames = [];
  for (let i = 0, e = prefNodes.length; i < e; ++i) {
    prefNames.push(prefNodes[i].name.replace(RE_scriptishPrefix, ""));
  }

  // Exclude the sync-controlling preferences
  let syncCommonIndex = prefNames.indexOf(syncCommonPrefName);
  if (syncCommonIndex > -1) prefNames.splice(syncCommonIndex, 1);

  let syncEditorIndex = prefNames.indexOf(syncEditorPrefName);
  if (syncEditorIndex > -1) prefNames.splice(syncEditorIndex, 1);

  // Exclude the editor pref from the general list.  The editor is handled
  // separately since the path might vary between systems.
  let editorIndex = prefNames.indexOf("editor");
  if (editorIndex > -1) prefNames.splice(editorIndex, 1);

  // Either sync or unsync all eligible preferences
  let syncOp =
      (syncCommon ? Scriptish_SyncManager.sync : Scriptish_SyncManager.unsync)
      .bind(Scriptish_SyncManager);
  for (let i = 0, e = prefNames.length; i < e; ++i) {
    syncOp(prefNames[i]);
  }

  // Either sync or unsync the editor preference
  syncOp =
      (syncEditor ? Scriptish_SyncManager.sync : Scriptish_SyncManager.unsync)
      .bind(Scriptish_SyncManager);
  syncOp("editor");
}

Scriptish_localizeOnLoad(window);

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

  // Check sync options to determine whether to add or remove sync service vals.
  // NOTE: Delaying to allow the sync-controlling prefs to update.
  if (instantApply) {
    addEventListener("unload", function() { timeout(checkSync) }, false);
  }
  else {
    addEventListener("dialogaccept", function() { timeout(checkSync) }, true);
  }
}, false);

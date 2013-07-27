"use strict";

var EXPORTED_SYMBOLS = ["Scriptish_openInEditor"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
const { alert } = jetpack("scriptish/alert");
lazyImport(this, "resource://scriptish/prefmanager.js", ["Scriptish_prefRoot"]);
lazyUtil(this, "getEditor");
lazyUtil(this, "launchApplicationWithDoc");
lazyUtil(this, "stringBundle");

function Scriptish_openInEditor(script, parentWindow) {
  var file = script.editFile;
  var editor = Scriptish_getEditor(parentWindow);
  // The user did not choose an editor.
  if (!editor) return;

  try {
    if ("Scratchpad" == editor)
      openScriptInScratchpad(parentWindow, file);
    else
      Scriptish_launchApplicationWithDoc(editor, file);
  }
  catch (e) {
    // Something may be wrong with the editor the user selected. Remove it.
    alert(Scriptish_stringBundle("editor.couldNotLaunch") + "\n" + e);
    Scriptish_prefRoot.remove("editor");
    throw e;
  }
}

function openScriptInScratchpad(parentWindow, file) {
  let spWin = (parentWindow.Scratchpad
      || Services.wm.getMostRecentWindow("navigator:browser").Scratchpad)
      .openScratchpad();

  spWin.addEventListener("load", function spWinLoaded() {
    spWin.removeEventListener("load", spWinLoaded, false);

    let Scratchpad = spWin.Scratchpad;
    Scratchpad.setFilename(file.path);
    Scratchpad.addObserver({
      onReady: function() {
        Scratchpad.removeObserver(this);
        Scratchpad.importFromFile.call(Scratchpad, file);
      }
    });
  }, false);
}

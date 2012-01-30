"use strict";

var EXPORTED_SYMBOLS = ["Scriptish_openInEditor"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
lazyImport(this, "resource://scriptish/prefmanager.js", ["Scriptish_prefRoot"]);
lazyUtil(this, "getEditor");
lazyUtil(this, "launchApplicationWithDoc");
lazyUtil(this, "alert");
lazyUtil(this, "stringBundle");

function Scriptish_openInEditor(script, parentWindow) {
  var file = script.editFile;
  var editor = Scriptish_getEditor(parentWindow);
  // The user did not choose an editor.
  if (!editor) return;

  try {
    if ("Scratchpad" == editor) {
      openScriptInScratchpad(script, parentWindow, file);
    }
    else {
      Scriptish_launchApplicationWithDoc(editor, file);
    }
  }
  catch (e) {
    // Something may be wrong with the editor the user selected. Remove it.
    Scriptish_alert(Scriptish_stringBundle("editor.couldNotLaunch") + "\n" + e);
    Scriptish_prefRoot.remove("editor");
    throw e;
  }
}

function openScriptInScratchpad(script, parentWindow, file) {
    let spWin = (parentWindow.Scratchpad
            || Services.wm.getMostRecentWindow("navigator:browser").Scratchpad)
            .openScratchpad();

        spWin.addEventListener("load", function spWinLoaded() {
          spWin.removeEventListener("load", spWinLoaded, false);

          let Scratchpad = spWin.Scratchpad;
          setFilenameForScratchpadWindow(spWin, file);

          if (Scratchpad.addObserver) {
            Scratchpad.addObserver({"onReady": importFileForScratchpad.bind(null, spWin, file)});
          }
          else {
            importFileForScratchpad(spWin, file);
          }
        }, false);
}

function setFilenameForScratchpadWindow(spWin, file) {
    let Scratchpad = spWin.Scratchpad;

    // Set the filename
    if (Scratchpad.setFilename) {
      Scratchpad.setFilename(file.path);
    }
    else {
      spWin.document.title = Scratchpad.filename = file.path;
    }
}

function importFileForScratchpad(spWin, file) {
    let Scratchpad = spWin.Scratchpad;

    // Open the user script in Scratchpad
    // NOTE: Resetting the "undo/redo" state on our own until Scratchpad
    // handles it.  We want to ensure user scripts don't get screwed up.
    // See: https://bug684546.bugzilla.mozilla.org/
    Scratchpad.importFromFile(file, false, function() {
      let spEditor = Scratchpad.editor;

      // For the Orion editor...
      if (spEditor && spEditor._undoStack && spEditor._undoStack.reset) {
        spEditor._undoStack.reset();
        return;
      }

      // If not using Orion, pick out the proper editor
      // Scratchpad in FF6 still uses 'textbox'
      if (spEditor && spEditor._editor)
        spEditor = spEditor._editor;
      else if (Scratchpad.textbox)
        spEditor = Scratchpad.textbox.editor;

      if (spEditor
          && spEditor.resetModificationCount
          && spEditor.transactionManager
          && spEditor.transactionManager.clear) {
        spEditor.resetModificationCount();
        spEditor.transactionManager.clear();
      }
    });
}

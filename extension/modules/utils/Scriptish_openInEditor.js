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
      let spWin = (parentWindow.Scratchpad
          || Services.wm.getMostRecentWindow("navigator:browser").Scratchpad)
          .openScratchpad();
      spWin.addEventListener("load", function spWinLoaded() {
        spWin.removeEventListener("load", spWinLoaded, false);
        spWin.document.title = spWin.Scratchpad.filename = file.path;
        spWin.Scratchpad.importFromFile(file, false, function() {
          let spEditor = spWin.Scratchpad.editor;
          if (spEditor._undoStack && spEditor._undoStack.reset) {
            // Reset "undo/redo" for the Orion editor
            spEditor._undoStack.reset();
          } else if (spEditor._editor
              && spEditor._editor.resetModificationCount
              && spEditor._editor.transactionManager
              && spEditor._editor.transactionManager.clear) {
            // Reset "undo/redo" for the textarea editor
            spEditor._editor.resetModificationCount();
            spEditor._editor.transactionManager.clear();
          }
        });
      }, false);
    }
    else {
      Scriptish_launchApplicationWithDoc(editor, file);
    }
  } catch (e) {
    // Something may be wrong with the editor the user selected. Remove it.
    Scriptish_alert(Scriptish_stringBundle("editor.couldNotLaunch") + "\n" + e);
    Scriptish_prefRoot.remove("editor");
    throw e;
  }
}

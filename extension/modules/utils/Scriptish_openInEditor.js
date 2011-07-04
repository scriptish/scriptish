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
    Scriptish_launchApplicationWithDoc(editor, file);
  } catch (e) {
    // Something may be wrong with the editor the user selected. Remove so that
    // next time they can pick a different one.
    Scriptish_alert(Scriptish_stringBundle("editor.couldNotLaunch") + "\n" + e);
    Scriptish_prefRoot.remove("editor");
    throw e;
  }
}

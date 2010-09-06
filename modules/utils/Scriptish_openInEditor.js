
// JSM exported symbols
var EXPORTED_SYMBOLS = ["Scriptish_openInEditor"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
Cu.import("resource://scriptish/prefmanager.js");
Cu.import("resource://scriptish/utils/Scriptish_getEditor.js");
Cu.import("resource://scriptish/utils/Scriptish_launchApplicationWithDoc.js");
Cu.import("resource://scriptish/utils/Scriptish_alert.js");
Cu.import("resource://scriptish/utils/Scriptish_stringBundle.js");

const Scriptish_openInEditor = function(script, parentWindow) {
  var file = script.editFile;
  var editor = Scriptish_getEditor(parentWindow);
  if (!editor) {
    // The user did not choose an editor.
    return;
  }

  try {
    Scriptish_launchApplicationWithDoc(editor, file);
  } catch (e) {
    // Something may be wrong with the editor the user selected. Remove so that
    // next time they can pick a different one.
    Scriptish_alert(Scriptish_stringBundle.GetStringFromName("editor.could_not_launch") + "\n" + e);
    Scriptish_prefRoot.remove("editor");
    throw e;
  }
}

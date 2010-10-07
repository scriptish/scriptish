var EXPORTED_SYMBOLS = ["Scriptish_getEditor"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
Cu.import("resource://scriptish/prefmanager.js");
Cu.import("resource://scriptish/logging.js");
Cu.import("resource://scriptish/utils/Scriptish_alert.js");
Cu.import("resource://scriptish/utils/Scriptish_stringBundle.js");

const Scriptish_getEditor = function(parentWindow, change) {
  var editorPath = Scriptish_prefRoot.getValue("editor");

  if (!change && editorPath) {
    Scriptish_log("Found saved editor preference: " + editorPath);

    var editor = Cc["@mozilla.org/file/local;1"]
                 .createInstance(Ci.nsILocalFile);
    editor.followLinks = true;
    editor.initWithPath(editorPath);

    // make sure the editor preference is still valid
    if (editor.exists() && editor.isExecutable()) {
      return editor;
    } else {
      Scriptish_log("Editor preference either does not exist or is not executable");
      Scriptish_prefRoot.remove("editor");
    }
  }

  // Ask the user to choose a new editor. Sometimes users get confused and
  // pick a non-executable file, so we set this up in a loop so that if they do
  // that we can give them an error and try again.
  while (true) {
    Scriptish_log("Asking user to choose editor...");
    var nsIFilePicker = Ci.nsIFilePicker;
    var filePicker = Cc["@mozilla.org/filepicker;1"]
                         .createInstance(nsIFilePicker);

    filePicker.init(
        parentWindow,
        Scriptish_stringBundle("editor.prompt"),
        nsIFilePicker.modeOpen);
    filePicker.appendFilters(nsIFilePicker.filterApplication);
    filePicker.appendFilters(nsIFilePicker.filterAll);

    if (filePicker.show() != nsIFilePicker.returnOK) {
      // The user canceled, return null.
      Scriptish_log("User canceled file picker dialog");
      return null;
    }

    Scriptish_log("User selected: " + filePicker.file.path);

    if (filePicker.file.exists() && filePicker.file.isExecutable()) {
      Scriptish_prefRoot.setValue("editor", filePicker.file.path);
      return filePicker.file;
    } else {
      Scriptish_alert(Scriptish_stringBundle("editor.please_pick_executable"));
    }
  }
}

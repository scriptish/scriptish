var EXPORTED_SYMBOLS = ["Scriptish_getEditor"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
lazyImport(this, "resource://scriptish/prefmanager.js", ["Scriptish_prefRoot"]);
lazyImport(this, "resource://scriptish/logging.js", ["Scriptish_log"]);
lazyUtil(this, "alert");
lazyUtil(this, "stringBundle");

const Scriptish_getEditor = function(parentWindow, change) {
  var editorPath = Scriptish_prefRoot.getValue("editor");

  if (!change && editorPath) {
    Scriptish_log("Found saved editor preference: " + editorPath);

    var editor = Instances.lf;
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
    var fp = Instances.fp;
    fp.init(
        parentWindow,
        Scriptish_stringBundle("editor.prompt"),
        nsIFilePicker.modeOpen);
    fp.appendFilters(nsIFilePicker.filterApplication);
    fp.appendFilters(nsIFilePicker.filterAll);

    if (fp.show() != nsIFilePicker.returnOK)
      return null;

    Scriptish_log("User selected: " + fp.file.path);

    if (fp.file.exists() && fp.file.isExecutable()) {
      Scriptish_prefRoot.setValue("editor", fp.file.path);
      return fp.file;
    } else {
      Scriptish_alert(Scriptish_stringBundle("editor.pleasePickExecutable"));
    }
  }
}

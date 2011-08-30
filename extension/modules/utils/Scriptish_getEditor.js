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

    // Check if Scratchpad
    if ("Scratchpad" == editorPath)
      return editorPath;

    var editor = Instances.lf;
    editor.followLinks = true;
    try {
      editor.initWithPath(editorPath);
    } catch (e) {
      editor = null;
    }

    // make sure the editor preference is still valid
    if (editor && editor.exists() && editor.isExecutable()) {
      return editor;
    } else {
      Scriptish_log("Editor preference either does not exist or is not executable");
      Scriptish_prefRoot.reset("editor");
    }
  }

  // Ask the user to choose a new editor. Sometimes users get confused and
  // pick a non-executable file, so we set this up in a loop so that if they do
  // that we can give them an error and try again.
  while (true) {
    Scriptish_log("Asking user to choose editor...");

    // Ask if the user wants to use Scratchpad
    var sp = Services.prompt;
    var flags = sp.BUTTON_POS_0 * sp.BUTTON_TITLE_IS_STRING
        + sp.BUTTON_POS_1 * sp.BUTTON_TITLE_IS_STRING;

    // Note: confirmEx always returns 1 if prompt is closed w/ the close button,
    //       so we need to keep the negative answer at button index 1.
    var answer = sp.confirmEx(
        null,
        Scriptish_stringBundle("editor.useScratchpad"),
        Scriptish_stringBundle("editor.useScratchpad"),
        flags,
        Scriptish_stringBundle("editor.useScratchpad.yes"),
        Scriptish_stringBundle("editor.useScratchpad.no"),
        "",
        null,
        {value:false});

    // The user answered Yes.  Set 'editor' back to the default ("Scratchpad").
    if (0 === answer) {
      Scriptish_prefRoot.reset("editor");
      return Scriptish_prefRoot.getValue("editor");
    }

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

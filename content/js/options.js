
Components.utils.import("resource://scriptish/prefmanager.js");
Components.utils.import("resource://scriptish/utils/Scriptish_stringBundle.js");

window.addEventListener("load", function() {
  var d = document;
  var $ = function(aID) d.getElementById(aID);
  var tmp;

  tmp = Scriptish_stringBundle("prefWindow.titleWin");
  $("scriptish-options-dialog").setAttribute("title", "Scriptish - " + tmp);
  $("scriptish-header").setAttribute("description", tmp);
  $("caption-editor")
      .setAttribute("label", Scriptish_stringBundle("options.editor"));
  $("btn-editor")
      .addEventListener("command", Scriptish_getEditor, false);
  $("label-editor")
      .setAttribute("value", Scriptish_stringBundle("options.changeEditor"));
  $("caption-uninstall")
      .setAttribute("label", Scriptish_stringBundle("Uninstall"));
  tmp = $("check-uninstall")
  tmp.setAttribute("label", Scriptish_stringBundle("AlsoUninstallPrefs"));
  tmp.addEventListener("command", Scriptish_setUninstallPrefs, false);
  tmp.checked = Scriptish_prefRoot.getValue("uninstallPreferences");
}, false);

function Scriptish_setUninstallPrefs(checkbox) {
  Scriptish_prefRoot.setValue("uninstallPreferences",
      !!document.getElementById("check-uninstall").checked);
}

function Scriptish_getEditor() {
  var tools = {};
  Components.utils.import("resource://scriptish/utils/Scriptish_getEditor.js", tools);
  tools.Scriptish_getEditor(window, true);
}

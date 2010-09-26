
Components.utils.import("resource://scriptish/prefmanager.js");
Components.utils.import("resource://scriptish/utils/Scriptish_stringBundle.js");

window.addEventListener("load", function() {
  var d = document;
  var $ = function(aID) d.getElementById(aID);
  var tmpEle;

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
  tmpEle = $("check-uninstall")
  tmpEle.setAttribute("label", Scriptish_stringBundle("AlsoUninstallPrefs"));
  tmpEle.addEventListener("command", Scriptish_setUninstallPrefs, false);
  tmpEle.checked = Scriptish_prefRoot.getValue("uninstallPreferences");
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

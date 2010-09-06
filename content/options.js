
Components.utils.import("resource://scriptish/prefmanager.js");

function Scriptish_onloadOptions() {
  document.getElementById("check-uninstall")
      .checked = Scriptish_prefRoot.getValue("uninstallPreferences");
}

function Scriptish_setUninstallPrefs(checkbox) {
  Scriptish_prefRoot.setValue("uninstallPreferences",
      !!document.getElementById("check-uninstall").checked);
}

function Scriptish_getEditor() {
  var tools = {};
  Components.utils.import("resource://scriptish/utils/Scriptish_getEditor.js", tools);
  tools.Scriptish_getEditor(window, true);
}

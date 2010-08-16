
Components.utils.import("resource://scriptish/prefmanager.js");
Components.utils.import("resource://scriptish/utils.js");
Components.utils.import("resource://scriptish/utils/GM_getEditor.js");

function GM_onloadOptions() {
  document.getElementById("check-uninstall")
      .checked = GM_prefRoot.getValue("uninstallPreferences");
}

function GM_setUninstallPrefs(checkbox) {
  GM_prefRoot.setValue("uninstallPreferences",
      !!document.getElementById("check-uninstall").checked);
}

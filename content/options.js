
Components.utils.import("resource://greasemonkey/prefmanager.js");
Components.utils.import("resource://greasemonkey/utils.js");

function GM_onloadOptions() {
  document.getElementById("check-uninstall")
      .checked = GM_prefRoot.getValue("uninstallPreferences");
}

function GM_setUninstallPrefs(checkbox) {
  GM_prefRoot.setValue("uninstallPreferences",
      !!document.getElementById("check-uninstall").checked);
}

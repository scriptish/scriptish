Components.utils.import("resource://scriptish/scriptish.js");
Components.utils.import("resource://scriptish/logging.js");
Components.utils.import("resource://scriptish/prefmanager.js");
Components.utils.import("resource://scriptish/utils/Scriptish_stringBundle.js");

var $ = function(aID) document.getElementById(aID);

window.addEventListener("load", function() {
  var tmp;

  tmp = Scriptish_stringBundle("options");
  let dialog = $("scriptish-options-dialog");
  dialog.setAttribute("title", "Scriptish - " + tmp);
  dialog.setAttribute("ondialogaccept", "return doSave();");
  $("scriptish-header").setAttribute("description", tmp);
  $("caption-editor")
      .setAttribute("label", Scriptish_stringBundle("options.editor"));
  $("btn-editor")
      .addEventListener("command", Scriptish_getEditor, false);
  $("label-editor")
      .setAttribute("value", Scriptish_stringBundle("options.changeEditor"));

  $("caption-uninstall")
      .setAttribute("label", Scriptish_stringBundle("Uninstall"));
  tmp = $("check-uninstall");
  tmp.setAttribute("label", Scriptish_stringBundle("options.alsoUninstallPrefs"));
  tmp.checked = Scriptish_prefRoot.getValue("uninstallPreferences");

  $("caption-update")
      .setAttribute("label", Scriptish_stringBundle("Update"));
  tmp = $("check-downloadURL");
  tmp.setAttribute("label", Scriptish_stringBundle("options.useDownloadURL"));
  tmp.checked = Scriptish_prefRoot.getValue("useDownloadURLForUpdateURL");
  tmp = $("check-requireSecured");
  tmp.setAttribute("label", Scriptish_stringBundle("options.requireSecured"));
  tmp.checked = Scriptish_prefRoot.getValue("update.requireSecured");

  $("caption-addonmanager")
      .setAttribute("label", Scriptish_stringBundle("options.addonManager"));
  tmp = $("check-copydownloadURL");
  tmp.setAttribute(
      "label", Scriptish_stringBundle("options.enableCopyDownloadURL"));
  tmp.checked = Scriptish_prefRoot.getValue("enableCopyDownloadURL");

  // Setup global excludes
  $("excludes-caption").setAttribute("label", Scriptish_stringBundle("options.excludes"));
  $("excludes").value = Scriptish.config.excludes.join("\n");
}, false);

function Scriptish_getEditor() {
  var tools = {};
  Components.utils.import("resource://scriptish/utils/Scriptish_getEditor.js", tools);
  tools.Scriptish_getEditor(window, true);
}

function doSave() {
  Scriptish_prefRoot.setValue("uninstallPreferences",
      !!$("check-uninstall").checked);
  Scriptish_prefRoot.setValue("useDownloadURLForUpdateURL",
      !!$("check-downloadURL").checked);
  Scriptish_prefRoot.setValue("update.requireSecured",
      !!$("check-requireSecured").checked);
  Scriptish_prefRoot.setValue("enableCopyDownloadURL",
      !!$("check-copydownloadURL").checked);

  Scriptish.config.excludes = $("excludes").value.match(/.+/g);
  Scriptish.notify(null, "scriptish-preferences-change", {saved: true});
}

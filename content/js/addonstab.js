Components.utils.import("resource://scriptish/addonprovider.js");
Components.utils.import("resource://scriptish/utils/Scriptish_stringBundle.js");
Components.utils.import("resource://scriptish/utils/Scriptish_openInEditor.js");
Components.utils.import("resource://scriptish/third-party/Scriptish_openFolder.js");

window.addEventListener("load", function() {
  var $ = function(aID) document.getElementById(aID);

  function addonIsInstalledScript(aAddon) {
    if (!aAddon || "userscript" != aAddon.type || aAddon.needsUninstall)
      return false;
    return true;
  }

  gViewController.commands.cmd_scriptish_userscript_edit = {
    isEnabled: addonIsInstalledScript,
    doCommand: Scriptish_openInEditor
  };
  gViewController.commands.cmd_scriptish_userscript_show = {
    isEnabled: addonIsInstalledScript,
    doCommand: function(aAddon) Scriptish_openFolder(aAddon._file)
  };

  function hideUSMenuitem(aEvt) {
    aEvt.target.setAttribute("disabled",
        !("addons://list/userscript" == gViewController.currentViewId));
  }

  var tmp = $("menuitem_scriptish_userscript_edit");
  tmp.setAttribute("label", Scriptish_stringBundle("edit"));
  tmp.setAttribute("accesskey", Scriptish_stringBundle("edit.ak"));
  tmp.addEventListener("popupshowing", hideUSMenuitem, false);

  tmp = $("menuitem_scriptish_userscript_show");
  tmp.setAttribute("label", Scriptish_stringBundle("openfolder"));
  tmp.setAttribute("accesskey", Scriptish_stringBundle("openfolder.ak"));
  tmp.addEventListener("popupshowing", hideUSMenuitem, false);

  $("category-userscripts").setAttribute(
      "name", Scriptish_stringBundle("userscripts"));
}, false);

window.addEventListener("unload", function() {
  var tools = {};
  Cu.import("resource://scriptish/constants.js", tools);

  var config = tools.gmService.config;
  var scripts = config.scripts;

  for (var i = scripts.length - 1; i >= 0; i--) {
    if (scripts[i].needsUninstall) config.uninstall(i);
  }
}, false);

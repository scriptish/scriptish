
(function($){
var Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
Cu.import("resource://scriptish/logging.js");
Cu.import("resource://scriptish/addonprovider.js");
Cu.import("resource://scriptish/scriptish.js");
Cu.import("resource://scriptish/utils/Scriptish_hitch.js");
Cu.import("resource://scriptish/utils/Scriptish_stringBundle.js");
Cu.import("resource://scriptish/utils/Scriptish_ExtendedStringBundle.js");
Cu.import("resource://scriptish/utils/Scriptish_openInEditor.js");
Cu.import("resource://scriptish/third-party/Scriptish_openFolder.js");

var Scriptish_bundle = new Scriptish_ExtendedStringBundle(gStrings.ext);
Scriptish_bundle.strings["header-userscript"] = Scriptish_stringBundle("userscripts");
gStrings.ext = Scriptish_bundle;

window.addEventListener("load", function() {
  function addonIsInstalledScript(aAddon) {
    if (!aAddon || "userscript" != aAddon.type || aAddon.needsUninstall)
      return false;
    return true;
  }

  gViewController.commands.cmd_scriptish_userscript_edit = {
    isEnabled: addonIsInstalledScript,
    doCommand: function(aAddon) { Scriptish_openInEditor(aAddon, window); }
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

window.addEventListener(
    "unload", Scriptish_hitch(Scriptish.config, "uninstallScripts"), false);

})(function(aID) document.getElementById(aID));

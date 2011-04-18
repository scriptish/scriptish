Components.utils.import("resource://scriptish/scriptish.js");
Components.utils.import("resource://scriptish/logging.js");
Components.utils.import("resource://scriptish/utils/Scriptish_stringBundle.js");

var $ = function(aID) document.getElementById(aID);
var script;

window.addEventListener("load", function() {
  var scriptID = window.location.search.match(/[\?&]id=([^&,]+)/i);
  if (!scriptID) {
    window.close();
    throw new Error("Script ID is not defined!");
  }

  scriptID = scriptID[1];
  script = Scriptish.config.getScriptById(scriptID);

  let options = Scriptish_stringBundle("options");
  let dialog = $("scriptish-script-options-dialog");
  dialog.setAttribute("title", script.name + " - " + options);
  dialog.setAttribute("ondialogaccept", "return doSave();");
  $("header").setAttribute("description", options);

  $("includes-label").setAttribute("value", Scriptish_stringBundle("scriptOptions.includes"));
  $("excludes-label").setAttribute("value", Scriptish_stringBundle("scriptOptions.excludes"));
  $("includes").value = script.getUserIncStr();
  $("excludes").value = script.getUserIncStr("exclude");

  let tmp = $("disableScriptIncludes");
  tmp.setAttribute("label", Scriptish_stringBundle("scriptOptions.disableScriptIncludes"));
  tmp.checked = script.includesDisabled;

  return true;
}, false);

function doSave() {
  let postInc = $("includes").value.trim();
  let postExc = $("excludes").value.trim();

  if (script.getUserIncStr() != postInc || script.getUserIncStr("exclude") != postExc) {
    script.user_includes = postInc.match(/.+/g);
    script.user_excludes = postExc.match(/.+/g);
    Scriptish.notify(script, "scriptish-script-user-prefs-change", true);
  }

  script.includesDisabled = $("disableScriptIncludes").checked;

  return true;
}

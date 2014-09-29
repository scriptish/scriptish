Components.utils.import("resource://scriptish/constants.js");

lazyImport(this, "resource://scriptish/config.js", ["Scriptish_config"]);
lazyImport(this, "resource://scriptish/scriptish.js", ["Scriptish"]);
lazyImport(this, "resource://scriptish/utils/Scriptish_localizeDOM.js", ["Scriptish_localizeOnLoad"]);

lazyUtil(this, "stringBundle");

var $ = function(aID) document.getElementById(aID);
var script;

Scriptish_localizeOnLoad(window);

window.addEventListener("DOMContentLoaded", function() {
  var scriptID = window.location.search.match(/[\?&]id=([^&,]+)/i);
  if (!scriptID) {
    //window.close();
    //throw new Error("Script ID is not defined!");
  }

  scriptID = scriptID[1];
  script = Scriptish_config.getScriptById(scriptID);

  let options = Scriptish_stringBundle("options");
  let dialog = $("scriptish-script-options-dialog");
  dialog.setAttribute("title", script.name + " - " + options);
  dialog.setAttribute("ondialogaccept", "return doSave();");

  // setup script info
  $("scriptIcon").src = script.iconURL;

  let title = (script.name || Scriptish_stringBundle("untitledScript"));
  if (script.version) {
    title += " " + script.version;
  }
  $("scriptTitle").textContent = title;

  $("includes").value = script.getUserIncStr();
  $("excludes").value = script.getUserIncStr("exclude");

  $("disableScriptIncludes").checked = script.includesDisabled;

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
  script.update();

  return true;
}

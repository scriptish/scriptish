Components.utils.import("resource://scriptish/scriptish.js");
Components.utils.import("resource://scriptish/logging.js");
Components.utils.import("resource://scriptish/utils/Scriptish_stringBundle.js");

var $ = function(aID) document.getElementById(aID);
var script;
var initInc, initExc;

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
  $("includes").value = initInc = script.user_includes.join("\n");
  $("excludes").value = initExc = script.user_excludes.join("\n");

  return true;
}, false);

function doSave() {
  let postInc = $("includes").value;
  let postExc = $("excludes").value;

  if (initInc !== postInc || initExc !== postExc) {
    script.user_includes = postInc.match(/.+/g);
    script.user_excludes = postExc.match(/.+/g);
    Scriptish.config._save();
  }

  return true;
}

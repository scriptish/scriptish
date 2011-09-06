(function(inc, tools) {
  "use strict";
  inc("resource://scriptish/utils/Scriptish_stringBundle.js", tools);

  function $(aID) document.getElementById(aID);

  this.saveAsUserscript = function() {
    let txt = (this.getText && this.getText()) || $("scratchpad-textbox").value;
    this.browserWindow.Scriptish_BrowserUIM.newUserScript(txt);
  };

  window.addEventListener("DOMContentLoaded", function init() {
    window.removeEventListener("DOMContentLoaded", init, false);
    // key
    var tmp = $("sp-key-scriptish-saveasuserscript")
    tmp.setAttribute("key",
        tools.Scriptish_stringBundle("scratchpad.saveAsUserScript.ak"));
    tmp.setAttribute("modifiers", "accel");

    // menuitem
    tmp = $("sp-cmd-scriptish-saveasuserscript");
    tmp.setAttribute("label",
        tools.Scriptish_stringBundle("scratchpad.saveAsUserScript"));
  }, false);
}).call(Scratchpad, Components.utils.import, {});

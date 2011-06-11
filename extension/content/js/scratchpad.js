(function(inc, tools) {
  inc("resource://scriptish/utils/Scriptish_stringBundle.js", tools);

  function $(aID) document.getElementById(aID);

  window.addEventListener("DOMContentLoaded", function init() {
    window.removeEventListener("DOMContentLoaded", init, false);
    // command
    $("sp-cmd-scriptish-savetouserscript").setAttribute("oncommand",
        "Scratchpad.browserWindow.Scriptish_BrowserUIM.newUserScript(document.getElementById('scratchpad-textbox').value);");

    // key
    var tmp = $("sp-key-scriptish-savetouserscript")
    tmp.setAttribute("key",
        tools.Scriptish_stringBundle("scratchpad.saveAsUserScript.ak"));
    tmp.setAttribute("modifiers", "accel");
    tmp.setAttribute("command", "sp-cmd-scriptish-savetouserscript");

    // menuitem
    tmp = $("sp-menu-scriptish-savetouserscript");
    tmp.setAttribute("label",
        tools.Scriptish_stringBundle("scratchpad.saveAsUserScript"));
    tmp.setAttribute("accesskey",
        tools.Scriptish_stringBundle("scratchpad.saveAsUserScript.ak"));
    tmp.setAttribute("key", "sp-key-scriptish-savetouserscript");
    tmp.setAttribute("command", "sp-cmd-scriptish-savetouserscript");
    $("sp-menu-filepopup").insertBefore(tmp, $("sp-menu-saveas").nextSibling);
  }, false);
})(Components.utils.import, {});

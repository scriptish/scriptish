// Checks if Scriptish was updated/installed
(function(import, tools) {
  import("resource://scriptish/prefmanager.js", tools);
  import("resource://scriptish/constants.js", tools);
  var pref = tools.Scriptish_prefRoot;
  var currentVer = pref.getValue("version", "0.0");

  // update the currently initialized version so we don't do this work again.
  tools.AddonManager.getAddonByID("scriptish@erikvold.com", function(aAddon) {
    pref.setValue("version", aAddon.version);
  });

  if (0 >= tools.Services.vc.compare(currentVer, "0.1b5")) {
    // add toolbaritem to add-on bar
    var chromeWin = tools.Services.wm.getMostRecentWindow("navigator:browser");
    var gNavToolbox = chromeWin.gNavToolbox;
    var gAddonBar = chromeWin.document.getElementById("addon-bar");
    var addonSet = gAddonBar.getAttribute("currentset").split(",");
    var curSet = gNavToolbox.getAttribute("currentset").split(",");
    curSet = curSet.concat(addonSet);
    if (0 <= curSet.indexOf("scriptish-tb-item")) return;
    addonSet.push("scriptish-tb-item");
    addonSet = addonSet.join(",");
    gAddonBar.setAttribute("currentset", addonSet);
    gAddonBar.currentSet = addonSet;
    chromeWin.BrowserToolboxCustomizeDone(true);
  }
})(Components.utils.import, {})

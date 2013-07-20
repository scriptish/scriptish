// Checks if Scriptish was updated/installed
(function(inc) {
  let { Scriptish_prefRoot } = inc("resource://scriptish/prefmanager.js", {});
  let { Services, jetpack } = inc("resource://scriptish/constants.js", {});
  let { AddonManager } = inc("resource://gre/modules/AddonManager.jsm", {});

  var currentVer = Scriptish_prefRoot.getValue("version", "0.0");

  // update the currently initialized version so we don't do this work again.
  AddonManager.getAddonByID("scriptish@erikvold.com", function(aAddon) {
    Scriptish_prefRoot.setValue("version", aAddon.version);
  });

  // FIRST RUN STUFF!
  if (0 >= Services.vc.compare(currentVer, "0.1b5")) {
    let chromeWin = Services.wm.getMostRecentWindow("navigator:browser");
    let { document, gBrowser } = chromeWin;

    // Open about:scriptish in a tab
    gBrowser.addTab("about:scriptish");

    // Add toolbaritem to add-on bar
    let addToBar = document.getElementById("nav-bar");
    let scriptishBtn = document.getElementById("scriptish-button");
    if (addToBar && !scriptishBtn) {
      var addonSet = (addToBar.getAttribute("currentset") || addToBar.getAttribute("defaultset")).split(",");
      var addonPos = addonSet.indexOf("status-bar");
      if (addonPos == -1) addonPos = addonSet.length;
      addonSet.splice(addonPos, 0, "scriptish-button");
      addonSet = addonSet.join(",");
      addToBar.setAttribute("currentset", addonSet);
      addToBar.currentSet = addonSet;
      chromeWin.BrowserToolboxCustomizeDone(true);
      document.persist(addToBar.getAttribute("id"), "currentset");
      if ("addon-bar" == addToBar.getAttribute("id")) addToBar.collapsed = false;
    }
  }
})(Components.utils.import)

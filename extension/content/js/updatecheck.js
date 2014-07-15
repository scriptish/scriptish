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
  if (0 < Services.vc.compare(currentVer, "0.1b5")) {
    return;
  }
  let window = Services.wm.getMostRecentWindow("navigator:browser");
  let { document, gBrowser } = window;

  // Open about:scriptish in a tab
  gBrowser.addTab("about:scriptish");

  // Add toolbaritem to add-on bar
  if (!window.CustomizableUI) {
    return;
  }

  const button = "scriptish-button";
  let placement = window.CustomizableUI.getPlacementOfWidget(button);
  if (!placement) {
    // New and not placed yet
    placement = {area: 'nav-bar', position: undefined};
    window.CustomizableUI.addWidgetToArea(button,
                                          placement.area,
                                          placement.position);
    window.CustomizableUI.ensureWidgetPlacedInWindow(button, window);
  }
})(Components.utils.import);

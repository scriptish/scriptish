var EXPORTED_SYMBOLS = ["Scriptish_openManager"];
Components.utils.import("resource://scriptish/constants.js");

function Scriptish_openManager(aURL, aID) {
  aURL = aURL || "addons://list/userscript";
  if (aID) {
    aURL = 'addons://detail/' + encodeURIComponent(aID) + '/preferences';
  }

  let browserWin = Services.wm.getMostRecentWindow("navigator:browser");
  // Fx
  if (browserWin.BrowserOpenAddonsMgr) {
    browserWin.BrowserOpenAddonsMgr(aURL);
  }
  // Sm
  else if (browserWin.toEM) {
    browserWin.toEM(aURL);
  }
}

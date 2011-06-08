var EXPORTED_SYMBOLS = ["Scriptish_getBrowserForContentWindow"];
Components.utils.import("resource://scriptish/constants.js");
function Scriptish_getBrowserForContentWindow(aWin) {
  // enumerate through browser windows
  let browserEnumerator = Services.wm.getEnumerator("navigator:browser");
  while (browserEnumerator.hasMoreElements()) {
    let browserWin = browserEnumerator.getNext();
    let tabBrowser = browserWin.getBrowser();
    if (!tabBrowser) continue;
    for (let [, tab] in Iterator(tabBrowser.tabs)) {
      if (!tab) continue;
      let win = tab.linkedBrowser.contentWindow;
      if (aWin === win || aWin.top === win) return browserWin;
    }
  }
  return null;
}

var EXPORTED_SYMBOLS = ["Scriptish_getBrowserForContentWindow"];
Components.utils.import("resource://scriptish/constants.js");
function Scriptish_getBrowserForContentWindow(aWin) {
  // emumerate through browser windows
  let browserEnumerator = Services.wm.getEnumerator("navigator:browser");
  while (browserEnumerator.hasMoreElements()) {
    let browserWin = browserEnumerator.getNext();
    let tabBrowser = browserWin.getBrowser();
    let numTabs = tabBrowser.browsers.length;

    for (var i = 0; i < numTabs; i++) {
      let tab = tabBrowser.getBrowserAtIndex(i);
      let win = tab.contentWindow;
      if (aWin === win || aWin.top == win) return browserWin;
    }
  }
  return null;
}

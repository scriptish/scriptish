var EXPORTED_SYMBOLS = ["Scriptish_getBrowserForContentWindow"];
Components.utils.import("resource://scriptish/constants.js");
function Scriptish_getBrowserForContentWindow(aWin) {
  // emumerate through browser windows
  var browserEnumerator = Services.wm.getEnumerator("navigator:browser");
  while (browserEnumerator.hasMoreElements()) {
    browserWin = browserEnumerator.getNext();
    var tabBrowser = browserWin.getBrowser();
    var numTabs = tabBrowser.browsers.length;

    for (var i = 0; i < numTabs; i++) {
      win = tabBrowser.getBrowserAtIndex(i).contentWindow;
      if (aWin === win || aWin.top == win) return browserWin;
    }
  }
  return null;
}

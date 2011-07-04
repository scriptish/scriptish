var EXPORTED_SYMBOLS = ["Scriptish_openInTab"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
lazyImport(this, "resource://scriptish/scriptish.js", ["Scriptish"]);

function Scriptish_openInTab(aURL, aLoadInBackground, aReuse, aChromeWin) {
  aChromeWin = aChromeWin || Scriptish.getMostRecentWindow();

  // Try to reuse an existing tab
  if (aReuse) {
    let browserEnumerator = Services.wm.getEnumerator("navigator:browser");

    while (browserEnumerator.hasMoreElements()) {
      let browserWin = browserEnumerator.getNext();
      let tabBrowser = browserWin.gBrowser;
      let i = tabBrowser.browsers.length - 1;

      for (; ~i; i--) {
        let browser = tabBrowser.getBrowserAtIndex(i);
        // TODO: check rel=canonical too
        if (aURL === browser.currentURI.spec) {
          if (!aLoadInBackground) {
            tabBrowser.selectedTab = tabBrowser.tabContainer.childNodes[i];
            browserWin.focus();
          }
          return getWindowForBrowser(browser);
        }
      }
    }
  }

  // Opening a new tab
  var browser = aChromeWin.gBrowser;
  return getWindowForBrowser(browser.getBrowserForTab(browser.loadOneTab(aURL, {
    "inBackground": !!aLoadInBackground
  })));
}

function getWindowForBrowser(browser) browser.docShell
    .QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindow);

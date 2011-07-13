var EXPORTED_SYMBOLS = ["Scriptish_getBrowserForContentWindow"];
Components.utils.import("resource://scriptish/constants.js");

// See _getBrowserWindowForContentWindow in browser.js
function Scriptish_getBrowserForContentWindow(aContentWindow) {
  return aContentWindow.QueryInterface(Ci.nsIInterfaceRequestor)
      .getInterface(Ci.nsIWebNavigation)
      .QueryInterface(Ci.nsIDocShellTreeItem)
      .rootTreeItem
      .QueryInterface(Ci.nsIInterfaceRequestor)
      .getInterface(Ci.nsIDOMWindow)
      .wrappedJSObject;
}

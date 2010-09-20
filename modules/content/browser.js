
var EXPORTED_SYMBOLS = ["Scriptish_BrowserUIM"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
Cu.import("resource://scriptish/utils/Scriptish_setEnabled.js");
Cu.import("resource://scriptish/utils/Scriptish_getEnabled.js");

var winWatcher = Cc["@mozilla.org/embedcomp/window-watcher;1"]
    .getService(Ci.nsIWindowWatcher);

function Scriptish_BrowserUIM(aWin) {
  this._win = aWin;
}
Scriptish_BrowserUIM.prototype = {
  onIconClick: function(aEvt) {
    if (!aEvt.button)
      this.onToggleStatus();
    else if (aEvt.button == 1)
      this._win.BrowserOpenAddonsMgr('userscripts');
  },
  onToggleStatus: function() {
    Scriptish_setEnabled(!Scriptish_getEnabled());
  },
  openChromeWindow: function(aURL) {
    winWatcher.openWindow(
      this._win, aURL, null, "chrome,dependent,centerscreen,resizable,dialog", null);
  },
  newUserScript: function() {
    this.openChromeWindow("chrome://scriptish/content/newscript.xul");
  },
  openOptionsWin: function() {
    this.openChromeWindow("chrome://scriptish/content/options.xul");
  }
}

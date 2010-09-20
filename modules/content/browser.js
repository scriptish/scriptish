
var EXPORTED_SYMBOLS = ["Scriptish_BrowserUIM"];

const Cu = Components.utils;
Cu.import("resource://scriptish/utils/Scriptish_setEnabled.js");
Cu.import("resource://scriptish/utils/Scriptish_getEnabled.js");

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
  }
}

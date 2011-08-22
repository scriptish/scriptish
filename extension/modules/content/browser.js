var EXPORTED_SYMBOLS = ["Scriptish_BrowserUIM"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
lazyImport(this, "resource://scriptish/scriptish.js", ["Scriptish"]);
lazyUtil(this, "openManager");

const ICON_16_ON = "chrome://scriptish/skin/scriptish16.png";
const ICON_16_OFF = "chrome://scriptish/skin/scriptish16_disabled.png";
const ICON_24_ON = "chrome://scriptish/skin/scriptish24.png";
const ICON_24_OFF = "chrome://scriptish/skin/scriptish24_disabled.png";

function Scriptish_BrowserUIM(aWin, aBrowserUI) {
  this.$ = function(aID) aWin.document.getElementById(aID);
  this._win = aWin;
  this._optionsWin = null;
  this._browserUI = aBrowserUI;
}
Scriptish_BrowserUIM.prototype = {
  onIconClick: function(aEvt) {
    if ("menu-button" == aEvt.originalTarget.type) return;
    switch (aEvt.button) {
      case 0:
        this.onToggleStatus();
        break;
      case 1:
        Scriptish_openManager();
        break;
      case 2:
        this.$("scriptish-tb-popup").openPopup(this.$("scriptish-button"), "before_end", 0, 0, false, false);
        break;
    }
  },
  onToggleStatus: function() Scriptish.enabled = !Scriptish.enabled,
  refreshStatus: function() {
    var tbImg = this.$("scriptish-button-brd");
    var menu = this.$("scriptish_general_menu");
    var appName = Services.appinfo.name;

    if (Scriptish.enabled) {
      menu.setAttribute("image", ICON_16_ON);
      tbImg.removeAttribute("scriptish-disabled");
    } else {
      menu.setAttribute("image", ICON_16_OFF);
      tbImg.setAttribute("scriptish-disabled", "scriptish-disabled");
    }
  },
  openChromeWindow: function(aURL, aParams) {
    aParams = aParams || null;
    Services.ww.openWindow(
        this._win, aURL, null, "chrome,dependent,centerscreen,resizable,dialog",
        aParams);
  },
  newUserScript: function(aContent) {
    var params = null;
    aContent = aContent || null;
    if (aContent) {
      params = Cc["@mozilla.org/embedcomp/dialogparam;1"]
          .createInstance(Ci.nsIDialogParamBlock);
      params.SetString(0, aContent);
    }
    this.openChromeWindow("chrome://scriptish/content/newscript.xul", params);
  },
  openOptionsWin: function() {
    var instantApply = false;
    try {
      instantApply = Services.prefs.getBoolPref("browser.preferences.instantApply");
    }
    catch (ex) {};

    if (!this._optionsWin || this._optionsWin.closed) {
      this._optionsWin = this._win.openDialog(
        "chrome://scriptish/content/options.xul",
        "scriptish-options-dialog",
        "chrome,titlebar,toolbar,resizable,centerscreen" + (instantApply ? ",dialog=no" : ",modal")
      );
    }
    this._optionsWin.focus();
  },
  showUserscriptList: function() {
    Cu.import("resource://scriptish/addonprovider.js");
    timeout(Scriptish_openManager);
  }
}

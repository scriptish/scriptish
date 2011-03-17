var EXPORTED_SYMBOLS = ["Scriptish_BrowserUIM"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
Cu.import("resource://scriptish/logging.js");
Cu.import("resource://scriptish/scriptish.js");
Cu.import("resource://scriptish/utils/Scriptish_stringBundle.js");

const ICON_16_ON = "chrome://scriptish/skin/icon_16.png";
const ICON_16_OFF = "chrome://scriptish/skin/icon_16_disabled.png";
const ICON_24_ON = "chrome://scriptish/skin/icon_24.png";
const ICON_24_OFF = "chrome://scriptish/skin/icon_24_disabled.png";
const ICON_32_ON = "chrome://scriptish/skin/icon_medium.png";
const ICON_32_OFF = "chrome://scriptish/skin/icon_32_disabled.png";

function Scriptish_BrowserUIM(aWin, aBrowserUI) {
  this.$ = function(aID) aWin.document.getElementById(aID);
  this._win = aWin;
  this._browserUI = aBrowserUI;

  // listen for clicks on the install bar
  Services.obs.addObserver(aBrowserUI, "install-userscript", true);
}
Scriptish_BrowserUIM.prototype = {
  onIconClick: function(aEvt) {
    if ("menu-button" == aEvt.originalTarget.type) return;
    switch (aEvt.button) {
      case 0:
        this.onToggleStatus();
        break;
      case 1:
        Scriptish.openManager();
        break;
      case 2:
        this.$("scriptish-tb-popup").openPopup(this.$("scriptish-button"), "before_end", 0, 0, false, false);
        break;
    }
  },
  onToggleStatus: function() {
    Scriptish.enabled = !Scriptish.enabled;
  },
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
  openChromeWindow: function(aURL) {
    Services.ww.openWindow(
        this._win, aURL, null, "chrome,dependent,centerscreen,resizable,dialog",
        null);
  },
  newUserScript: function() {
    this.openChromeWindow("chrome://scriptish/content/newscript.xul");
  },
  openOptionsWin: function() {
    this.openChromeWindow("chrome://scriptish/content/options.xul");
  },
  showUserscriptList: function() {
    Cu.import("resource://scriptish/addonprovider.js");
    timeout(Scriptish.openManager);
  }
}

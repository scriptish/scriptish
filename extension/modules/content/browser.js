var EXPORTED_SYMBOLS = ["Scriptish_BrowserUIM"];

Components.utils.import("resource://scriptish/constants.js");
lazyImport(this, "resource://scriptish/scriptish.js", ["Scriptish"]);
lazyUtil(this, "openManager");

const tabs = jetpack('sdk/tabs');
const prefs = jetpack('sdk/preferences/service');

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
    if (aEvt.button === 1 && aEvt.target.id === "scriptish-button") {
      Scriptish_openManager();
      aEvt.preventDefault();
      aEvt.stopPropagation();
    }
  },
  onToggleStatus: function() Scriptish.enabled = !Scriptish.enabled,
  refreshStatus: function() {
    var tbImg = this.$("scriptish-button-brd");
    var menu = this.$("scriptish_general_menu");

    if (Scriptish.enabled) {
      menu.setAttribute("image", ICON_16_ON);
      tbImg.removeAttribute("scriptish-disabled");
    }
    else {
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
    let instantApply = prefs.get("browser.preferences.instantApply", false);

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
    Scriptish_openManager();
  },
  reportIssue: function() {
    tabs.open({
      url: 'https://github.com/scriptish/scriptish/issues'
    })
  }
}

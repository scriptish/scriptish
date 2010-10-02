var EXPORTED_SYMBOLS = ["Scriptish_notification"];

Components.utils.import("resource://scriptish/third-party/Timer.js");
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyServiceGetter(
    this, "as", "@mozilla.org/alerts-service;1", "nsIAlertsService");
const gTimer = new Timer();

function Scriptish_notification(aMsg, aTitle, aIconURL, aCallback) {
  gTimer.setTimeout(function() {
    if (aCallback) var cb = new Observer(aCallback);

    as.showAlertNotification(
      aIconURL || "chrome://scriptish/skin/icon_medium.png",
      aTitle || "Scriptish", aMsg+"", !!cb, "", cb || null);
  }, 0);
};

function Observer(aCallback) {
  this._cb = aCallback;
}
Observer.prototype.observe = function() {
  if ("alertclickcallback" != arguments[1]) return;
  var self = this;
  gTimer.setTimeout(function() { self._cb.call(null); }, 0);
}

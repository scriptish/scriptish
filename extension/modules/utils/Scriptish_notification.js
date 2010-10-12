var EXPORTED_SYMBOLS = ["Scriptish_notification"];
Components.utils.import("resource://scriptish/constants.js");
Components.utils.import("resource://scriptish/third-party/Timer.js");

const gTimer = new Timer();
function Scriptish_notification(aMsg, aTitle, aIconURL, aCallback) {
  gTimer.setTimeout(function() {
    if (aCallback) var callback = new Observer(aCallback);

    Services.as.showAlertNotification(
      aIconURL || "chrome://scriptish/skin/icon_medium.png",
      aTitle || "Scriptish", aMsg+"", !!callback, "", callback || null);
  }, 0);
};

function Observer(aCallback) {
  this._callback = aCallback;
}
Observer.prototype.observe = function() {
  if ("alertclickcallback" != arguments[1]) return;
  var self = this;
  gTimer.setTimeout(function() { self._callback.call(null); }, 0);
}

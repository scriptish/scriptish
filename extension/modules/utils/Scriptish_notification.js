var EXPORTED_SYMBOLS = ["Scriptish_notification"];
Components.utils.import("resource://scriptish/constants.js");

function Scriptish_notification(aMsg, aTitle, aIconURL, aCallback) {
  timeout(function() {
    if (aCallback) var callback = new Observer(aCallback);

    // if Growl is not installed or disabled on OSX, then this will error
    try {
      Services.as.showAlertNotification(
        aIconURL || "chrome://scriptish/skin/scriptish32.png",
        aTitle || "Scriptish", aMsg+"", !!callback, "", callback || null);
    } catch (e) {}
  }, 0);
};

function Observer(aCallback) {
  this._callback = aCallback;
}
Observer.prototype.observe = function() {
  if ("alertclickcallback" != arguments[1]) return;
  let self = this;
  timeout(function() { self._callback.call(null); }, 0);
}

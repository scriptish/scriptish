var EXPORTED_SYMBOLS = ["Scriptish_notification"];
Components.utils.import("resource://scriptish/constants.js");
lazyImport(this, "resource://scriptish/prefmanager.js", ["Scriptish_prefRoot"]);
lazyImport(this, "resource://scriptish/logging.js", ["Scriptish_log"]);

function Scriptish_notification(aMsg, aTitle, aIconURL, aCallback) {
  if (!Scriptish_prefRoot.getValue("enabledNotifications.sliding"))
    return Scriptish_log(aMsg);

  timeout(function() {
    if (aCallback) var callback = new Observer(aCallback);
    var args = [
      aIconURL || "chrome://scriptish/skin/scriptish32.png",
      aTitle || "Scriptish",
      aMsg+"", !!callback,
      "",
      callback || null
    ];

    // if Growl is not installed or disabled on OSX, then use a fallback
    try {
      Services.as.showAlertNotification.apply(null, args);
    } catch (e) {
      let win = Services.ww.openWindow(
          null, 'chrome://global/content/alerts/alert.xul',
          '_blank', 'chrome,titlebar=no,popup=yes', null);
      win.arguments = args;
    }
  });
};

function Observer(aCallback) {
  this._callback = aCallback;
}
Observer.prototype.observe = function() {
  if ("alertclickcallback" != arguments[1]) return;
  let self = this;
  timeout(function() { self._callback.call(null); }, 0);
}

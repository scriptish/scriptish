var EXPORTED_SYMBOLS = ["Scriptish_notification"];
Components.utils.import("resource://scriptish/constants.js");
lazyImport(this, "resource://scriptish/prefmanager.js", ["Scriptish_prefRoot"]);
lazyImport(this, "resource://scriptish/logging.js", ["Scriptish_log"]);

function showAlertNotification() {
  if ("Fennec" == Services.appinfo.name) {
    return showAlertNotification =
        Cc["@mozilla.org/toaster-alerts-service;1"]
        .getService(Ci.nsIAlertsService)
        .showAlertNotification;
  }

  return Services.as.showAlertNotification;
}

function Scriptish_notification(aMsg, aTitle, aIconURL, aCallback) {
  if (!Scriptish_prefRoot.getValue("enabledNotifications.sliding"))
    return Scriptish_log(aMsg);

  timeout(function() {
    var callback = (aCallback) ? new Observer(aCallback) : null;
    var args = [
      aIconURL || "chrome://scriptish/skin/scriptish32.png",
      aTitle || "Scriptish",
      aMsg+"",
      !!callback,
      "",
      callback
    ];

    // if Growl is not installed or disabled on OSX, then use a fallback
    try {
      showAlertNotification().apply(null, args);
    } catch (e) {
      let win = Services.ww.openWindow(
          null, 'chrome://global/content/alerts/alert.xul',
          '_blank', 'chrome,titlebar=no,popup=yes', null);
      args[6] = callback;
      args[5] = "";
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


// JSM exported symbols
var EXPORTED_SYMBOLS = ["Scriptish_notification"];

Components.utils.import("resource://scriptish/constants.js");
Components.utils.import("resource://scriptish/third-party/Timer.js");

const alertsServ = Cc["@mozilla.org/alerts-service;1"]
    .getService(Ci.nsIAlertsService);
const timer = new Timer();

function Scriptish_notification(aMsg, aTitle, aIconURL) {
  timer.setTimeout(function() {
    alertsServ.showAlertNotification(
      aIconURL || "chrome://scriptish/skin/icon_medium.png",
      aTitle || "Scriptish",
      aMsg+"",
      false,
      "",
      null);
  }, 0);
};

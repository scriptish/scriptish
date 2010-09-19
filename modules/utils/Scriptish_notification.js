
// JSM exported symbols
var EXPORTED_SYMBOLS = ["Scriptish_notification"];

Components.utils.import("resource://scriptish/constants.js");

const alertsServ = Cc["@mozilla.org/alerts-service;1"]
    .getService(Ci.nsIAlertsService);

function Scriptish_notification(aMsg, aTitle, aIconURL) {
  alertsServ.showAlertNotification(
    aIconURL || "chrome://scriptish/skin/icon_medium.png",
    aTitle || "Scriptish",
    aMsg+"",
    false,
    "",
    null);
};


// JSM exported symbols
var EXPORTED_SYMBOLS = ["Scriptish_notification"];

Components.utils.import("resource://scriptish/constants.js");

const alertsServ = Cc["@mozilla.org/alerts-service;1"]
    .getService(Ci.nsIAlertsService);

function Scriptish_notification(aMsg) {
  alertsServ.showAlertNotification(
    "chrome://scriptish/skin/icon_medium.png",
    "Scriptish",
    aMsg,
    false,
    "",
    null);
};

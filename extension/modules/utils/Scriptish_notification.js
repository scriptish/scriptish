var EXPORTED_SYMBOLS = ["Scriptish_notification"];

Components.utils.import("resource://scriptish/constants.js");

lazyImport(this, "resource://scriptish/prefmanager.js", ["Scriptish_prefRoot"]);
lazyImport(this, "resource://scriptish/logging.js", ["Scriptish_log"]);

const { notify } = jetpack("sdk/notifications");

const DO_NOTHING = function(){};

function Scriptish_notification(aMsg, aTitle, aIconURL, aCallback) {
  if (!Scriptish_prefRoot.getValue("enabledNotifications.sliding"))
    return Scriptish_log(aMsg);

  timeout(function() {
    notify({
      title: aTitle || "Scriptish",
      text: aMsg + "",
      iconURL: aIconURL || "chrome://scriptish/skin/scriptish32.png",
      onClick: aCallback || DO_NOTHING
    });
  });
};

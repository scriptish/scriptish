
var EXPORTED_SYMBOLS = ["Scriptish_popupNotification"];
Components.utils.import("resource://scriptish/constants.js");
Components.utils.import("resource://scriptish/scriptish.js");
Components.utils.import("resource://scriptish/prefmanager.js");
Components.utils.import("resource://scriptish/logging.js");
Components.utils.import("resource://gre/modules/PopupNotifications.jsm");

function Scriptish_popupNotification(options) {
  if (Scriptish_prefRoot.getValue("disableNotifications"))
    return Scriptish_log(aMsg);

  timeout(function() {
      var win = Scriptish.getMostRecentWindow();
      win.PopupNotifications.show(
        win.gBrowser.selectedBrowser,
        options.id,
        options.message,
        null, /* anchor ID */
        {
          label: options.mainAction.label,
          accessKey: options.mainAction.accessKey,
          callback: function() {
            options.mainAction.callback();
          }
        },
        null  /* secondary action */
      );
  });
};

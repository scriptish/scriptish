
var EXPORTED_SYMBOLS = ["Scriptish_popupNotification"];
Components.utils.import("resource://gre/modules/PopupNotifications.jsm");
Components.utils.import("resource://scriptish/constants.js");
lazyImport(this, "resource://scriptish/scriptish.js", ["Scriptish"]);
lazyImport(this, "resource://scriptish/prefmanager.js", ["Scriptish_prefRoot"]);
lazyImport(this, "resource://scriptish/logging.js", ["Scriptish_log"]);

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

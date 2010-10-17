var EXPORTED_SYMBOLS = ["Scriptish_getFirebugConsole"];
Components.utils.import("resource://scriptish/constants.js");
Components.utils.import("resource://scriptish/logging.js");

function Scriptish_getFirebugConsole(unsafeContentWin, chromeWin) {
  chromeWin = chromeWin.top;
  if ('undefined' == typeof chromeWin.Firebug) return null;

  try {
    var fbVersion = parseFloat(chromeWin.Firebug.version, 10);
    var fbConsole = chromeWin.Firebug.Console;
    var fbContext = chromeWin.TabWatcher &&
      chromeWin.TabWatcher.getContextByWindow(unsafeContentWin);

    // Firebug 1.4 will give no context, when disabled for the current site.
    if ('undefined' == typeof fbContext) return null;

    function findActiveContext() {
      for (var i = 0; i < fbContext.activeConsoleHandlers.length; i++)
        if (fbContext.activeConsoleHandlers[i].window == unsafeContentWin)
          return fbContext.activeConsoleHandlers[i];
      return null;
    }

    if (!fbConsole.isEnabled(fbContext)) return null;

    if (fbVersion >= 1.3) {
      fbConsole.injector.attachIfNeeded(fbContext, unsafeContentWin);
      return findActiveContext();
    }
  } catch (e) {
    Scriptish_log('Scriptish getFirebugConsole() error:\n'+uneval(e)+'\n');
  }
  return null;
}

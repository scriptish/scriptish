var EXPORTED_SYMBOLS = ["Scriptish_isScriptRunnable"];

function Scriptish_isScriptRunnable(script, url, topWin) {
  return !(!topWin && script.noframes)
      && !script.delayInjection
      && script.enabled
      && !script.needsUninstall
      && script.matchesURL(url);
}

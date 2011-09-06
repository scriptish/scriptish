"use strict";
var EXPORTED_SYMBOLS = ["Scriptish_getFirebugConsole"];

function Scriptish_getFirebugConsole(win, chromeWin) {
  if (!chromeWin.Firebug || !chromeWin.Firebug.getConsoleByGlobal) return null;
  return chromeWin.Firebug.getConsoleByGlobal(win);
}

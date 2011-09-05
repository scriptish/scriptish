"use strict";
var EXPORTED_SYMBOLS = ["Scriptish_windowEventTracker"];

Components.utils.import("resource://scriptish/constants.js");

lazyImport(this, "resource://scriptish/logging.js", ["Scriptish_log"]);

lazyUtil(this, "getWindowIDs");
lazyUtil(this, "windowUnloader");

const trackers = {};

function Scriptish_windowEventTracker(aWin) {
  var winID = Scriptish_getWindowIDs(aWin).innerID;
  if (trackers[winID]) return trackers[winID];
  trackers[winID] = "start";

  aWin.addEventListener("DOMContentLoaded", function() {
    trackers[winID] = "DOMContentLoaded";
  }, false);
  /*
  aWin.document.addEventListener("readystatechange", function() {
    if ("complete" != aWin.document.readyState) return;
    trackers[winID] = "readystate@complete";
  }, false);
  */
  aWin.addEventListener("load", function() {
    trackers[winID] = "load";
  }, false);

  Scriptish_windowUnloader(function() {
    delete trackers[winID];
  }, winID);

  return trackers[winID];
};

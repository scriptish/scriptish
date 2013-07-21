"use strict";

var EXPORTED_SYMBOLS = ["Scriptish_windowEventTracker"];

Components.utils.import("resource://scriptish/constants.js");

lazyUtil(this, "getWindowIDs");
lazyUtil(this, "windowUnloader");

const events = ["DOMContentLoaded", "load"];

const trackers = Object.create(null);

function Scriptish_windowEventTracker(aWin) {
  const winID = Scriptish_getWindowIDs(aWin).innerID;
  if (winID in trackers)
    return trackers[winID];

  trackers[winID] = "start";

  aWin.addEventListener("DOMContentLoaded", function onDOMContentLoaded() {
    aWin.removeEventListener("DOMContentLoaded", onDOMContentLoaded, false);

    // if the tracker event gte to this one has occurred then ignore
    if (~events.indexOf(trackers[winID]))
      return;

    trackers[winID] = "DOMContentLoaded";
  }, false);

  aWin.addEventListener("load", function onLoad() {
    aWin.removeEventListener("load", onLoad, false);

    trackers[winID] = "load";
  }, false);

  Scriptish_windowUnloader(function() {
    delete trackers[winID];
  }, winID);

  return trackers[winID];
};

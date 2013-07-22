"use strict";

var EXPORTED_SYMBOLS = ["Scriptish_windowEventTracker"];

Components.utils.import("resource://scriptish/constants.js");

lazyUtil(this, "windowUnloader");

const { getInnerId } = jetpack('sdk/window/utils');

const events = ["DOMContentLoaded", "load"];

const trackers = Object.create(null);

function Scriptish_windowEventTracker(aWin) {
  const winID = getInnerId(aWin);
  if (winID in trackers)
    return trackers[winID];

  trackers[winID] = "start";

  aWin.addEventListener("DOMContentLoaded", function onDOMContentLoaded() {
    aWin.removeEventListener("DOMContentLoaded", onDOMContentLoaded, true);

    // if the tracker event gte to this one has occurred then ignore
    if (~events.indexOf(trackers[winID]))
      return;

    trackers[winID] = "DOMContentLoaded";
  }, true);

  aWin.document.addEventListener("readystatechange", function readyStateListener() {
    if ("complete" != aWin.document.readyState)
      return;
    aWin.document.removeEventListener("readystatechange", readyStateListener, true);

    trackers[winID] = "readystate@complete";
  }, true);

  aWin.addEventListener("load", function onLoad() {
    aWin.removeEventListener("load", onLoad, true);

    trackers[winID] = "load";
  }, true);

  Scriptish_windowUnloader(function() {
    delete trackers[winID];
  }, winID);

  return trackers[winID];
};

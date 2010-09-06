
// JSM exported symbols
var EXPORTED_SYMBOLS = ["Scriptish_getConfig"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");

const Scriptish_getConfig = function () { return gmService.config; }

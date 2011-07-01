"use strict";
const EXPORTED_SYMBOLS = ["Scriptish_mergeRegExpStrings", "Scriptish_mergeRegExps"];

Components.utils.import("resource://scriptish/third-party/regexpmerger.js");

function Scriptish_mergeRegExpStrings(strs) {
  return new RegExp(merge(strs), "i");
}

function Scriptish_mergeRegExps(regs) {
  return Scriptish_mergeRegExpStrings([r.source for ([,r] in Iterator(regs))]);
}

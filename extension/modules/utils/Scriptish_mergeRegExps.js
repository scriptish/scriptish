"use strict";
const EXPORTED_SYMBOLS = ["Scriptish_mergeRegExpStrings", "Scriptish_mergeRegExps"];
Components.utils.import("resource://scriptish/prefmanager.js");

function merge_map(e) "(?:" + e + ")";

if (Scriptish_prefRoot.getValue("optimizingRegexpMerge")) {
  Components.utils.import("resource://scriptish/third-party/regexpmerger.js");
}
else {
  this.merge = function merge_naive(strs) {
    if (strs.length < 2) {
      return strs[0];
    }
    return strs.map(merge_map).join("|");
  }
}


function Scriptish_mergeRegExpStrings(strs, flags) (
    new RegExp(merge(strs), flags || ""))

function Scriptish_mergeRegExps(regs, flags) (
    Scriptish_mergeRegExpStrings([r.source for ([,r] in Iterator(regs))], flags))

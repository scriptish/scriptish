"use strict";
const EXPORTED_SYMBOLS = ["Scriptish_mergeRegExpStrings", "Scriptish_mergeRegExps"];

try {
  Components.utils.import("resource://scriptish/third-party/regexpmerger.jsm");
}
catch (ex) {
  var merge = function merge_naive(patterns) {
    return patterns
      .map(function(r) '(?:' + r + ')')
      .join('|')
      .replace(/\//g, '\\/');
  };
}

function Scriptish_mergeRegExpStrings(strs) {
  return new RegExp(merge(strs), "i");
}

function Scriptish_mergeRegExps(regs) {
  return Scriptish_mergeRegExpStrings([r.source for ([,r] in Iterator(regs))]);
}

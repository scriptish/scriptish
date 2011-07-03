"use strict";
const EXPORTED_SYMBOLS = ["Scriptish_mergeRegExpStrings", "Scriptish_mergeRegExps"];

Components.utils.import("resource://scriptish/third-party/regexpmerger.js");

function Scriptish_mergeRegExpStrings(strs, flags) (
    new RegExp(merge(strs), flags || ""))

function Scriptish_mergeRegExps(regs, flags) (
    Scriptish_mergeRegExpStrings([r.source for ([,r] in Iterator(regs))], flags))

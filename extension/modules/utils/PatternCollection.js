"use strict";
const EXPORTED_SYMBOLS = ["PatternCollection"];

Components.utils.import("resource://scriptish/utils/Scriptish_convert2RegExp.js");
Components.utils.import("resource://scriptish/utils/Scriptish_getTLDURL.js");
Components.utils.import("resource://scriptish/utils/Scriptish_mergeRegExps.js");

function PatternCollection() {
  this._patterns = [];
  this._regs = [];
  this._regsTLD = [];
}
PatternCollection.prototype = {
  addPattern: function(pattern) {
    this._patterns.push(pattern);
    var r = Scriptish_convert2RegExp(pattern);
    (r.isTLD ? this._regsTLD : this._regs).push(r);
    this._merged = this._mergedTLD = null;
  },
  addPatterns: function(patterns) {
    if (!patterns.forEach) {
      this.addPattern(patterns);
      return;
    }
    for (var [,p] in Iterator(patterns)) {
      this.addPattern(p);
    }
  },
  clear: function() {
    this._patterns.splice(0);
    this._regs.splice(0);
    this._regsTLD.splice(0);
    this._merged = this._mergedTLD = null;
  },
  get patterns() this._patterns.concat(),
  _merge: function(regs) {
    if (!regs.length) {
      // No patterns -> always test |false|
      // Do not merge, or we'll create an empty expression
      // that will always test |true|
      return {test: function() false};
    }
    return Scriptish_mergeRegExps(regs);
  },
  get merged() {
    if (!this._merged) {
      this._merged = this._merge(this._regs);
    }
    return this._merged;
  },
  get mergedTLD() {
    if (!this._mergedTLD) {
      this._mergedTLD = this._merge(this._regsTLD);
    }
    return this._mergedTLD;
  },
  test: function(url) this.merged.test(url) ||
    (!!this._regsTLD.length && this.mergedTLD.test(Scriptish_getTLDURL(url)))
};

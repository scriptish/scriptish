"use strict";
const EXPORTED_SYMBOLS = ["PatternCollection"];

Components.utils.import("resource://scriptish/utils/Scriptish_convert2RegExp.js");
Components.utils.import("resource://scriptish/utils/Scriptish_mergeRegExps.js");

function PatternCollection() {
  this._patterns = [];
  this._regs = [];
}
PatternCollection.prototype = {
  addPattern: function(pattern) {
    this._patterns.push(pattern);
    this._regs.push(Scriptish_convert2RegExp(pattern));
    this._merged = null;
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
  },
  get patterns() this._patterns.concat(),
  get merged() {
    if (!this._merged) {
      if (!this._regs.length) {
        // No patterns -> always test |false|
        // Do not merge, or we'll create an empty expression
        // that will always test |true|
        this._merged = {test: function() false};
      }
      else {
        this._merged = Scriptish_mergeRegExps(this._regs);
      }
    }
    return this._merged;
  },
  test: function(s) this.merged.test(s)
};

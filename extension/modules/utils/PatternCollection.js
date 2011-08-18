"use strict";
const EXPORTED_SYMBOLS = ["PatternCollection"];

Components.utils.import("resource://scriptish/utils/Scriptish_convert2RegExp.js");
Components.utils.import("resource://scriptish/utils/Scriptish_getTLDURL.js");
Components.utils.import("resource://scriptish/utils/Scriptish_mergeRegExps.js");

const FAKE_REGEXP = {test: function() false};

function merge(regs, flags) {
  if (!regs.length) {
    // No patterns -> always test |false|
    // Do not merge, or we'll create an empty expression
    // that will always test |true|
    return FAKE_REGEXP;
  }
  return Scriptish_mergeRegExps(regs, flags);
}

function PatternCollection() {
  this._patterns = [];
  this._regs = [];
  this._regsTLD = [];
  this._regsSensitives = [];
}
PatternCollection.prototype = {
  _hasTLD: false,
  addPattern: function(pattern) {
    if (typeof(pattern) != "string") {
      return;
    }
    this._patterns.push(pattern);
    var r = Scriptish_convert2RegExp(pattern);
    if (r.isTLD) {
      this._regsTLD.push(r);
      this._hasTLD = true;
    } else {
      if (r.ignoreCase)
        this._regs.push(r);
      else
        this._regsSensitives.push(r);
    }

    this._merged = this._mergedTLD = null;
  },
  addPatterns: function(patterns) {
    if (!patterns) {
      return;
    }
    if (!patterns.forEach) {
      this.addPattern(patterns);
      return;
    }
    for (var [,p] in Iterator(patterns)) {
      this.addPattern(p);
    }
  },
  clear: function() {
    this._patterns.length = 0;
    this._regs.length = this._regsSensitives = this._regsTLD.length = 0;
    delete this._hasTLD;
    this._merged = this._mergedTLD = null;
  },
  get patterns() this._patterns.concat(),
  get merged() {
    if (!this._merged)
      this._merged = merge(this._regs, "i");
    return this._merged;
  },
  get mergedSensitives() {
    if (!this._mergedSensitives)
      this._mergedSensitives = merge(this._regsSensitives);
    return this._mergedSensitives;
  },
  get mergedTLD() {
    if (!this._mergedTLD)
      this._mergedTLD = merge(this._regsTLD, "i");
    return this._mergedTLD;
  },
  test: function(url) this.merged.test(url) || this.mergedSensitives.test(url)
      || (this._hasTLD && this.mergedTLD.test(Scriptish_getTLDURL(url)))
};

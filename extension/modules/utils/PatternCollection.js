"use strict";
const EXPORTED_SYMBOLS = ["PatternCollection"];

Components.utils.import("resource://scriptish/utils/Scriptish_convert2RegExp.js");
Components.utils.import("resource://scriptish/utils/Scriptish_getTLDURL.js");
Components.utils.import("resource://scriptish/utils/Scriptish_mergeRegExps.js");

const FAKE_REGEXP = {test: function() false};
const REG_TAINTED = /\\[ux]?\d/;
const REG_TAINTED_ESCAPES = /\\\\/g;

function tainted_filter(r) {
  // No negative lookbehind in js :p
  if (REG_TAINTED.test(r.source.replace(REG_TAINTED_ESCAPES, ""))) {
    this.push(r);
    return false;
  }
  return true;
}

function merge(regs, flags) {
  if (!regs.length) {
    // No patterns -> always test |false|
    // Do not merge, or we'll create an empty expression
    // that will always test |true|
    return FAKE_REGEXP;
  }

  // Split the regs into "tainted" ones and those we can merge
  // Tainted:
  // - contains back refs /(["']).+?\1/
  // - contains string escapes /\x00\u0000/
  let tainted = [];
  regs = regs.filter(tainted_filter, tainted);

  // merge what we can
  regs = Scriptish_mergeRegExps(regs, flags);

  if (tainted.length) {
    // we need to test regs individually
    tainted.unshift(regs);
    return {test: function(s) tainted.some(function(r) r.test(s))};
  }

  // no tainted regs
  return regs;
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

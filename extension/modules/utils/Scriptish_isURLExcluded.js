var EXPORTED_SYMBOLS = [
  "Scriptish_isURLExcluded",
  "Scriptish_addExcludes",
  "Scriptish_setExcludes",
  "Scriptish_getExcludes"
];

Components.utils.import("resource://scriptish/utils/PatternCollection.js");

var excludes = new PatternCollection();

function Scriptish_isURLExcluded(url) excludes.test(url);

function Scriptish_addExcludes(aExcludes) excludes.addPatterns(aExcludes);

function Scriptish_setExcludes(aExcludes) {
  excludes.clear();
  excludes.addPatterns(aExcludes);
};

function Scriptish_getExcludes() excludes.patterns;

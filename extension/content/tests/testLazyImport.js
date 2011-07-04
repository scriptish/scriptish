module("Lazy Import");

test("exports", 1, function() checkExported(
    "resource://scriptish/constants.js", ["lazyImport"]));

test("import DNE", 3, function() {
  var lazyImport = importModule("resource://scriptish/constants.js").lazyImport;
  var o = {};
  var imports = ["a", "b"];
  raises(function() {
    lazyImport(o, "resource://scriptish/DNE", imports);
    contains(imports, Object.keys(o));
    strictEqual(o.a, undefined, "a is not defined");
  }, "importing and using a module that DNE should throw");
});

test("import exists",/* any,*/ function() {
  var lazyImport = importModule("resource://scriptish/constants.js").lazyImport;
  var o = {};
  lazyImport(o, "resource://scriptish/utils/Scriptish_stringBundle.js", ["Scriptish_stringBundle"]);
  ok(typeof o.Scriptish_stringBundle == "function");
  deepEqual(Object.keys(o), ["Scriptish_stringBundle"], "only Scriptish_stringBundle should have been exported");
});

test("lazyUtil DNE",/* any,*/ function() {
  var lazyImport = importModule("resource://scriptish/constants.js").lazyImport;
  raises(function() {
    var o = {};
    lazyUtil(o, "DNE");
    deepEqual(Object.keys(o), ["Scriptish_DNE"]);
    o.Scriptish_DNE();
  });
});

test("lazyUtil exists",/* any,*/ function() {
  var lazyImport = importModule("resource://scriptish/constants.js").lazyImport;
  var o = {};
  lazyUtil(o, "stringBundle");
  ok(typeof o.Scriptish_stringBundle == "function");
  deepEqual(Object.keys(o), ["Scriptish_stringBundle"], "only Scriptish_stringBundle should have been exported");
});

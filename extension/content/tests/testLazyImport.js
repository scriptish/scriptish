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
  for (var k in o)
    ok((k == "Scriptish_stringBundle") ? true : false,
        "only Scriptish_stringBundle should have been exported");
});

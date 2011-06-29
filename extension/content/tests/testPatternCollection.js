module("Pattern Collection");

test("exports", function() checkExports(
    "resource://scriptish/utils/PatternCollection.js",
    ["PatternCollection"]
    ));

test("empty", function() {
  var PatternCollection = importModule("resource://scriptish/utils/PatternCollection.js").PatternCollection;

  var pc = new PatternCollection();
  equal(pc.test(""), false, "empty");
  equal(pc.test("foo"), false, "string");
});

test("plain", function() {
  var PatternCollection = importModule("resource://scriptish/utils/PatternCollection.js").PatternCollection;

  var pc = new PatternCollection();
  pc.addPattern("foo");
  deepEqual(pc.patterns, ["foo"], "patterns");
  deepEqual(pc._regs.map(function(e) e.source), ["^foo$"], "regs");
  equal(pc.merged.source, "^foo$", "merged");
  equal(pc.test("foo"), true, "foo");
  equal(pc.test("bar"), false, "bar");
  equal(pc.test("foobar"), false, "foobar");
});

test("wild", function() {
  var PatternCollection = importModule("resource://scriptish/utils/PatternCollection.js").PatternCollection;

  var pc = new PatternCollection();
  pc.addPattern("foo*");
  deepEqual(pc.patterns, ["foo*"], "patterns");
  deepEqual(pc._regs.map(function(e) e.source), ["^foo.*$"], "regs");
  equal(pc.merged.source, "^foo.*$", "merged");
  equal(pc.test("foo"), true, "foo");
  equal(pc.test("bar"), false, "bar");
  equal(pc.test("foobar"), true, "foobar");
});

test("merged", function() {
  var PatternCollection = importModule("resource://scriptish/utils/PatternCollection.js").PatternCollection;

  var pc = new PatternCollection();
  pc.addPattern("foobar*");
  pc.addPattern("foobaz*");
  deepEqual(pc.patterns, ["foobar*", "foobaz*"], "patterns");
  deepEqual(pc._regs.map(function(e) e.source), ["^foobar.*$", "^foobaz.*$"], "regs");
  equal(pc.merged.source, "^fooba(?:r.*$|z.*$)", "merged");
  equal(pc.test("foo"), false, "foo");
  equal(pc.test("fooba"), false, "foobar");
  equal(pc.test("foobar"), true, "foobar");
  equal(pc.test("foobar1"), true, "foobar1");
  equal(pc.test("foobaz2"), true, "foobaz2");
});

test("merged2", function() {
  var PatternCollection = importModule("resource://scriptish/utils/PatternCollection.js").PatternCollection;

  var pc = new PatternCollection();
  pc.addPattern("foo");
  pc.addPattern("foobar*");
  pc.addPattern("foobaz*");
  deepEqual(pc.patterns, ["foo", "foobar*", "foobaz*"], "patterns");
  deepEqual(pc._regs.map(function(e) e.source), ["^foo$", "^foobar.*$", "^foobaz.*$"], "regs");
  equal(pc.merged.source, "^foo(?:$|bar.*$|baz.*$)", "merged");
  equal(pc.test("foo"), true, "foo");
  equal(pc.test("fooba"), false, "foobar");
  equal(pc.test("foobar"), true, "foobar");
  equal(pc.test("foobar1"), true, "foobar1");
  equal(pc.test("foobaz2"), true, "foobaz2");
});

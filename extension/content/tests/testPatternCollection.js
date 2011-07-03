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
  var patterns = ["foobar*", "foobaz*", "/^foobax$/i"];
  pc.addPattern(patterns[0]);
  pc.addPattern(patterns[1]);
  pc.addPattern(patterns[2]);
  deepEqual(pc.patterns, patterns, "patterns");
  deepEqual(
      pc._regs.map(function(e) e.source),
      ["^foobar.*$", "^foobaz.*$", "^foobax$"],
      "regs");
  equal(pc.merged.source, "^fooba(?:r.*$|x$|z.*$)", "merged");
  equal(pc.test("foo"), false, "foo");
  equal(pc.test("fooba"), false, "fooba");
  equal(pc.test("foobar"), true, "foobar");
  equal(pc.test("foobar1"), true, "foobar1");
  equal(pc.test("foobaz2"), true, "foobaz2");
  equal(pc.test("foobax"), true, "foobax");
});

test("merged2", function() {
  var PatternCollection = importModule("resource://scriptish/utils/PatternCollection.js").PatternCollection;

  var pc = new PatternCollection();
  var patterns = ["foobar*", "foobaz*", "/foobax$/i"];
  pc.addPattern(patterns[0]);
  pc.addPattern(patterns[1]);
  pc.addPattern(patterns[2]);
  deepEqual(pc.patterns, patterns, "patterns");
  deepEqual(
      pc._regs.map(function(e) e.source),
      ["^foobar.*$", "^foobaz.*$", "foobax$"],
      "regs");
  equal(pc.merged.source, "^foobar.*$|^foobaz.*$|foobax$", "merged");
  equal(pc.test("foo"), false, "foo");
  equal(pc.test("fooba"), false, "fooba");
  equal(pc.test("foobar"), true, "foobar");
  equal(pc.test("foobar1"), true, "foobar1");
  equal(pc.test("foobaz2"), true, "foobaz2");
  equal(pc.test("123foobaz"), false, "123foobaz");
  equal(pc.test("123foobax"), true, "123foobax");
});

test("merged3", function() {
  var PatternCollection = importModule("resource://scriptish/utils/PatternCollection.js").PatternCollection;

  var pc = new PatternCollection();
  pc.addPattern("foo");
  pc.addPattern("foobar*");
  pc.addPattern("foobaz*");
  deepEqual(pc.patterns, ["foo", "foobar*", "foobaz*"], "patterns");
  deepEqual(pc._regs.map(function(e) e.source), ["^foo$", "^foobar.*$", "^foobaz.*$"], "regs");
  equal(pc.merged.source, "^foo(?:$|bar.*$|baz.*$)", "merged");
  equal(pc.test("foo"), true, "foo");
  equal(pc.test("fooba"), false, "fooba");
  equal(pc.test("foobar"), true, "foobar");
  equal(pc.test("foobar1"), true, "foobar1");
  equal(pc.test("foobaz2"), true, "foobaz2");
});

test("merged4", function() {
  var PatternCollection = importModule("resource://scriptish/utils/PatternCollection.js").PatternCollection;

  var pc = new PatternCollection();
  pc.addPattern("/foobar/i");
  pc.addPattern("/foo|bar/i");
  pc.addPattern("/foo|baz/i");

  equal(pc.test("fo"), false, "fo");
  equal(pc.test("foo"), true, "foo");
  equal(pc.test("foob"), true, "foob");
  equal(pc.test("foobar"), true, "foobar");
  equal(pc.test("ba"), false, "ba");
  equal(pc.test("bar"), true, "bar");
  equal(pc.test("bar1"), true, "bar1");
  equal(pc.test("baz"), true, "baz");
});

test("merged5", function() {
  var PatternCollection = importModule("resource://scriptish/utils/PatternCollection.js").PatternCollection;

  var pc = new PatternCollection();
  pc.addPattern("/fo(o)bar/i");
  pc.addPattern("/fo(o)|(baz)/i");

  equal(pc.test("fo"), false, "fo");
  equal(pc.test("foo"), true, "foo");
  equal(pc.test("foob"), true, "foob");
  equal(pc.test("foobar"), true, "foobar");
  equal(pc.test("ba"), false, "ba");
  equal(pc.test("bar"), false, "bar");
  equal(pc.test("baz1"), true, "baz1");
  equal(pc.test("baz"), true, "baz");
});

test("merged6", function() {
  var PatternCollection = importModule("resource://scriptish/utils/PatternCollection.js").PatternCollection;

  var pc = new PatternCollection();
  pc.addPattern("/a/i");
  pc.addPattern("/toString/i");

  equal(pc.test("fo"), false, "fo");
  equal(pc.test("a"), true, "a");
  equal(pc.test("toString"), true, "toString");
});

test("merged7", function() {
  var PatternCollection = importModule("resource://scriptish/utils/PatternCollection.js").PatternCollection;

  var pc = new PatternCollection();
  pc.addPattern("/fo[\(o]bar/i");
  pc.addPattern("/fo[\(o]|(baz)/i");

  equal(pc.test("fo"), false, "fo");
  equal(pc.test("foo"), true, "foo");
  equal(pc.test("foob"), true, "foob");
  equal(pc.test("foobar"), true, "foobar");
  equal(pc.test("ba"), false, "ba");
  equal(pc.test("bar"), false, "bar");
  equal(pc.test("baz1"), true, "baz1");
  equal(pc.test("baz"), true, "baz");
});

test("merged8", function() {
  var PatternCollection = importModule("resource://scriptish/utils/PatternCollection.js").PatternCollection;

  var pc = new PatternCollection();
  pc.addPattern("/fo[\(o]bar/i");
  pc.addPattern("/fo[\(o]|(baz)/i");

  equal(pc.test("fo"), false, "fo");
  equal(pc.test("foo"), true, "foo");
  equal(pc.test("foob"), true, "foob");
  equal(pc.test("foobar"), true, "foobar");
  equal(pc.test("ba"), false, "ba");
  equal(pc.test("bar"), false, "bar");
  equal(pc.test("baz1"), true, "baz1");
  equal(pc.test("baz"), true, "baz");
});

test("merged9", function() {
  var PatternCollection = importModule("resource://scriptish/utils/PatternCollection.js").PatternCollection;

  var pc = new PatternCollection();
  pc.addPattern("/fo[(((((((o]bar/i");
  pc.addPattern("/fo[(((((((o]|(baz)/i");

  equal(pc.test("fo"), false, "fo");
  equal(pc.test("foo"), true, "foo");
  equal(pc.test("foob"), true, "foob");
  equal(pc.test("foobar"), true, "foobar");
  equal(pc.test("ba"), false, "ba");
  equal(pc.test("bar"), false, "bar");
  equal(pc.test("baz1"), true, "baz1");
  equal(pc.test("baz"), true, "baz");
});

test("tld", function() {
  var PatternCollection = importModule("resource://scriptish/utils/PatternCollection.js").PatternCollection;

  var pc = new PatternCollection();
  pc.addPattern("http://google.tld/*");
  pc.addPattern("http://yahoo.tld/*");
  pc.addPattern("http://bing.com/*");
  pc.addPattern("http://mozilla.com/*");
  deepEqual(pc._regs.map(function(e) e.source), ["^http:\\/\\/bing\\.com\\/.*$", "^http:\\/\\/mozilla\\.com\\/.*$"], "regs");
  deepEqual(pc._regsTLD.map(function(e) e.source), ["^http:\\/\\/google\\.tld\\/.*$", "^http:\\/\\/yahoo\\.tld\\/.*$"], "regsTLD");
  equal(pc.merged.source, "^http:\\/\\/(?:bing\\.com\\/.*$|mozilla\\.com\\/.*$)", "merged");
  equal(pc.mergedTLD.source, "^http:\\/\\/(?:google\\.tld\\/.*$|yahoo\\.tld\\/.*$)", "mergedTLD");
  equal(pc.test("http://mozilla.com/"), true, "moco");
  equal(pc.test("http://mozilla.org/"), false, "mofo");
  equal(pc.test("http://google.de/"), true, "g.de");
  equal(pc.test("http://google.com/"), true, "g.com");
  equal(pc.test("http://google.co.uk/"), true, "g.co.uk");
});

test("clear", function() {
  var PatternCollection = importModule("resource://scriptish/utils/PatternCollection.js").PatternCollection;

  var pc = new PatternCollection();
  pc.addPattern("http://google.tld/*");
  pc.addPattern("http://yahoo.tld/*");
  pc.addPattern("http://bing.com/*");
  pc.addPattern("http://mozilla.com/*");
  equal(pc.merged.source, "^http:\\/\\/(?:bing\\.com\\/.*$|mozilla\\.com\\/.*$)", "merged");
  equal(pc.mergedTLD.source, "^http:\\/\\/(?:google\\.tld\\/.*$|yahoo\\.tld\\/.*$)", "mergedTLD");
  pc.clear();
  deepEqual(pc.patterns, [], "cleared patterns");
  deepEqual(pc._regs, [], "cleared regs");
  deepEqual(pc._regsTLD, [], "cleared regs");
  strictEqual(pc._merged, null, "cleared _merge");
  strictEqual(pc._mergedTLD, null, "cleared _mergeTLD");
  equal(pc.test("http://mozilla.com/"), false, "no matches");
});

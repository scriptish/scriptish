module("Pattern Collection");

(function() {

const optimized = importModule("resource://scriptish/prefmanager.js").Scriptish_prefRoot.getValue("optimizingRegexpMerge");

test("exports", function() checkExports(
    "resource://scriptish/utils/PatternCollection.js",
    ["PatternCollection"]
    ));

test("adding bad things", function() {
  var PatternCollection = importModule("resource://scriptish/utils/PatternCollection.js").PatternCollection;

  var pc = new PatternCollection();
  pc.addPattern(null);
  equal(pc.patterns.length, 0, "adding null does nothing");
  pc.addPattern(undefined);
  equal(pc.patterns.length, 0, "adding undefined does nothing");
  pc.addPatterns([null]);
  equal(pc.patterns.length, 0, "adding [null] does nothing");
});

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
  equal(pc.merged.ignoreCase, true, "ignoreCase");
  equal(pc._hasTLD, false, "hasTLD");
  equal(pc.test("foo"), true, "foo");
  equal(pc.test("bar"), false, "bar");
  equal(pc.test("foobar"), false, "foobar");
});

test("tld", function() {
  var PatternCollection = importModule("resource://scriptish/utils/PatternCollection.js").PatternCollection;

  var tldPattern = "http://google.tld/test";
  var pc = new PatternCollection();
  pc.addPattern(tldPattern);
  deepEqual(pc.patterns, [tldPattern], "patterns");
  deepEqual(pc._regsTLD.map(function(e) e.source), ["^http:\\/\\/google\\.tld\\/test$"], "regsTLD");
  equal(pc.mergedTLD.ignoreCase, true, "ignoreCase");
  equal(pc._hasTLD, true, "hasTLD");
  equal(pc.test("http://google.com/test"), true, "http://google.com/test");
  equal(pc.test("http://google.net/test"), true, "http://google.net/test");
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
  if (optimized) {
    equal(pc.merged.source, "^fooba(?:r.*$|x$|z.*$)", "merged");
  }
  else {
    equal(pc.merged.source, "(?:^foobar.*$)|(?:^foobaz.*$)|(?:^foobax$)", "merged");
  }
  equal(pc.test("foo"), false, "foo");
  equal(pc.test("fooba"), false, "fooba");
  equal(pc.test("foobar"), true, "foobar");
  equal(pc.test("foobar1"), true, "foobar1");
  equal(pc.test("foobaz2"), true, "foobaz2");
  equal(pc.test("foobax"), true, "foobax");
});

test("merged {}", function() {
  var PatternCollection = importModule("resource://scriptish/utils/PatternCollection.js").PatternCollection;

  var pc = new PatternCollection();
  var patterns = ["/ab{2}c/i", "/ab{4}c/i", "/ab{5}c/i"];
  pc.addPatterns(patterns);
  deepEqual(pc.patterns, patterns, "patterns");
  deepEqual(
      pc._regs.map(function(e) e.source),
      ["ab{2}c", "ab{4}c", "ab{5}c"],
      "regs");
  if (optimized) {
    equal(pc.merged.source, "a(?:b{2}c|b{4}c|b{5}c)", "merged");
  }
  else {
    equal(pc.merged.source, "(?:ab{2}c)|(?:ab{4}c)|(?:ab{5}c)", "merged");
  }
});

test("merged {} 2", function() {
  var PatternCollection = importModule("resource://scriptish/utils/PatternCollection.js").PatternCollection;

  var pc = new PatternCollection();
  var patterns = ["/ab(cd){2}c/i", "/ab(cd){4}c/i", "/ab(cd){5}c/i"];
  pc.addPatterns(patterns);
  deepEqual(pc.patterns, patterns, "patterns");
  deepEqual(
      pc._regs.map(function(e) e.source),
      ["ab(cd){2}c", "ab(cd){4}c", "ab(cd){5}c"],
  "regs");
  if (optimized) {
    equal(pc.merged.source, "ab(?:(cd){2}c|(cd){4}c|(cd){5}c)", "merged");
  }
  else {
    equal(pc.merged.source, "(?:ab(cd){2}c)|(?:ab(cd){4}c)|(?:ab(cd){5}c)", "merged");
  }
});

test("merged {} 3", function() {
  var PatternCollection = importModule("resource://scriptish/utils/PatternCollection.js").PatternCollection;

  var pc = new PatternCollection();
  var patterns = ["/ab(cd)e{2}c/i", "/ab(cd)e{4}c/i", "/ab(cd)e{5}c/i"];
  pc.addPatterns(patterns);
  deepEqual(pc.patterns, patterns, "patterns");
  deepEqual(
      pc._regs.map(function(e) e.source),
      ["ab(cd)e{2}c", "ab(cd)e{4}c", "ab(cd)e{5}c"],
  "regs");
  if (optimized) {
    equal(pc.merged.source, "ab(cd)(?:e{2}c|e{4}c|e{5}c)", "merged");
  }
  else {
    equal(pc.merged.source, "(?:ab(cd)e{2}c)|(?:ab(cd)e{4}c)|(?:ab(cd)e{5}c)", "merged");
  }
});

test("merged2 with reg exp", function() {
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
  if (optimized) {
    equal(pc.merged.source, "^foobar.*$|^foobaz.*$|foobax$", "merged");
  }
  else {
    equal(pc.merged.source, "(?:^foobar.*$)|(?:^foobaz.*$)|(?:foobax$)", "merged");
  }
  equal(pc.test("foo"), false, "foo");
  equal(pc.test("fooba"), false, "fooba");
  equal(pc.test("foobar"), true, "foobar");
  equal(pc.test("foobar1"), true, "foobar1");
  equal(pc.test("foobaz2"), true, "foobaz2");
  equal(pc.test("123foobaz"), false, "123foobaz");
  equal(pc.test("123foobax"), true, "123foobax");
});

test("merged2 with sensitive reg exp", function() {
  var PatternCollection = importModule("resource://scriptish/utils/PatternCollection.js").PatternCollection;

  var pc = new PatternCollection();
  var patterns = ["foobar*", "foobaz*", "/foobax$/"];
  pc.addPattern(patterns[0]);
  pc.addPattern(patterns[1]);
  pc.addPattern(patterns[2]);
  deepEqual(pc.patterns, patterns, "patterns");
  deepEqual(
      pc._regs.map(function(e) e.source),
      ["^foobar.*$", "^foobaz.*$"],
      "regs");
  deepEqual(
      pc._regsSensitives.map(function(e) e.source),
      ["foobax$"],
      "regs");
  equal(pc.mergedSensitives.source, "foobax$", "merged");
  equal(pc.mergedSensitives.ignoreCase, false, "ignoreCase");
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
  if (optimized) {
    equal(pc.merged.source, "^foo(?:$|bar.*$|baz.*$)", "merged");
  }
  else {
    equal(pc.merged.source, "(?:^foo$)|(?:^foobar.*$)|(?:^foobaz.*$)", "merged");
  }
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

test("merged10", function() {
  var PatternCollection = importModule("resource://scriptish/utils/PatternCollection.js").PatternCollection;

  var pc = new PatternCollection();
  pc.addPattern("/fo[(((((((o))]bar/i");
  pc.addPattern("/fo[(((((((o))]|(baz)/i");

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
  if (optimized) {
    equal(pc.merged.source, "^http:\\/\\/(?:bing\\.com\\/.*$|mozilla\\.com\\/.*$)", "merged");
    equal(pc.mergedTLD.source, "^http:\\/\\/(?:google\\.tld\\/.*$|yahoo\\.tld\\/.*$)", "mergedTLD");
  }
  else {
    equal(pc.merged.source, "(?:^http:\\/\\/bing\\.com\\/.*$)|(?:^http:\\/\\/mozilla\\.com\\/.*$)", "merged");
    equal(pc.mergedTLD.source, "(?:^http:\\/\\/google\\.tld\\/.*$)|(?:^http:\\/\\/yahoo\\.tld\\/.*$)", "mergedTLD");
  }
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
  pc.clear();
  deepEqual(pc.patterns, [], "cleared patterns");
  deepEqual(pc._regs, [], "cleared regs");
  deepEqual(pc._regsTLD, [], "cleared regs");
  strictEqual(pc._merged, null, "cleared _merge");
  strictEqual(pc._mergedTLD, null, "cleared _mergeTLD");
  equal(pc.test("http://mozilla.com/"), false, "no matches");
});

test("untainted", 1, function() {
  var PatternCollection = importModule("resource://scriptish/utils/PatternCollection.js").PatternCollection;

  var pc = new PatternCollection();
  pc.addPattern("foo");
  pc.addPattern("bar");
  pc.addPattern("/(foo)baz\\\\1/i");
  pc.addPattern("/(foo)baz\\\\x25/i");
  pc.addPattern("/(foo)baz\\\\u0025/i");
  notEqual(pc.merged.source, undefined, "untainted");
});

test("tainted backref", 2, function() {
  var PatternCollection = importModule("resource://scriptish/utils/PatternCollection.js").PatternCollection;

  var pc = new PatternCollection();
  pc.addPattern("foo");
  pc.addPattern("bar");
  pc.addPattern("/(foo)bad\\1/i");
  pc.addPattern("/(foo)baz\\1/i");
  if (optimized) {
    equal(pc.merged.source, "(?:^(?:bar$|foo$))|(?:(foo)bad\\1)|(?:(foo)baz\\1)", "tainted");
  }
  else {
    equal(pc.merged.source, "(?:^foo$)|(?:^bar$)|(?:(foo)bad\\1)|(?:(foo)baz\\1)", "tainted");
  }
  equal(pc.test("foobazfoo"), true, "test");
});

test("tainted \\x escape", function() {
  var PatternCollection = importModule("resource://scriptish/utils/PatternCollection.js").PatternCollection;

  var pc = new PatternCollection();
  pc.addPattern("foo");
  pc.addPattern("bar");
  pc.addPattern("/(foo)baz\\x25/i");
  if (optimized) {
    equal(pc.merged.source, "(?:^(?:bar$|foo$))|(?:(foo)baz\\x25)", "tainted");
  }
  else {
    equal(pc.merged.source, "(?:^foo$)|(?:^bar$)|(?:(foo)baz\\x25)", "tainted");
  }
  equal(pc.test("foobaz\x25"), true, "test");
});

test("tainted \\u escape", function() {
  var PatternCollection = importModule("resource://scriptish/utils/PatternCollection.js").PatternCollection;

  var pc = new PatternCollection();
  pc.addPattern("foo");
  pc.addPattern("bar");
  pc.addPattern("/(foo)baz\\u0025/i");
  if (optimized) {
    equal(pc.merged.source, "(?:^(?:bar$|foo$))|(?:(foo)baz\\u0025)", "tainted");
  }
  else {
    equal(pc.merged.source, "(?:^foo$)|(?:^bar$)|(?:(foo)baz\\u0025)", "tainted");
  }
  equal(pc.test("foobaz\u0025"), true, "test");
});

test("https://github.com/scriptish/scriptish/issues/19", function() {
  var PatternCollection = importModule("resource://scriptish/utils/PatternCollection.js").PatternCollection;

  var pc = new PatternCollection();
  pc.addPattern("http://tieba.baidu.com/*");
  pc.addPattern("http://tieba.baidu.com.cn/*");
  if (optimized) {
    equal(pc.merged.source, "^http:\\/\\/tieba\\.baidu\\.com(?:\\.cn\\/.*$|\\/.*$)", "issue/19");
  }
  else {
    equal(pc.merged.source, "(?:^http:\\/\\/tieba\\.baidu\\.com\\/.*$)|(?:^http:\\/\\/tieba\\.baidu\\.com\\.cn\\/.*$)", "issue/19");
  }
});

test("https://github.com/scriptish/scriptish/issues/19 2", function() {
  var PatternCollection = importModule("resource://scriptish/utils/PatternCollection.js").PatternCollection;

  var pc = new PatternCollection();
  pc.addPattern("abc\\de");
  pc.addPattern("abc\\ef");
  if (optimized) {
    equal(pc.merged.source, "^abc\\\\(?:de$|ef$)", "issue/19 2");
  }
  else {
    equal(pc.merged.source, "(?:^abc\\\\de$)|(?:^abc\\\\ef$)", "issue/19 2");
  }
});

})();

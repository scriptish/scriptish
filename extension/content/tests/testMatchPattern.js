module("Match Pattern");

test("exports", 1, function() {
  checkExports("resource://scriptish/third-party/MatchPattern.js", ["MatchPattern"]);
});

test("&lt;all_urls&gt;", 2, function() {
  var {MatchPattern} = importModule("resource://scriptish/third-party/MatchPattern.js");
  var m = new MatchPattern("<all_urls>");
  ok(m.doMatch("http://google.com/"));
  ok(!m.doMatch("extern://google.com/"));
});

test("* scheme", 4, function() {
  var {MatchPattern} = importModule("resource://scriptish/third-party/MatchPattern.js");
  var m = new MatchPattern("*://google.com/");
  ok(m.doMatch("http://google.com/"));
  ok(m.doMatch("https://google.com/"));
  ok(!m.doMatch("file://google.com/"));
  ok(!m.doMatch("extern://google.com/"));
});

test("fully defined", 5, function() {
  var {MatchPattern} = importModule("resource://scriptish/third-party/MatchPattern.js");
  var m = new MatchPattern("http://google.com/");
  ok(m.doMatch("http://google.com/"));
  ok(!m.doMatch("https://google.com/"));
  ok(!m.doMatch("file://google.com/"));
  ok(!m.doMatch("extern://google.com/"));
  ok(!m.doMatch("http://google.com/a"));
});

test("fully wild host", 6, function() {
  var {MatchPattern} = importModule("resource://scriptish/third-party/MatchPattern.js");
  var m = new MatchPattern("http://*/");
  ok(m.doMatch("http://google.com/"));
  ok(m.doMatch("http://www.google.com/"));
  ok(m.doMatch("http://www.mail.google.com/"));
  ok(!m.doMatch("https://google.com/"));
  ok(!m.doMatch("extern://google.com/"));
  ok(!m.doMatch("http://google.com/a"));
});

test("wild host", 8, function() {
  var {MatchPattern} = importModule("resource://scriptish/third-party/MatchPattern.js");
  var m = new MatchPattern("http://*.google.com/");
  ok(m.doMatch("http://google.com/"));
  ok(m.doMatch("http://www.google.com/"));
  ok(m.doMatch("http://www.mail.google.com/"));
  ok(!m.doMatch("https://google.com/"));
  ok(!m.doMatch("extern://google.com/"));
  ok(!m.doMatch("http://google.com/a"));
  ok(!m.doMatch("http://example.org/www.google.com/"));
  ok(!m.doMatch("http://example.org/?www.google.com/"));
});

test("wild host invalid", 1, function() {
  var {MatchPattern} = importModule("resource://scriptish/third-party/MatchPattern.js");
  raises(function() new MatchPattern("http://docs.*.google.com/"));
});

test("wild path", 5, function() {
  var {MatchPattern} = importModule("resource://scriptish/third-party/MatchPattern.js");
  var m = new MatchPattern("http://google.com/*");
  ok(m.doMatch("http://google.com/"));
  ok(!m.doMatch("https://google.com/"));
  ok(!m.doMatch("file://google.com/"));
  ok(!m.doMatch("extern://google.com/"));
  ok(m.doMatch("http://google.com/a"));
});

test("wild path2", 8, function() {
  var {MatchPattern} = importModule("resource://scriptish/third-party/MatchPattern.js");
  var m = new MatchPattern("http://*.google.com/a/*");
  ok(m.doMatch("http://google.com/a/"));
  ok(m.doMatch("http://www.google.com/a/"));
  ok(!m.doMatch("https://google.com/a/"));
  ok(!m.doMatch("file://google.com/a/"));
  ok(!m.doMatch("extern://google.com/a/"));
  ok(m.doMatch("http://google.com/a/bc"));
  ok(!m.doMatch("http://docs.google.com/a"));
  ok(!m.doMatch("http://example.org/docs.google.com/a/"));
});

test("file", 4, function() {
  var {MatchPattern} = importModule("resource://scriptish/third-party/MatchPattern.js");
  var m = new MatchPattern("file:///dude*");
  ok(m.doMatch("file:///dude"));
  ok(m.doMatch("file:///dudette"));
  ok(!m.doMatch("file://dude"));
  // moz currently ignores the "host" portion of a file: URI, here "dude"
  // Hence the following test is valid
  ok(m.doMatch("file://dude/dudette"));
});

test("issue 405", 2, function() {
  var {MatchPattern} = importModule("resource://scriptish/third-party/MatchPattern.js");
  var m = new MatchPattern("*://*.somesite.com/somepage.php?*");
  ok(m.doMatch("http://somesite.com/somepage.php?id=1"));
  ok(m.doMatch("https://www.somesite.com/somepage.php?id=1"));
});

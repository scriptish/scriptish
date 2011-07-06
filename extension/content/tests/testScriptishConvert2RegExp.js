module("Scriptish_convert2RegExp");

test("exports", function() {
  checkExports(
    "resource://scriptish/utils/Scriptish_convert2RegExp.js",
    ["Scriptish_convert2RegExp"]
    );
});

test("Regular @includes", 6, function() {
  var c2r = importModule("resource://scriptish/utils/Scriptish_convert2RegExp.js").Scriptish_convert2RegExp;
  var url = "https://google.com/";
  var regExp = c2r("https://google.com/*");
  equal(
    regExp.toString(),
    "/^https:\\/\\/google\\.com\\/.*$/i",
    "Regular @include"
  );
  equal(regExp.isTLD, false, "should not be a tld");
  ok(regExp.test(url));

  regExp = c2r("https?://google.tld/*");
  equal(
    regExp.toString(),
    "/^https\\?:\\/\\/google\\.tld\\/.*$/i",
    "@include with ?"
  );
  equal(regExp.isTLD, true, "should be a tld");

  equal(c2r("***").toString(), "/^.*$/i", "@include ***");
});

test("Regular Exp @includes", 5, function() {
  var c2r = importModule("resource://scriptish/utils/Scriptish_convert2RegExp.js").Scriptish_convert2RegExp;
  var url = "http://google.com/";
  var regExp = c2r("/https?:\/\/google\\.com\/.*/i");
  equal(
    regExp.toString(),
    "/https?:\\/\\/google\\.com\\/.*/i",
    "Reg exp @include, with i flag"
  );
  ok(regExp.test("http://GOOGLE.COM/"));

  var regExp = c2r("/https?:\/\/google\\.com\/.*/");
  equal(
    regExp.toString(),
    "/https?:\\/\\/google\\.com\\/.*/",
    "Reg exp @include"
  );
  ok(regExp.test(url));
  ok(!regExp.test("http://googleTcom/"));
});

test("forceString", function() {
  var c2r = importModule("resource://scriptish/utils/Scriptish_convert2RegExp.js").Scriptish_convert2RegExp;
  var regExp = c2r("/notaregexp/i", false, true);
  equal(regExp.source, "^\\/notaregexp\\/i$", "not a regexp");
});

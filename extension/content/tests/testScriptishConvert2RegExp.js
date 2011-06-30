
Components.utils.import("resource://scriptish/utils/Scriptish_convert2RegExp.js");

module("Scriptish_convert2RegExp");

test("Regular @includes", 5, function() {
  var url = "https://google.com/";
  var regExp = Scriptish_convert2RegExp("https://google.com/*");
  equal(
    regExp.toString(),
    "/^https:\\/\\/google\\.com\\/.*$/i",
    "Regular @include"
  );
  equal(regExp.isTLD, undefined, "should not be a tld");
  ok(regExp.test(url));

  regExp = Scriptish_convert2RegExp("https?://google.tld/*");
  equal(
    regExp.toString(),
    "/^https\\?:\\/\\/google\\.tld\\/.*$/i",
    "@include with ?"
  );
  equal(regExp.isTLD, true, "should be a tld");
});

test("Regular Exp @includes", 5, function() {
  var url = "http://google.com/";
  var regExp = Scriptish_convert2RegExp("/https?:\/\/google\\.com\/.*/i");
  equal(
    regExp.toString(),
    "/https?:\\/\\/google\\.com\\/.*/i",
    "Reg exp @include, with i flag"
  );
  ok(regExp.test("http://GOOGLE.COM/"));

  var regExp = Scriptish_convert2RegExp("/https?:\/\/google\\.com\/.*/");
  equal(
    regExp.toString(),
    "/https?:\\/\\/google\\.com\\/.*/",
    "Reg exp @include"
  );
  ok(regExp.test(url));
  ok(!regExp.test("http://googleTcom/"));
});

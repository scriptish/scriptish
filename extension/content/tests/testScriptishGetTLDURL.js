
Components.utils.import("resource://scriptish/utils/Scriptish_getTLDURL.js");

module("Scriptish_getTLDURL");

test("General", 7, function() {
  equal(Scriptish_getTLDURL("http://erikvold.com"), "http://erikvold.tld/");
  equal(Scriptish_getTLDURL("http://erikvold.tld"), "http://erikvold.tld/");
  equal(Scriptish_getTLDURL("http://erikvold.com?test"), "http://erikvold.tld/?test");
  equal(Scriptish_getTLDURL("http://erikvold.com/"), "http://erikvold.tld/");
  equal(Scriptish_getTLDURL("http://images.google.com"), "http://images.google.tld/");
  equal(Scriptish_getTLDURL("https://images.google.com:90/test?a=b"), "https://images.google.tld:90/test?a=b");
  equal(Scriptish_getTLDURL("http://test.images.google.com/test"), "http://test.images.google.tld/test");
});

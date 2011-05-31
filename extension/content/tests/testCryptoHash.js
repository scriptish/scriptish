
Components.utils.import("resource://scriptish/utils/Scriptish_cryptoHash.js", tools);

module("Scriptish_cryptoHash");

test("General", function() {
  expect(2);

  var str = "Hello World!";
  var str_DEF_SHA1 = tools.Scriptish_cryptoHash(str);
  var str_SHA1 = tools.Scriptish_cryptoHash(str, "SHA1");

  equal(str_DEF_SHA1, "2ef7bde608ce5404e97d5f042f95f89f1c232871", "Default hashing algorithm is SHA1");
  equal(str_SHA1, "2ef7bde608ce5404e97d5f042f95f89f1c232871", "Specifying an algorithm (SHA1) works");
});

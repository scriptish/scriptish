
Components.utils.import("resource://scriptish/scriptish.js");

module("Scriptish.isGreasemonkeyable");
var PREF_BRANCH = Services.prefs.getBranch("extensions.scriptish.");

test("HTTP", function() {
  expect(4);

  equal(
      Scriptish.isGreasemonkeyable("http://google.com"),
      true,
      "http://google.com should be ok");
  equal(
      Scriptish.isGreasemonkeyable("HTTP://"),
      false,
      "HTTP:// should not be ok");
  equal(
      Scriptish.isGreasemonkeyable("http://"),
      true,
      "http:// should be ok");
  equal(
      Scriptish.isGreasemonkeyable("http"),
      false,
      "http not should be ok");
});

test("HTTPS", function() {
  expect(4);

  equal(
      Scriptish.isGreasemonkeyable("https://google.com"),
      true,
      "https://google.com should be ok");
  equal(
      Scriptish.isGreasemonkeyable("HTTPS://"),
      false,
      "HTTPS:// should not be ok");
  equal(
      Scriptish.isGreasemonkeyable("https://"),
      true,
      "https:// should be ok");
  equal(
      Scriptish.isGreasemonkeyable("https"),
      false,
      "https not should be ok");
});

test("ABOUT", function() {
  expect(6);
  try {
    var aboutIsGMable = PREF_BRANCH.getBoolPref("enabledSchemes.about");
  } catch (e) {
    var aboutIsGMable = false; // default
  }

  equal(
      Scriptish.isGreasemonkeyable("about:blank"),
      true,
      "about:blank is always ok");
  equal(
      Scriptish.isGreasemonkeyable("about:blank?test"),
      true,
      "about:blank?test is always ok");
  equal(
      Scriptish.isGreasemonkeyable("about:home"),
      aboutIsGMable,
      "about:home is " + (aboutIsGMable ? "ok" : "not ok"));
  equal(
      Scriptish.isGreasemonkeyable("about:"),
      aboutIsGMable,
      "about: is ok");
  equal(
      Scriptish.isGreasemonkeyable("ABOUT:"),
      false,
      "ABOUT: is not ok");
  equal(
      Scriptish.isGreasemonkeyable("about"),
      false,
      "about is not ok");
});

test("FILE", function() {
  expect(5);
  try {
    var fileIsGMable = PREF_BRANCH.getBoolPref("enabledSchemes.file");
  } catch (e) {
    var fileIsGMable = false; // default
  }

  equal(
      Scriptish.isGreasemonkeyable("file://"),
      fileIsGMable,
      "file:// is " + (fileIsGMable ? "ok" : "not ok"));
  equal(
      Scriptish.isGreasemonkeyable("file:"),
      fileIsGMable,
      "file: is " + (fileIsGMable ? "ok" : "not ok"));
  equal(
      Scriptish.isGreasemonkeyable("file:///test.html"),
      fileIsGMable,
      "file:///test.html is " + (fileIsGMable ? "ok" : "not ok"));
  equal(
      Scriptish.isGreasemonkeyable("FILE:"),
      false,
      "FILE: is not ok");
  equal(
      Scriptish.isGreasemonkeyable("file"),
      false,
      "file is not ok");
});

test("UNMHT", function() {
  expect(5);
  try {
    var unmhtIsGMable = PREF_BRANCH.getBoolPref("enabledSchemes.unmht");
  } catch (e) {
    var unmhtIsGMable = false; // default
  }

  equal(
      Scriptish.isGreasemonkeyable("unmht://"),
      unmhtIsGMable,
      "unmht:// is " + (unmhtIsGMable ? "ok" : "not ok"));
  equal(
      Scriptish.isGreasemonkeyable("unmht:"),
      unmhtIsGMable,
      "unmht: is " + (unmhtIsGMable ? "ok" : "not ok"));
  equal(
      Scriptish.isGreasemonkeyable("unmht:///test.html"),
      unmhtIsGMable,
      "unmht:///test.html is " + (unmhtIsGMable ? "ok" : "not ok"));
  equal(
      Scriptish.isGreasemonkeyable("UNMHT:"),
      false,
      "UNMHT: is not ok");
  equal(
      Scriptish.isGreasemonkeyable("unmht"),
      false,
      "unmht is not ok");
});


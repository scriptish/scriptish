module("Script.parseVersion");

test("1 @version", function() {
  var parser = importModule("resource://scriptish/script/script.js").Script.parseVersion;
  var header = (<><![CDATA[
  // ==UserScript==
  // @id test-id
  // @version 1
  // ==/UserScript==
  ]]></>).toString();
  var parsed = parser(header);

  equal(parsed, "1", "@version");
});

test("2 @version", function() {
  var parser = importModule("resource://scriptish/script/script.js").Script.parseVersion;
  var header = (<><![CDATA[
  // ==UserScript==
  // @id test-id
  // @version 1
  // @version 2
  // ==/UserScript==
  ]]></>).toString();
  var parsed = parser(header);

  equal(parsed, "2", "@version");
});

test("2 @version no leading space", function() {
  var parser = importModule("resource://scriptish/script/script.js").Script.parseVersion;
  var header = (<><![CDATA[
  //==UserScript==
  //@id test-id
  //@version 1
  //@version 2
  //==/UserScript==
  ]]></>).toString();
  var parsed = parser(header);

  equal(parsed, "2", "@version");
});

test("2 @version mixed", function() {
  var parser = importModule("resource://scriptish/script/script.js").Script.parseVersion;
  var header = (<><![CDATA[
  // ==UserScript==
  // @id test-id
  // @version 1
  // @key value
  // @Version 2
  // ==/UserScript==
  ]]></>).toString();
  var parsed = parser(header);

  equal(parsed, "2", "@version");
});

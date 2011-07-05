module("Script.header_parse");

test("normal @keys (with space b4 @)", function() {
  var parser = importModule("resource://scriptish/script/script.js").Script.header_parse;
  var header = (<><![CDATA[
  // ==UserScript==
  // @id test-id
  // @name test-name
  // @version test-version
  // @version test-version-II
  // @key v1 v2 v3
  // @key v1 v2
  // ==/UserScript==
  ]]></>).toString();
  var parsed = parser(header);

  deepEqual(parsed.id, ["test-id"], "@id found");
  deepEqual(parsed.name, ["test-name"], "@name found");
  deepEqual(parsed.version, ["test-version", "test-version-II"], "@versions found");
  deepEqual(parsed.key, ["v1 v2 v3", "v1 v2"], "@key w/ multiple values found");
  equal(parsed.fail, undefined, "@fail not found");
});

test("normal @keys and following @fail", function() {
  var parser = importModule("resource://scriptish/script/script.js").Script.header_parse;
  var header = (<><![CDATA[
  // ==UserScript==
  // @id test-id
  // @name test-name
  // @version test-version
  // @version test-version-II
  // ==/UserScript==
  // @fail test-fail
  ]]></>).toString();
  var parsed = parser(header);

  deepEqual(parsed.id, ["test-id"], "@id found");
  deepEqual(parsed.name, ["test-name"], "@name found");
  deepEqual(parsed.version, ["test-version", "test-version-II"], "@versions found");
  equal(parsed.fail, undefined, "@fail not found");
});

test("normal @keys and leading @fail", function() {
  var parser = importModule("resource://scriptish/script/script.js").Script.header_parse;
  var header = (<><![CDATA[
  // @fail test-fail
  // ==UserScript==
  // @id test-id
  // @name test-name
  // @version test-version
  // @version test-version-II
  // ==/UserScript==
  ]]></>).toString();
  var parsed = parser(header);

  deepEqual(parsed.id, ["test-id"], "@id found");
  deepEqual(parsed.name, ["test-name"], "@name found");
  deepEqual(parsed.version, ["test-version", "test-version-II"], "@versions found");
  equal(parsed.fail, undefined, "@fail not found");
});

test("two sets of normal @keys", function() {
  var parser = importModule("resource://scriptish/script/script.js").Script.header_parse;
  var header = (<><![CDATA[
  // ==UserScript==
  // @id test-id
  // @name test-name
  // @version test-version
  // @version test-version-II
  // ==/UserScript==
  // ==UserScript==
  // @fail test-fail
  // ==/UserScript==
  ]]></>).toString();
  var parsed = parser(header);

  deepEqual(parsed.id, ["test-id"], "@id found");
  deepEqual(parsed.name, ["test-name"], "@name found");
  deepEqual(parsed.version, ["test-version", "test-version-II"], "@versions found");
  equal(parsed.fail, undefined, "@fail not found");
});

test("@keys without space b4 @", function() {
  var parser = importModule("resource://scriptish/script/script.js").Script.header_parse;
  var header = (<><![CDATA[
  //==UserScript==
  //@id test-id
  //@name test-name
  //@version test-version
  //@version test-version-II
  //@key v1 v2 v3
  //@key v1 v2
  //==/UserScript==
  //@fail test-fail
  ]]></>).toString();
  var parsed = parser(header);

  deepEqual(parsed.id, ["test-id"], "@id found");
  deepEqual(parsed.name, ["test-name"], "@name found");
  deepEqual(parsed.version, ["test-version", "test-version-II"], "@versions found");
  deepEqual(parsed.key, ["v1 v2 v3", "v1 v2"], "@key w/ multiple values found");
  equal(parsed.fail, undefined, "@fail not found");
});

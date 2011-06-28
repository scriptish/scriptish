module("CreateUserScriptSource");

test("check", function() {
  var _ = importModule("resource://scriptish/utils/Scriptish_createUserScriptSource.js");
  var src;

  src = _.Scriptish_createUserScriptSource({
    id: "simple"
  }, "");
  src = src.replace(/\r\n/g,"\n");
  equal(src, "// ==UserScript==\n// @id             simple\n// ==/UserScript==\n");

  src = _.Scriptish_createUserScriptSource({
    id: "mixed",
    plain_a: ["a", "b", "c"],
    mixed_a: [1, 1.2, "foo"],
    plain: "abc",
    bool: true,
    bool_f: false
  }, "content");
  src = src.replace(/\r\n/g,"\n");
  equal(src, "// ==UserScript==\n// @id             mixed\n// @plain_a        a\n// @plain_a        b\n// @plain_a        c\n// @mixed_a        1\n// @mixed_a        1.2\n// @mixed_a        foo\n// @plain          abc\n// @bool\n// ==/UserScript==\n\ncontent\n");
});

test("invalid ids", function() {
  var _ = importModule("resource://scriptish/utils/Scriptish_createUserScriptSource.js");

  ok(_.Scriptish_createUserScriptSource({id:"ok"}), "string");
  raises(function() _.Scriptish_createUserScriptSource({}), "no id");
  raises(function() _.Scriptish_createUserScriptSource({id: null}), "null");
  raises(function() _.Scriptish_createUserScriptSource({id: 1}), "int");
  raises(function() _.Scriptish_createUserScriptSource({id: 1.1}), "float");
  raises(function() _.Scriptish_createUserScriptSource({id: true}), "bool");
  raises(function() _.Scriptish_createUserScriptSource({id: undefined}), "undefined");
  raises(function() _.Scriptish_createUserScriptSource({id: ["abc"]}), "array");
});

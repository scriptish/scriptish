var EXPORTED_SYMBOLS = ["Scriptish_createUserScriptSource"];
Components.utils.import("resource://scriptish/constants.js");
Components.utils.import("resource://scriptish/utils/Scriptish_stringBundle.js");

function Scriptish_createUserScriptSource(aHeader) {
  var script = ["// ==UserScript=="];
  var tmpAry, val, i;

  if (aHeader.id)
    script.push("// @id             "+aHeader.id);
  else
    throw new Error(Scriptish_stringBundle("newscript.noID"));

  if (aHeader.name)
    script.push("// @name           "+aHeader.name);
  else
    throw new Error(Scriptish_stringBundle("newscript.noName"));

  if (aHeader.namespace)
    script.push("// @namespace      "+aHeader.namespace);

  if (aHeader.description)
    script.push("// @description    "+aHeader.description);

  if (aHeader.noframes
      || (typeof aHeader.noframes == "string" && "" == aHeader.noframes))
    script.push("// @noframes");

  if (tmpAry = aHeader.matches)
    for (i = 0; val = tmpAry[i++];)
      script.push("// @match          "+val);

  if (tmpAry = aHeader.includes)
    for (i = 0; val = tmpAry[i++];)
      script.push("// @include        "+val);

  if (tmpAry = aHeader.excludes)
    for (i = 0; val = tmpAry[i++];)
      script.push("// @exclude        "+val);

  script.push("// ==/UserScript==");
  return script.join(Services.appinfo.OS == "WINNT" ? "\r\n" : "\n");
}

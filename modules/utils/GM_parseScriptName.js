
// JSM exported symbols
var EXPORTED_SYMBOLS = ["GM_parseScriptName"];

function GM_parseScriptName(sourceUri) {
  var name = sourceUri.spec;
  name = name.substring(0, name.indexOf(".user.js"));
  name = name.substring(name.lastIndexOf("/") + 1);
  return name;
}


// JSM exported symbols
var EXPORTED_SYMBOLS = ["Scriptish_parseScriptName"];

const Scriptish_parseScriptName = function(sourceUri) {
  var name = sourceUri.spec;
  name = name.substring(0, name.indexOf(".user.js"));
  name = name.substring(name.lastIndexOf("/") + 1);
  return name;
}


// JSM exported symbols
var EXPORTED_SYMBOLS = ["Scriptish_parseScriptName"];

const Scriptish_parseScriptName = function(aURL) {
  if (!aURL) return "";
  var tmp = aURL.match(/\/([^\/]+)\.user(?:-\d+)?\.js([\?#][^\/]*)?$/);
  if (tmp) return tmp[1];
  return "";
}

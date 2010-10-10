var EXPORTED_SYMBOLS = ["Scriptish_parseScriptName"];
function Scriptish_parseScriptName(aURL) {
  if (!aURL) return "";
  var tmp = aURL.match(/\/([^\/]+)\.user(?:-\d+)?\.js([\?#][^\/]*)?$/);
  if (tmp) return tmp[1];
  return "";
}

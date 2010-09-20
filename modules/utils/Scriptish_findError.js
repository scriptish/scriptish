
var EXPORTED_SYMBOLS = ["Scriptish_findError"];

function Scriptish_findError(aScript, aLineNum) {
  var start = 0;
  var end = 1;
  var len = aScript.offsets.length;

  for (var i = 0; i < len; i++) {
    end = aScript.offsets[i];
    if (aLineNum < end) {
      return {
        uri: aScript.requires[i].fileURL,
        lineNumber: (aLineNum - start)
      };
    }
    start = end;
  }

  return {
    uri: aScript.fileURL,
    lineNumber: (aLineNum - end)
  };
}

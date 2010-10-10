var EXPORTED_SYMBOLS = ["Scriptish_getWriteStream"];
Components.utils.import("resource://scriptish/constants.js");

const Scriptish_getWriteStream = function(aFile) {
  var stream = Scriptish_Services.fos;
  stream.init(aFile, 0x02 | 0x08 | 0x20, 420, -1);
  return stream;
}

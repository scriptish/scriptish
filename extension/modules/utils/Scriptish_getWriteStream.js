var EXPORTED_SYMBOLS = ["Scriptish_getWriteStream"];
Components.utils.import("resource://scriptish/constants.js");

const Scriptish_getWriteStream = function(aFile, aAsync) {
  var fos = Instances.fos;
  fos.init(aFile, 0x02 | 0x08 | 0x20, 420, (aAsync) ? fos.DEFER_OPEN : -1);
  return fos;
}

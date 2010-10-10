var EXPORTED_SYMBOLS = ["Scriptish_getTempFile"];
Components.utils.import("resource://scriptish/constants.js");

function Scriptish_getTempFile() {
  var file = Services.dirsvc.get("TmpD", Ci.nsILocalFile);
  file.append("scriptish-temp");
  file.createUnique(Ci.nsILocalFile.NORMAL_FILE_TYPE, 0640);
  return file;
}
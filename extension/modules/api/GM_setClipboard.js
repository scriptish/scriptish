var EXPORTED_SYMBOLS = ["GM_setClipboard"];
Components.utils.import("resource://scriptish/constants.js");
function GM_setClipboard(aData, aType) {
  if (aType && aType != "text")
    throw "'" + aType + "' is not a type that is supported by GM_setClipboard.";
  Scriptish_Services.cb.copyString(aData);
}

var EXPORTED_SYMBOLS = ["GM_setClipboard"];
Components.utils.import("resource://scriptish/constants.js");
Components.utils.import("resource://scriptish/utils/Scriptish_stringBundle.js");
function GM_setClipboard(aData, aType) {
  if (aType && aType != "text")
    throw "'" + aType + "' " + Scriptish_stringBundle("error.api.clipboard.type");
  Services.cb.copyString(aData);
}

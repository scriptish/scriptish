var EXPORTED_SYMBOLS = ["GM_setClipboard"];
Components.utils.import("resource://scriptish/constants.js");
lazyUtil(this, "stringBundle");

function GM_setClipboard(aData, aType) {
  if (aType && aType != "text")
    throw new Error("'" + aType + "' " + Scriptish_stringBundle("error.api.clipboard.type"));
  Services.cb.copyString(aData);
}

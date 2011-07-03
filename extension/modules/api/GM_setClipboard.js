var EXPORTED_SYMBOLS = ["GM_setClipboard"];
Components.utils.import("resource://scriptish/constants.js");
lazyImport(this, "resource://scriptish/utils/Scriptish_stringBundle.js", ["Scriptish_stringBundle"]);

function GM_setClipboard(aData, aType) {
  if (aType && aType != "text")
    throw new Error("'" + aType + "' " + Scriptish_stringBundle("error.api.clipboard.type"));
  Services.cb.copyString(aData);
}

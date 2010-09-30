
var EXPORTED_SYMBOLS = ["GM_setClipboard"];

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyServiceGetter(
    this, "cbHelper", "@mozilla.org/widget/clipboardhelper;1",
    "nsIClipboardHelper");

function GM_setClipboard(aData, aType) {
  if (aType && aType != "text")
    throw "'" + aType + "' is not a type that is supported by GM_setClipboard.";

  cbHelper.copyString(aData);
}

var EXPORTED_SYMBOLS = ["GM_setClipboard"];
Components.utils.import("resource://scriptish/constants.js");
const { set: GM_setClipboard } = jetpack("sdk/clipboard");

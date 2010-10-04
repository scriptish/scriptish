var EXPORTED_SYMBOLS = ["Scriptish_getUriFromFile"];
Components.utils.import("resource://scriptish/constants.js");
const Scriptish_getUriFromFile = function (aFile) Services.io.newFileURI(aFile);

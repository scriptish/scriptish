var EXPORTED_SYMBOLS = ["Q"];

Components.utils.import("resource://scriptish/constants.js");

const setTimeout = timeout;

Services.scriptloader
    .loadSubScript("chrome://scriptish/content/js/third-party/q.js", this);

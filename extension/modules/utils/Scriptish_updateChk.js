var EXPORTED_SYMBOLS = [];

Components.utils.import("resource://scriptish/constants.js");

timeout(function() {
  Services.scriptloader
      .loadSubScript("chrome://scriptish/content/js/updatecheck.js");
}, 750);

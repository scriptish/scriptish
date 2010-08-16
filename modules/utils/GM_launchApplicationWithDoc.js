
// JSM exported symbols
var EXPORTED_SYMBOLS = ["GM_launchApplicationWithDoc"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
Cu.import("resource://scriptish/utils/GM_os.js");

const GM_launchApplicationWithDoc = function(appFile, docFile) {
  var args = [docFile.path];

  // For the mac, wrap with a call to "open".
  if ("Darwin" == GM_os) {
    args = ["-a", appFile.path, docFile.path];

    appFile = Cc["@mozilla.org/file/local;1"]
        .createInstance(Ci.nsILocalFile);
    appFile.followLinks = true;
    appFile.initWithPath("/usr/bin/open");
  }

  var process = Cc["@mozilla.org/process/util;1"]
      .createInstance(Ci.nsIProcess);
  process.init(appFile);
  process.run(false, args, args.length);
}

var EXPORTED_SYMBOLS = ["Scriptish_launchApplicationWithDoc"];
Components.utils.import("resource://scriptish/constants.js");

const Scriptish_launchApplicationWithDoc = function(appFile, docFile) {
  var args = [docFile.path];

  // For the mac, wrap with a call to "open".
  if ("Darwin" == Services.appinfo.OS) {
    args = ["-a", appFile.path, docFile.path];

    appFile = Scriptish_Services.lf;
    appFile.followLinks = true;
    appFile.initWithPath("/usr/bin/open");
  }

  var process = Cc["@mozilla.org/process/util;1"]
      .createInstance(Ci.nsIProcess);
  process.init(appFile);
  process.runwAsync(args, args.length);
}

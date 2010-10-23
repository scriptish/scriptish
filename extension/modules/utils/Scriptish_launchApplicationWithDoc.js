var EXPORTED_SYMBOLS = ["Scriptish_launchApplicationWithDoc"];
Components.utils.import("resource://scriptish/constants.js");

const Scriptish_launchApplicationWithDoc = function(appFile, docFile) {
  var args = [docFile.path];

  // For the mac, wrap with a call to "open".
  if ("Darwin" == Services.appinfo.OS) {
    args = ["-a", appFile.path, docFile.path];

    appFile = Instances.lf;
    appFile.followLinks = true;
    appFile.initWithPath("/usr/bin/open");
  }

  var process = Instances.process;
  process.init(appFile);
  process.runwAsync(args, args.length);
}

var EXPORTED_SYMBOLS = ["Scriptish_logError", "Scriptish_log"];
(function(inc){
  inc("resource://scriptish/constants.js");
  inc("resource://scriptish/prefmanager.js");
})(Components.utils.import)

// Utility to create an error message in the log without throwing an error.
function Scriptish_logError(aErr, opt_warn, fileName, lineNumber) {
  var e = Instances.se;

  // third parameter "sourceLine" is supposed to be the line, of the source,
  // on which the error happened.  we don't know it. (directly...)
  e.init(
      aErr.message, fileName, null, lineNumber, aErr.columnNumber,
      opt_warn ? 1 : 0, null);

  Services.console.logMessage(e);
}

function Scriptish_log(aMsg, aForce) {
  if (!aForce && !Scriptish_prefRoot.getBoolValue("logChrome")) return;
  // make sure msg is a string, and remove NULL bytes which truncate it
  Services.console.logStringMessage(("[Scriptish] " + aMsg).replace("\0","","g"));
}

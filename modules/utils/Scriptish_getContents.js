var EXPORTED_SYMBOLS = ["Scriptish_getContents"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
Cu.import("resource://scriptish/logging.js");
Cu.import("resource://scriptish/utils/Scriptish_getUriFromFile.js");
Cu.import("resource://gre/modules/Services.jsm");

function Scriptish_getContents(file, charset) {
  if (!charset) charset = "UTF-8";

  var scriptableStream = Cc["@mozilla.org/scriptableinputstream;1"]
    .getService(Ci.nsIScriptableInputStream);
  // http://lxr.mozilla.org/mozilla/source/intl/uconv/idl/nsIScriptableUConv.idl
  var unicodeConverter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
    .createInstance(Ci.nsIScriptableUnicodeConverter);
  unicodeConverter.charset = charset;

  var channel = Services.io.newChannelFromURI(Scriptish_getUriFromFile(file));
  try {
    var input = channel.open();
  } catch (e) {
    Scriptish_logError(new Error("Could not open file: " + file.path));
    return "";
  }

  scriptableStream.init(input);
  var str = scriptableStream.read(input.available());
  scriptableStream.close();
  input.close();

  try {
    return unicodeConverter.ConvertToUnicode(str);
  } catch (e) {
    return str;
  }
}

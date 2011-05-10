var EXPORTED_SYMBOLS = ["Scriptish_getContents"];
Components.utils.import("resource:///modules/NetworkHelper.jsm");
Components.utils.import("resource://scriptish/constants.js");
Components.utils.import("resource://scriptish/logging.js");
Components.utils.import("resource://scriptish/utils/Scriptish_getUriFromFile.js");
Components.utils.import("resource://scriptish/utils/Scriptish_stringBundle.js");

function Scriptish_getContents(aFile, aCharset, aCallback) {
  if (!aCharset) aCharset = "UTF-8";

  if (aCallback) {
    NetUtil.asyncFetch(aFile, function(aInputStream, aStatusCode) {
        if (!Components.isSuccessCode(aStatusCode)) {
          Scriptish_logError(
              new Error(Scriptish_stringBundle("error.openingFile") + ": " + aFile.path));
          return aCallback("");
        }

        aCallback(NetworkHelper.readAndConvertFromStream(aInputStream, aCharset));
    });
  } else {
    var scriptableStream = Services.sis;
    var unicodeConverter = Instances.suc;
    unicodeConverter.charset = aCharset;

    var channel = Services.io.newChannelFromURI(Scriptish_getUriFromFile(aFile));
    try {
      var input = channel.open();
    } catch (e) {
      Scriptish_logError(
          new Error(Scriptish_stringBundle("error.openingFile") + ": " + aFile.path));
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
}

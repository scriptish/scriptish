var EXPORTED_SYMBOLS = ["Scriptish_getContents"];
Components.utils.import("resource://scriptish/constants.js");
lazyImport(this, "resource://scriptish/logging.js", ["Scriptish_logError"]);
lazyUtil(this, "getUriFromFile");
lazyUtil(this, "stringBundle");

try {
  // only available when the HUD console is shipped
  // that excludes Seamonkey at the moment
  Components.utils.import("resource:///modules/NetworkHelper.jsm");
}
catch (ex) {
  // Minimal replacement
  // XXX: Might want to keep this up-to-date?!
  this.NetworkHelper = {
    readAndConvertFromStream: function NH_readAndConvertFromStream(aStream, aCharset) {
      let text = null;
      try {
        text = NetUtil.readInputStreamToString(aStream, aStream.available());
        if (!aCharset) {
          return text;
        }
        let conv = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
          .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
        conv.charset = aCharset;
        return conv.ConvertToUnicode(text);
      }
      catch (ex) {
        return text;
      }
    }
  };
}

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

var EXPORTED_SYMBOLS = ["Scriptish_getContents"];
Components.utils.import("resource://scriptish/constants.js");
Components.utils.import("resource://scriptish/logging.js");
Components.utils.import("resource://scriptish/utils/Scriptish_getUriFromFile.js");

function Scriptish_getContents(file, charset) {
  if (!charset) charset = "UTF-8";
  var scriptableStream = Services.sis;
  var unicodeConverter = Instances.suc;
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

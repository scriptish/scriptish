var EXPORTED_SYMBOLS = ["Scriptish_getBinaryContents"];
Components.utils.import("resource://scriptish/constants.js");
Components.utils.import("resource://scriptish/utils/Scriptish_getUriFromFile.js");

const Scriptish_getBinaryContents = function(aFile) {
  var channel = Services.io.newChannelFromURI(Scriptish_getUriFromFile(aFile));
  var input = channel.open();
  var bstream = Instances.bis;
  bstream.setInputStream(input);
  return bstream.readBytes(bstream.available());
}

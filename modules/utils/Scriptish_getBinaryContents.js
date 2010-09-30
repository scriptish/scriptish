var EXPORTED_SYMBOLS = ["Scriptish_getBinaryContents"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
Cu.import("resource://scriptish/utils/Scriptish_getUriFromFile.js");
Cu.import("resource://gre/modules/Services.jsm");

const Scriptish_getBinaryContents = function(aFile) {
    var channel = Services.io.newChannelFromURI(Scriptish_getUriFromFile(aFile));
    var input = channel.open();

    var bstream = Cc["@mozilla.org/binaryinputstream;1"]
        .createInstance(Ci.nsIBinaryInputStream);
    bstream.setInputStream(input);

    return bstream.readBytes(bstream.available());
}

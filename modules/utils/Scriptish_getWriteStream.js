
// JSM exported symbols
var EXPORTED_SYMBOLS = ["Scriptish_getWriteStream"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");

const Scriptish_getWriteStream = function(file) {
  var stream = Cc["@mozilla.org/network/file-output-stream;1"]
      .createInstance(Ci.nsIFileOutputStream);

  stream.init(file, 0x02 | 0x08 | 0x20, 420, -1);

  return stream;
}

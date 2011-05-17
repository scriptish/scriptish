const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");

function AboutScriptish() {}
AboutScriptish.prototype = {
  classDescription: "about:scriptish",
  contractID: "@mozilla.org/network/protocol/about;1?what=scriptish",
  classID: Components.ID("{5f28a810-8094-11e0-b278-0800200c9a66}"),
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule]),

  getURIFlags: function(aURI) {
    return Ci.nsIAboutModule.ALLOW_SCRIPT;
  },

  newChannel: function(aURI) {
    let channel = Services.io.newChannel(
        "chrome://scriptish/content/aboutScriptish.html", null, null);
    channel.originalURI = aURI;
    return channel;
  }
};

var NSGetFactory = XPCOMUtils.generateNSGetFactory([AboutScriptish]);

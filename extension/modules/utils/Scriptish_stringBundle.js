var EXPORTED_SYMBOLS = ["Scriptish_stringBundle"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
Cu.import("resource://scriptish/prefmanager.js");
Cu.import("resource://gre/modules/NetUtil.jsm");

const defaultBundle = Services.strings.createBundle("chrome://scriptish/locale/scriptish.properties");
const engBundle = Services.strings.createBundle((function(){
  var tmp = Components.classes["@mozilla.org/chrome/chrome-registry;1"]
      .getService(Components.interfaces.nsIChromeRegistry)
      .convertChromeURL(
          NetUtil.newURI("chrome://scriptish/locale/scriptish.properties"))
      .spec.split("/");
  tmp[tmp.length - 2] = "en-US";
  return tmp.join("/")
})());

const Scriptish_stringBundle = function(aKey) {
  if (Scriptish_prefRoot.getValue("useDefaultLocale"))
    return engBundle.GetStringFromName(aKey);
  else
    return defaultBundle.GetStringFromName(aKey);
}

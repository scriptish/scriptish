
var EXPORTED_SYMBOLS = ["Scriptish_stringBundle"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
Cu.import("resource://scriptish/prefmanager.js");

const chromeReg = Cc["@mozilla.org/chrome/chrome-registry;1"]
    .getService(Ci.nsIChromeRegistry);
const strBundleSrv = Cc["@mozilla.org/intl/stringbundle;1"]
    .getService(Ci.nsIStringBundleService);

var defaultBundle = strBundleSrv.createBundle("chrome://scriptish/locale/scriptish.properties");
var engBundle = strBundleSrv.createBundle((function(){
  var tmp = chromeReg.convertChromeURL(
      ioService.newURI("chrome://scriptish/locale/scriptish.properties", "UTF-8", null))
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

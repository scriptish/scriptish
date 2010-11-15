var EXPORTED_SYMBOLS = ["Scriptish_stringBundle"];
Components.utils.import("resource://scriptish/constants.js");
Components.utils.import("resource://scriptish/prefmanager.js");

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

function Scriptish_stringBundle(aKey) {
  if (Scriptish_prefRoot.getValue("useDefaultLocale"))
    return engBundle.GetStringFromName(aKey);
  return defaultBundle.GetStringFromName(aKey) || engBundle.GetStringFromName(aKey);
}

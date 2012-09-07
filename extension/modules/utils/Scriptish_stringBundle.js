var EXPORTED_SYMBOLS = ["Scriptish_stringBundle"];
Components.utils.import("resource://scriptish/constants.js");

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

lazy(this, "Scriptish_getPref", function() {
  let tools = {};
  Components.utils.import("resource://scriptish/prefmanager.js", tools);
  return function(aVal) tools.Scriptish_prefRoot.getValue(aVal);
});

function Scriptish_stringBundle(aKey) {
  if (Scriptish_getPref("useDefaultLocale"))
    return engBundle.GetStringFromName(aKey);
  try {
    return defaultBundle.GetStringFromName(aKey)
        || engBundle.GetStringFromName(aKey);
  } catch (e) {
    return engBundle.GetStringFromName(aKey);
  }
}

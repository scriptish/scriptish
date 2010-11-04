var EXPORTED_SYMBOLS = ["Scriptish"];
Components.utils.import("resource://scriptish/constants.js");
Components.utils.import("resource://scriptish/prefmanager.js");
Components.utils.import("resource://scriptish/utils/Scriptish_isGreasemonkeyable.js");
const Scriptish = {
  get APP() {
    if ("{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}" == Services.appinfo.ID)
      return "seamonkey";
    return "firefox";
  },
  get config() Services.scriptish.config,
  get enabled() Scriptish_prefRoot.getValue("enabled", true),
  set enabled(aVal) Scriptish_prefRoot.setValue("enabled", !!aVal),
  isGreasemonkeyable: Scriptish_isGreasemonkeyable
}

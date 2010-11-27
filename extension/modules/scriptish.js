var EXPORTED_SYMBOLS = ["Scriptish"];
Components.utils.import("resource://scriptish/constants.js");
Components.utils.import("resource://scriptish/prefmanager.js");
Components.utils.import("resource://scriptish/utils/Scriptish_isGreasemonkeyable.js");
const Scriptish = {
  get config() Services.scriptish.config,
  get enabled() Scriptish_prefRoot.getValue("enabled", true),
  set enabled(aVal) Scriptish_prefRoot.setValue("enabled", !!aVal),
  isGreasemonkeyable: Scriptish_isGreasemonkeyable
}

var EXPORTED_SYMBOLS = ["Scriptish_setEnabled"];
Components.utils.import("resource://scriptish/prefmanager.js");
function Scriptish_setEnabled(aStatus) (
    Scriptish_prefRoot.setValue("enabled", aStatus))

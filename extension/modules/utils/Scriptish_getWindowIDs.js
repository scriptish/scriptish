var EXPORTED_SYMBOLS = ["Scriptish_getWindowIDs"];
const Ci = Components.interfaces;

function Scriptish_getWindowIDs(aWin) {
  let utils = aWin.QueryInterface(Ci.nsIInterfaceRequestor)
      .getInterface(Ci.nsIDOMWindowUtils);
  return {
    innerID: utils.currentInnerWindowID,
    outerID: utils.outerWindowID
  };
}

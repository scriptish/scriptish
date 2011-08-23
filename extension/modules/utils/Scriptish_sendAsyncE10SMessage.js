var EXPORTED_SYMBOLS = ["Scriptish_sendAsyncE10SMessage"];
Components.utils.import("resource://scriptish/constants.js");

function Scriptish_sendAsyncE10SMessage(aName, aJSON) {
  let bWins = Scriptish.getWindows();
  while (bWins.hasMoreElements()) {
    let bWin = bWins.getNext();
    bWin.messageManager.sendAsyncMessage(aName, aJSON)
  }
}

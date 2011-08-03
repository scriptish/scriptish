var EXPORTED_SYMBOLS = ["GM_setClipboard"];
Components.utils.import("resource://scriptish/constants.js");
lazyUtil(this, "stringBundle");

const FLAVOR_TEXT = "text/unicode";
const FLAVOR_HTML = "text/html";

function GM_setClipboard(aData, aType) {
  aType = (aType || "text").toLowerCase();

  switch (aType) {
  case "text":
    Services.cb.copyString(aData);
    return;
  case "html":
    var trans = Instances.xfr;

    // add text/html flavor
    var str = Instances.ss;
    str.data = aData;
    trans.addDataFlavor(FLAVOR_HTML);
    trans.setTransferData(FLAVOR_HTML, str, (aData.length * 2));

    // add a text/unicode flavor (html converted to plain text)
    var str = Instances.ss;
    let (converter = Instances.ftc) {
      converter.type = aType;
      converter.text = aData;
      str.data = converter.plainText();
    }
    trans.addDataFlavor(FLAVOR_TEXT);
    trans.setTransferData(FLAVOR_TEXT, str, (str.data.length * 2));
    break;
  default:
    throw new Error("'" + aType + "' " + Scriptish_stringBundle("error.api.clipboard.type"));
  }

  var cbs = Services.cbs;
  cbs.setData(trans, null, cbs.kGlobalClipboard);
}

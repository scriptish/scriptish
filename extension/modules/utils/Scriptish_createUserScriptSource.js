var EXPORTED_SYMBOLS = ["Scriptish_createUserScriptSource"];
Components.utils.import("resource://scriptish/constants.js");
Components.utils.import("resource://scriptish/utils/Scriptish_stringBundle.js");

function Scriptish_createUserScriptSource(aHeader, aContent) {
  var script = ["// ==UserScript=="];

  function push(k, v) {

    // Arrays
    if (v.forEach) {
      for each (let vv in v) {
        push(k, vv);
      }
      return;
    }

    let pk = k.toString();
    while (pk.length < 14) {
      pk += " ";
    }

    // booleans
    if (typeof v == "boolean") {
      if (v) {
        script.push("// @" + k);
      }
      return;
    }

    // XPCOM URIs
    if (v instanceof Ci.nsIURI) {
      v = v.spec;
    }

    // The rest
    script.push("// @" + pk + " " + v.toString());
  }

  if (!aHeader.id || typeof aHeader.id != "string") {
    throw new Error(Scriptish_stringBundle("newscript.noID"));
  }
  // push the id first, always
  push("id", aHeader.id);
  delete aHeader.id;

  for (let [k,v] in Iterator(aHeader)) {
    push(k, v);
  }

  script.push("// ==/UserScript==");
  script.push("");

  if (aContent) {
    script.push(aContent.toString());
    script.push("");
  }


  return script.join(Services.appinfo.OS == "WINNT" ? "\r\n" : "\n");
}

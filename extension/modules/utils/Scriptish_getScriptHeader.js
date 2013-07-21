"use strict";
var EXPORTED_SYMBOLS = ["Scriptish_getScriptHeader"];
Components.utils.import("resource://scriptish/constants.js");
lazyUtil(this, "getContents");
lazyUtil(this, "parser");

function Scriptish_getScriptHeader(aScript, aKey, aLocalVal) {
  if (aLocalVal) {
    let key = aKey ? aKey.toLowerCase().trim() : "";

    switch (key) {
      case "id":
      case "name":
      case "namespace":
      case "creator":
      case "author":
      case "description":
      case "version":
      case "jsversion":
      case "delay":
      case "noframes":
        return aScript[key];
      case "homepage":
      case "homepageurl":
        return aScript.homepageURL;
      case "updateurl":
        return aScript.updateURL;
      case "contributor":
      case "include":
      case "exclude":
      case "screenshot":
        return aScript[key + "s"];
      case "match":
        return aScript[key + "es"];
      case "grant":
        return Object.keys(aScript.grant);
    }
  }

  // TODO: cache headers and clear cache when the script is modified..
  // TODO: should not use privates here
  let headers = Scriptish_parser(Scriptish_getContents(aScript._tempFile || aScript._file));
  if (aKey) {
    return headers[aKey]
  }

  return headers;
}

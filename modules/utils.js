// JSM exported symbols
var EXPORTED_SYMBOLS = [
  "GM_alert",
  "GM_stringBundle",
  "GM_getConfig",
  "GM_hitch",
  "GM_listen",
  "GM_unlisten",
  "GM_logError",
  "GM_log",
  "GM_getContents",
  "GM_getUriFromFile",
  "GM_isGreasemonkeyable",
  "GM_getEnabled",
  "GM_setEnabled"
];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
Cu.import("resource://scriptish/prefmanager.js");

const consoleService = Cc["@mozilla.org/consoleservice;1"]
                           .getService(Ci.nsIConsoleService);

function GM_alert(msg) {
  Cc["@mozilla.org/embedcomp/prompt-service;1"]
    .getService(Ci.nsIPromptService)
    .alert(null, "Scriptish alert", msg);
}

GM_stringBundle = function() {
  var stringBundle = Cc["@mozilla.org/intl/stringbundle;1"]
      .getService(Ci.nsIStringBundleService)
      .createBundle("chrome://scriptish/locale/gm-browser.properties");

  GM_stringBundle = function() { return stringBundle; };

  return stringBundle;
}

function GM_getConfig() {
  return gmService.config;
}

function GM_hitch(obj, meth) {
  if (!obj[meth]) {
    throw "method '" + meth + "' does not exist on object '" + obj + "'";
  }

  var staticArgs = Array.prototype.splice.call(arguments, 2, arguments.length);

  return function() {
    // make a copy of staticArgs (don't modify it because it gets reused for
    // every invocation).
    var args = Array.prototype.slice.call(staticArgs);

    // add all the new arguments
    Array.prototype.push.apply(args, arguments);

    // invoke the original function with the correct this obj and the combined
    // list of static and dynamic arguments.
    return obj[meth].apply(obj, args);
  };
}

function GM_listen(source, event, listener, opt_capture) {
  Cu.lookupMethod(source, "addEventListener")(event, listener, opt_capture);
}

function GM_unlisten(source, event, listener, opt_capture) {
  Cu.lookupMethod(source, "removeEventListener")(event, listener, opt_capture);
}

/**
 * Utility to create an error message in the log without throwing an error.
 */
function GM_logError(e, opt_warn, fileName, lineNumber) {
  var consoleError = Cc["@mozilla.org/scripterror;1"]
    .createInstance(Ci.nsIScriptError);

  var flags = opt_warn ? 1 : 0;

  // third parameter "sourceLine" is supposed to be the line, of the source,
  // on which the error happened.  we don't know it. (directly...)
  consoleError.init(e.message, fileName, null, lineNumber,
                    e.columnNumber, flags, null);

  consoleService.logMessage(consoleError);
}

function GM_log(message, force) {
  if (force || GM_prefRoot.getValue("logChrome", false)) {
    // make sure message is a string, and remove NULL bytes which truncate it
    consoleService.logStringMessage((message + '').replace("\0","","g"));
  }
}

function GM_getContents(file, charset) {
  if( !charset ) {
    charset = "UTF-8"
  }
  var scriptableStream = Cc["@mozilla.org/scriptableinputstream;1"]
    .getService(Ci.nsIScriptableInputStream);
  // http://lxr.mozilla.org/mozilla/source/intl/uconv/idl/nsIScriptableUConv.idl
  var unicodeConverter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
    .createInstance(Ci.nsIScriptableUnicodeConverter);
  unicodeConverter.charset = charset;

  var channel = ioService.newChannelFromURI(GM_getUriFromFile(file));
  try {
    var input=channel.open();
  } catch (e) {
    GM_logError(new Error("Could not open file: " + file.path));
    return "";
  }

  scriptableStream.init(input);
  var str=scriptableStream.read(input.available());
  scriptableStream.close();
  input.close();

  try {
    return unicodeConverter.ConvertToUnicode(str);
  } catch( e ) {
    return str;
  }
}

function GM_getUriFromFile(file) {
  return ioService.newFileURI(file);
}

function GM_isGreasemonkeyable(url) {
  // if the url provide is not a valid url, then an error could be thrown
  try {
    var scheme = ioService.extractScheme(url);
  } catch (e) {
    return false;
  }

  switch (scheme) {
    case "http":
    case "https":
    case "ftp":
    case "data":
      return true;
    case "about":
      // Always allow "about:blank".
      if (/^about:blank/.test(url)) return true;
      // Conditionally allow the rest of "about:".
      return GM_prefRoot.getValue('aboutIsGreaseable');
    case "file":
      return GM_prefRoot.getValue('fileIsGreaseable');
    case "unmht":
      return GM_prefRoot.getValue('unmhtIsGreaseable');
  }

  return false;
}

function GM_getEnabled() {
  return GM_prefRoot.getValue("enabled", true);
}

function GM_setEnabled(enabled) {
  GM_prefRoot.setValue("enabled", enabled);
}

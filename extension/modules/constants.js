var EXPORTED_SYMBOLS = [
    "Cc", "Ci", "Cr", "NetUtil", "XPCOMUtils", "extend", "jetpack",
    "Services", "Instances", "lazy", "lazyImport", "lazyUtil", "timeout"];

const {classes: Cc, interfaces: Ci, results: Cr, utils: Cu, Constructor: CC} = Components;

const systemPrincipal = CC('@mozilla.org/systemprincipal;1', 'nsIPrincipal')();

const global = this;
var Services = {};
(function(inc, tools){
  inc("resource://gre/modules/XPCOMUtils.jsm");
  inc("resource://gre/modules/NetUtil.jsm");
  inc("resource://gre/modules/Services.jsm", tools);

  Services.__proto__ = tools.Services;
})(Components.utils.import, {})

var Instances = {
  get bis() Cc["@mozilla.org/binaryinputstream;1"]
      .createInstance(Ci.nsIBinaryInputStream),
  get ch() Cc["@mozilla.org/security/hash;1"]
      .createInstance(Ci.nsICryptoHash),
  get dp() Cc["@mozilla.org/xmlextras/domparser;1"]
      .createInstance(Ci.nsIDOMParser),
  get ds() Cc["@mozilla.org/xmlextras/xmlserializer;1"]
      .createInstance(Ci.nsIDOMSerializer),
  get fos() Cc["@mozilla.org/network/file-output-stream;1"]
      .createInstance(Ci.nsIFileOutputStream),
  get ftc() Cc["@mozilla.org/feed-textconstruct;1"]
      .createInstance(Ci.nsIFeedTextConstruct),
  get sfos() Cc["@mozilla.org/network/safe-file-output-stream;1"]
      .createInstance(Ci.nsIFileOutputStream)
      .QueryInterface(Ci.nsISafeOutputStream),
  get fp() Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker),
  get lf() Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile),
  get process() Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess),
  get se() Cc["@mozilla.org/scripterror;1"].createInstance(Ci.nsIScriptError),
  get ss() Cc["@mozilla.org/supports-string;1"]
      .createInstance(Ci.nsISupportsString),
  get suc() Cc["@mozilla.org/intl/scriptableunicodeconverter"]
      .createInstance(Ci.nsIScriptableUnicodeConverter),
  get cos() Cc["@mozilla.org/intl/converter-output-stream;1"]  
       .createInstance(Ci.nsIConverterOutputStream),
  get timer() Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer),
  get wbp() Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]
      .createInstance(Ci.nsIWebBrowserPersist),
  get xfr() Cc["@mozilla.org/widget/transferable;1"]
      .createInstance(Ci.nsITransferable),
  get xhr() Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
      .createInstance(Ci.nsIXMLHttpRequest)
};

const lazy = XPCOMUtils.defineLazyGetter.bind(XPCOMUtils);
const lazyService = XPCOMUtils.defineLazyServiceGetter.bind(XPCOMUtils);

lazyService(
    Services, "ass", "@mozilla.org/appshell/appShellService;1",
    "nsIAppShellService");

lazyService(
    Services, "cb", "@mozilla.org/widget/clipboardhelper;1",
    "nsIClipboardHelper");

lazyService(
    Services, "cbs", "@mozilla.org/widget/clipboard;1", "nsIClipboard");

lazyService(
    Services, "cs", "@mozilla.org/consoleservice;1", "nsIConsoleService");

if (Cc["@mozilla.org/parserutils;1"]) {
  lazyService(
      Services, "pu", "@mozilla.org/parserutils;1", "nsIParserUtils");
}

lazyService(
    Services, "sis", "@mozilla.org/scriptableinputstream;1",
    "nsIScriptableInputStream");

lazyService(
    Services, "suhtml", "@mozilla.org/feed-unescapehtml;1",
    "nsIScriptableUnescapeHTML");

lazyService(
    Services, "tld", "@mozilla.org/network/effective-tld-service;1",
    "nsIEffectiveTLDService");

lazyService(
    Services, "uuid", "@mozilla.org/uuid-generator;1",
    "nsIUUIDGenerator");

const _lazyModules = {};
function lazyImport(obj, resource, symbols) {
  if (!(resource in _lazyModules)) {
    lazy(_lazyModules, resource, function() {
      let _m = {};
      try {
        Components.utils.import(resource, _m);
      }
      catch (e) {
        Components.utils.reportError("Failed to import resource: " + resource);
        Components.utils.reportError(e);
        throw e;
      }
      return _m;
    });
  }
  for (let i = symbols.length; ~--i;) {
    let s = symbols[i];
    lazy(obj, s, function() _lazyModules[resource][s]);
  }
}
function lazyUtil(obj, name) {
  return lazyImport(obj, "resource://scriptish/utils/Scriptish_" + name + ".js", ["Scriptish_" + name]);
}

function extend(a, o) {
  for (var k in a) {
    if (!o[k]) {
      o[k] = a[k];
    }
  }
  return o;
}

function descriptor(object) {
  let value = {};
  Object.getOwnPropertyNames(object).forEach(function(name) {
    value[name] = Object.getOwnPropertyDescriptor(object, name)
  });
  return value;
}

const { Loader } = Components.utils.import("resource://gre/modules/commonjs/toolkit/loader.js", {});

const loader = Loader.Loader({
  modules: {
    "toolkit/loader": Loader
  },
  paths: {
    "devtools": "resource:///modules/devtools/",
    "scriptish/": "resource://scriptish/",
    "pathfinder/": "resource://scriptish/pathfinder/",
    "sdk/": "resource://gre/modules/commonjs/sdk/",
    "": "resource://gre/modules/commonjs/"
  },
  rootURI: '',
  metadata: {
    'permissions': {
      'private-browsing': true
    }
  },
  resolve: function(id, base) {
    if (id == "chrome" || id.startsWith("@"))
      return id;
    return Loader.resolve(id, base);
  }
});

// fake requirer uri scriptish:// (it's used for relative requires and error messages)
const module = Loader.Module("main", "scriptish://");
const jetpack = Loader.Require(loader, module);

const jpGlobals = jetpack('sdk/system/globals');

// Inject globals ASAP in order to have console API working ASAP
Object.defineProperties(loader.globals, descriptor(jpGlobals));

const { setTimeout: timeout } = jetpack('sdk/timers');

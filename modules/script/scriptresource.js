// JSM exported symbols
var EXPORTED_SYMBOLS = ["ScriptResource"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
Cu.import("resource://scriptish/utils.js");
Cu.import("resource://scriptish/utils/Scriptish_getContents.js");
Cu.import("resource://scriptish/script/scriptrequire.js");

function ScriptResource(script) {
  this._script = script;

  this._downloadURL = null; // Only for scripts not installed
  this._tempFile = null; // Only for scripts not installed
  this._filename = null;
  this._mimetype = null;
  this._charset = null;
  this.type = "resource";
  this.updateScript = false;

  this._name = null;
}

ScriptResource.prototype = {
  get name() { return this._name; },

  get _file() {
    var file = this._script._basedirFile;
    file.append(this._filename);
    return file;
  },

  get fileURL() { return GM_getUriFromFile(this._file).spec; },
  get textContent() { return Scriptish_getContents(this._file); },

  get dataContent() {
    var tools = {};
    Cu.import("resource://scriptish/utils/GM_getBinaryContents.js", tools);

    var appSvc = Cc["@mozilla.org/appshell/appShellService;1"]
                     .getService(Ci.nsIAppShellService);

    var window = appSvc.hiddenDOMWindow;
    var binaryContents = tools.GM_getBinaryContents(this._file);

    var mimetype = this._mimetype;
    if (this._charset && this._charset.length > 0) {
      mimetype += ";charset=" + this._charset;
    }

    return "data:" + mimetype + ";base64," +
      window.encodeURIComponent(window.btoa(binaryContents));
  },

  _initFile: ScriptRequire.prototype._initFile,

  get urlToDownload() { return this._downloadURL; },
  setDownloadedFile: function(tempFile, mimetype, charset) {
    this._tempFile = tempFile;
    this._mimetype = mimetype;
    this._charset = charset;
    if (this.updateScript)
      this._initFile();
  }
};

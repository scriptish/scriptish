var EXPORTED_SYMBOLS = ["ScriptIcon"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
Cu.import("resource://scriptish/utils/Scriptish_getUriFromFile.js");
Cu.import("resource://scriptish/script/scriptrequire.js");

function ScriptIcon(script) {
  this._script = script;

  this._downloadURL = null;
  this._tempFile = null;
  this._filename = null;
  this._dataURI = null;
  this._mimetype = null;
  this.type = "icon";
  this.updateScript = false;
}

ScriptIcon.prototype = {
  get _file() {
    var file = this._script._basedirFile;
    file.append(this._filename);
    return file;
  },

  hasDownloadURL: function() !!this._downloadURL,
  get filename() (this._filename || this._dataURI),

  get fileURL() {
    if (this._dataURI) return this._dataURI;
    if (this._filename) return Scriptish_getUriFromFile(this._file).spec;
    return null;
  },
  set fileURL(aURL) {
    if (/^data:/i.test(aURL)) {
      // icon is a data scheme
      this._dataURI = aURL;
    } else if (aURL) {
      // icon is a file
      this._filename = aURL;
    }
  },

  _initFile: ScriptRequire.prototype._initFile,

  get urlToDownload() { return this._downloadURL; },
  setDownloadedFile: function(tempFile, mimetype) {
    this._tempFile = tempFile;
    this._mimetype = mimetype;
    if (this.updateScript) this._initFile();
  }
};

var EXPORTED_SYMBOLS = ["ScriptDependency"];
const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
lazyImport(this, "resource://scriptish/logging.js", ["Scriptish_log"]);
lazyImport(this, "resource://scriptish/script/cachedresource.js", ["CachedResource"]);

lazyUtil(this, "getUriFromFile");
lazyUtil(this, "getContents");
lazyUtil(this, "stringBundle");

function ScriptDependency(aScript) {
  this._script = aScript;

  this._downloadURL = null;
  this._tempFile = null;
  this._filename = null;
  this._mimetype = null;
  this._charset = null;
  this.updateScript = false;
}

ScriptDependency.prototype = {
  __proto__: CachedResource.prototype,
  get _file() {
    var file = this._script._basedirFile;
    file.append(this._filename);
    return file;
  },
  get tempFile() this._tempFile,
  get fileURL() Scriptish_getUriFromFile(this._file).spec,

  get downloadURL() this._downloadURL,
  get downloadURLFilename() {
    var name = this._downloadURL.substr(this._downloadURL.lastIndexOf("/") + 1);
    if (name.indexOf("?") > 0) name = name.substr(0, name.indexOf("?"));
    return name;
  },
  get urlToDownload() this._downloadURL,
  setDownloadedFile: function(tempFile, mimetype, charset) {
    this._tempFile = tempFile;
    this._mimetype = mimetype;
    this._charset = charset;
    if (this.updateScript) this._initFile();
  },

  _initFile: function() {
    var name = this._script._initFileName(this.downloadURLFilename, true);

    var file = this._script._basedirFile;
    file.append(name);
    file.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0644);
    this._filename = file.leafName;

    Scriptish_log(Scriptish_stringBundle("moving.dependency") + " "
        + this._tempFile.path + " --> " + file.path);

    file.remove(true);
    this._tempFile.moveTo(file.parent, file.leafName);
    this._tempFile = null;
  }
}

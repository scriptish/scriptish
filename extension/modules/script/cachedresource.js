var EXPORTED_SYMBOLS = ["CachedResource"];
const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
lazyImport(this, "resource://scriptish/prefmanager.js", ["Scriptish_prefRoot"]);
lazyUtil(this, "getContents");

var useCache = Scriptish_prefRoot.getValue("cache.enabled");
Scriptish_prefRoot.watch("cache.enabled", function() {
  useCache = Scriptish_prefRoot.getValue("cache.enabled");
});

function CachedResource() {}
CachedResource.prototype = {
  _textContent: null,
  clearResourceCaches: function() {
    this.clearCachedTextContent();
  },
  clearCachedTextContent: function() this._textContent = null,
  get textContent() {
    if (!useCache || !this._textContent) {
      this._textContent = Scriptish_getContents(this._file);
    }
    return this._textContent;
  },
  _getTextContent_callback: function(aCallback, content) {
    this._textContent = content;
    aCallback(content);
  },
  getTextContent: function(aCallback) {
    if (!aCallback) {
      return this.textContent;
    }

    if (!useCache || !this._textContent) {
      Scriptish_getContents(
        this._file,
        null,
        this._getTextContent_callback.bind(this, aCallback)
        );
    }
    else {
      aCallback(this._textContent);
    }

    // avoid not-all-paths-return warning
    return null;
  }
};

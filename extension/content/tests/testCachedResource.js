Components.utils.import("resource://scriptish/constants.js");
Components.utils.import("resource://scriptish/utils/Scriptish_getTempFile.js");
Components.utils.import("resource://scriptish/utils/Scriptish_getWriteStream.js");
Components.utils.import("resource://scriptish/script/cachedresource.js");

var PREF_BRANCH = Services.prefs.getBranch("extensions.scriptish.");

function CachedResourceMock() {
  this._file = Scriptish_getTempFile();
  this.write();
}
CachedResourceMock.prototype = {
  __proto__: CachedResource.prototype,
  _accesses: 0,
  write: function() {
    this._script = "accesses " + (++this._accesses);
    var foStream = tools.Scriptish_getWriteStream(this._file);
    foStream.write(this._script, this._script.length);
    foStream.close();
  },
  testCache: function(shouldEqual) {
    (shouldEqual ? equal : notEqual)(this.textContent, this._script);
  },
  destroy: function() {
    try {
      this._file.remove(true);
    }
    catch (ex) {
      // no op
    }
  }
};

module("Cached Resource");

test("not cached", 2, function() {
  var enabled = PREF_BRANCH.getBoolPref("cache.enabled");
  PREF_BRANCH.setBoolPref("cache.enabled", false);
  try {
    var mock = new CachedResourceMock();
    try {
      mock.testCache(true);
      mock.write();
      mock.testCache(true);
    }
    finally {
      mock.destroy();
    }
  }
  finally {
    PREF_BRANCH.setBoolPref("cache.enabled", enabled);
  }

});

test("cached", 2, function() {
  var enabled = PREF_BRANCH.getBoolPref("cache.enabled");
  PREF_BRANCH.setBoolPref("cache.enabled", true);
  try {
    var mock = new CachedResourceMock();
    try {
      mock.testCache(true);
      mock.write();
      mock.testCache(false);
    }
    finally {
      mock.destroy();
    }
  }
  finally {
    PREF_BRANCH.setBoolPref("cache.enabled", enabled);
  }
});

test("toggled", 3, function() {
  var enabled = PREF_BRANCH.getBoolPref("cache.enabled");
  PREF_BRANCH.setBoolPref("cache.enabled", true);
  try {
    var mock = new CachedResourceMock();
    try {
      mock.testCache(true);
      mock.write();
      mock.testCache(false);
      PREF_BRANCH.setBoolPref("cache.enabled", false);
      mock.write();
      mock.testCache(true);
    }
    finally {
      mock.destroy();
    }
  }
  finally {
    PREF_BRANCH.setBoolPref("cache.enabled", enabled);
  }
});

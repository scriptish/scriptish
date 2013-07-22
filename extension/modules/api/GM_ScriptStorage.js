var EXPORTED_SYMBOLS = ["GM_ScriptStorage"];

Components.utils.import("resource://scriptish/constants.js");

lazyImport(this, "resource://scriptish/prefmanager.js", ["Scriptish_PrefManager"]);

lazyUtil(this, "stringBundle");
lazyUtil(this, "windowUnloader");

const { getInnerId } = jetpack('sdk/window/utils');

function GM_ScriptStorage(aScript, aSafeWin) {
  this.prefMan = new Scriptish_PrefManager(aScript.prefroot);
  this._watchedPrefs = Object.create(null);

  // Be sure to remove any watchers when the window unloads
  let winID = getInnerId(aSafeWin);
  Scriptish_windowUnloader(function() {
    let prefChanged = this._prefChanged.bind(this);

    for (let name in this._watchedPrefs) {
      this.prefMan.unwatch(name, prefChanged);
      delete this._watchedPrefs[name];
    }
  }.bind(this), winID);
}

GM_ScriptStorage.prototype.setValue = function(name, val) {
  if (2 !== arguments.length) {
    throw new Error(Scriptish_stringBundle("error.api.noSecondArgValue"));
  }

  return this.prefMan.setValue(name, val);
};

GM_ScriptStorage.prototype.getValue = function(name, defVal) {
  return this.prefMan.getValue(name, defVal);
};

GM_ScriptStorage.prototype.deleteValue = function(name) {
  return this.prefMan.remove(name);
};

// Notifies any script watchers of a preference change
GM_ScriptStorage.prototype._prefChanged = function(aName) {
  if (!(aName in this._watchedPrefs)) {
    return;
  }
  let newValue = this.getValue(aName);
  let watchers = this._watchedPrefs[aName].watchers;
  for (let i = 0, e = watchers.length; i < e; ++i) {
    watchers[i].notify({
      __exposedProps__: {
        name: "r",
        oldValue: "r",
        newValue: "r"
      },
      name: aName,
      oldValue: this._watchedPrefs[aName].currentValue,
      newValue: newValue
    });
  }
  this._watchedPrefs[aName].currentValue = newValue;
}

GM_ScriptStorage.prototype.watchValue = function(aName, aListener) {
  // Make sure we were passed everything
  if (!(aName && aListener && "function" === typeof aListener)) {
    throw new Error(Scriptish_stringBundle("error.api.badArguments"));
  }

  // Nothing to do if the preference doesn't exist
  if (!this.prefMan.exists(aName)) {
    throw new Error(Scriptish_stringBundle("error.api.prefNotFound"));
  }

  // Generate a UUID for the watcher so it can be unwatched by the user
  let uuid = Services.uuid.generateUUID().toString();
  let watcher = {"notify": aListener, "uuid": uuid};

  // Add to existing watchers, or set up a new pref watcher
  if (aName in this._watchedPrefs) {
    this._watchedPrefs[aName].watchers.push(watcher);
  }
  else {
    this._watchedPrefs[aName] = {
      currentValue: this.getValue(aName),
      watchers: [watcher]
    };

    // Start watching the pref
    this.prefMan.watch(aName, this._prefChanged.bind(this));
  }

  // Return the watcher's UUID so it can be unwatched by the user
  return uuid;
};

GM_ScriptStorage.prototype.unwatchValue = function(aName, aUUID) {
  // Nothing to do if the preference doesn't exist or isn't watched
  if (!(aName in this._watchedPrefs && this.prefMan.exists(aName))) {
    return false;
  }

  let watchers = this._watchedPrefs[aName].watchers;

  // If given a UUID, only remove the specified watcher
  if ("string" === typeof aUUID) {
    for (let i = 0, e = watchers.length; i < e; ++i) {
      if (aUUID === watchers[i].uuid) {
        watchers.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  // Otherwise remove all watchers for the preference
  watchers.length = 0;
  return true;
}

GM_ScriptStorage.prototype.listValues = function() {
  return this.prefMan.listValues();
};

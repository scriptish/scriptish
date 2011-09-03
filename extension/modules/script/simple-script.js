var EXPORTED_SYMBOLS = ["SimpleScript"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");

lazyImport(this, "resource://scriptish/utils/PatternCollection.js", ["PatternCollection"]);
lazyImport(this, "resource://scriptish/third-party/MatchPattern.js", ["MatchPattern"]);

lazyUtil(this, "memoize");
lazyUtil(this, "isGreasemonkeyable");

const JSVersions = ['1.6', '1.7', '1.8', '1.8.1'];
const maxJSVer = JSVersions[2];
const runAtValues = ["document-start", "document-end", "document-idle", "window-load"];
const defaultRunAt = runAtValues[1];

function SimpleScript() {
  this.name = null;
  this.namespace = "";
  this.enabled = true;
  this.domains = [];
  this._includes = new PatternCollection();
  this._excludes = new PatternCollection();
  this._matches = [];
  this._user_includes = new PatternCollection();
  this._user_excludes = new PatternCollection();
  this._delay = null;
  this.priority = 0;
  this._requires = [];
  this._resources = [];
  this.noframes = false;
  this._jsversion = null;
  this["_run-at"] = null;
}

SimpleScript.prototype = {
  needsUninstall: false,
  get jsversion() this._jsversion || maxJSVer,
  get runAt() this["_run-at"] || defaultRunAt,
  get matches() this._matches.concat(),
  addInclude: function(aPattern, aUserVal) {
    this[aUserVal ? "_user_includes" : "_includes"].addPatterns(aPattern);
    this.__all_includes = null;
  },
  addExclude: function(aPattern, aUserVal) {
    this[aUserVal ? "_user_excludes" : "_excludes"].addPatterns(aPattern);
    this.__all_excludes = null;
  },
  get _all_includes() {
    if (!this.__all_includes) {
      this.__all_includes = new PatternCollection();
      this.__all_includes.addPatterns(this._includes.patterns);
      this.__all_includes.addPatterns(this._user_includes.patterns);
    }
    return this.__all_includes;
  },
  get _all_excludes() {
    if (!this.__all_excludes) {
      this.__all_excludes = new PatternCollection();
      this.__all_excludes.addPatterns(this._excludes.patterns);
      this.__all_excludes.addPatterns(this._user_excludes.patterns);
    }
    return this.__all_excludes;
  },
  matchesDomain: function(aURL) {
    try {
      var host = NetUtil.newURI(aURL).host;
    } catch (e) {
      // If true, we're allowing a scheme that doesn't have a host.
      // i.e. "about:scriptish"
      return Scriptish_isGreasemonkeyable(aURL);
    }

    var i = this.domains.length - 1;
    if (!~i) return true; // when there are no @domains, then allow the host
    for (; ~i; i--) if (host == this.domains[i]) return true;
    return false;
  }
};

SimpleScript.prototype._make_matchesURL = function() {
  if (this.includesDisabled) {
    this.matchesURL = this._matchesURL_noincludes.bind(this);
  }
  else {
    this.matchesURL = this._matchesURL_includes.bind(this);
  }
  this.matchesURL = Scriptish_memoize(this.matchesURL, 100);
};
SimpleScript.prototype.matchesURL = null;
SimpleScript.prototype._matchesURL_noincludes = function(aURL) {
  // check if the domain is ok
  if (!this.matchesDomain(aURL)) return false;

  return this._user_includes.test(aURL)
      && !this._user_excludes.test(aURL);
};
SimpleScript.prototype._matchesURL_includes = function(aURL) {
  // check if the domain is ok
  if (!this.matchesDomain(aURL)) return false;

  return (this._all_includes.test(aURL)
    || this._matches.some(function(m) m.doMatch(aURL)))
    && !this._all_excludes.test(aURL);
};

SimpleScript.prototype.update = function() {
  this._make_matchesURL();
};


SimpleScript.loadFromJSON = function(aSkeleton) {
  var script = new SimpleScript();

  script._jsversion = aSkeleton.jsversion;
  script["_run-at"] = aSkeleton["run-at"];
  script.includesDisabled = aSkeleton.includesDisabled;
  script.noframes = aSkeleton.noframes;
  script.addInclude(aSkeleton.includes);
  script.addExclude(aSkeleton.excludes);
  // TODO: need to have the below updated when they are changed...
  script.addInclude(aSkeleton.user_includes, true);
  script.addExclude(aSkeleton.user_excludes, true);
  aSkeleton.matches.forEach(function(i) script._matches.push(new MatchPattern(i)));
  aSkeleton.requires.forEach(function(i) {
    script._requires.push(i);
  });
  aSkeleton.resources.forEach(function(i) {
    script._resources.push(i);
  });

  script.id = aSkeleton.id;
  script.name = aSkeleton.name;
  script.namespace = aSkeleton.namespace;
  script.enabled = aSkeleton.enabled;
  script.delay = aSkeleton.delay;
  script.priority = aSkeleton.priority;

  script.update();
  return script;
};

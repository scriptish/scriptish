const Cu = Components.utils;

function $(aID) document.getElementById(aID);
function include(aSrc) {
  var deferred = Q.defer();
  var script = document.createElement("script");
  script.src = aSrc;
  script.addEventListener("load", deferred.resolve, false);
  document.documentElement.firstChild.appendChild(script);
  return deferred.promise;
}


Cu.import("resource://scriptish/constants.js");
lazyImport(this, "resource://gre/modules/AddonManager.jsm", ["AddonManager", "AddonManagerPrivate"]);

(function() {
  "use strict";

  // Show about:scriptish?test
  var params = window.location.href.split("?")[1];
  if (/(?:^|&)tests?(?:&|=|$)/i.test(params)) {
    Cu.import("resource://scriptish/utils/q.js");
    include("tests/runTests.js").then(function() {
      $("main").style.display = "none";
      $("test").style.display = "block";
      runTests();
    });
  }

  // Show about:scriptish
  var addPersons = function(aList, aPersons) {
    aPersons = aPersons.slice().sort(function(a, b) {
      [a,b] = [a.name, b.name].map(function(p) {;
        return p.split(/; +/)[0].toLowerCase();
      });
      return a < b ? -1 : (a > b ? 1 : 0);
    });
    for each (var person in aPersons) {
      person = person.name.split(/; +/);
      if (!person[1]) {
        person = person[0];
      }
      else {
        person = html("a", {
          "class": "homepage",
          title: person[1].replace(/^mailto:/i, ""),
          href: person[1]
        }, person[0]);
      }
      aList.appendChild(html("li", person));
    }
  }

  AddonManager.getAddonByID("scriptish@erikvold.com", function(aAddon) {
    addPersons($("devlist"), aAddon.developers);
    addPersons($("contlist"), aAddon.contributors);
    addPersons($("translist"), aAddon.translators);
  });
})();

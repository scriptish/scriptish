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
Cu.import("resource://scriptish/utils/q.js");

(function() {
  // Show about:scriptish?test
  if (window.location.href.split("?")[1] == "test") {
    Q.and(
        include("js/third-party/qunit/qunit.js"),
        include("tests/runTests.js")).then(function() {
      $("main").style.display = "none";
      $("test").style.display = "inherit";
      runTests();
    });
    return;
  }

  // Show about:scriptish
  var addPerson = function(aPerson) {
    var person = aPerson.name.split(/; +/);
    var li = html("li", person[0]);
    if (person[1]) {
      var a = html("a", {
        href: person[1]
      }, person[1].replace(/^mailto:/i, ""));
      li.innerHTML += " &mdash; ";
      li.appendChild(a);
    }
    this.appendChild(li);
  }

  AddonManager.getAddonByID("scriptish@erikvold.com", function(aAddon) {
    aAddon.contributors.forEach(addPerson.bind($("contlist")));
    aAddon.translators.forEach(addPerson.bind($("translist")));
  });
})();

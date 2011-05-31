const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
Cu.import("resource://scriptish/utils/q.js");

function $(aID) document.getElementById(aID);
function include(aSrc) {
	var deferred = Q.defer();
    var script = document.createElement("script");
    script.src = aSrc;
    script.addEventListener("load", deferred.resolve, false);
    document.documentElement.firstChild.appendChild(script);
    return deferred.promise;
  }

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
  var addPerson = function(aTarget, aPerson) {
    var li = document.createElement("li");
    var person = aPerson.name.split(/; +/);
    li.innerHTML = person[0];
    if (person[1]) {
      var a = document.createElement("a");
      a.innerHTML = person[1].replace(/^mailto:/i, "");
      a.setAttribute("href", person[1]);
      li.innerHTML += " &mdash; ";
      li.appendChild(a);
    }
    aTarget.appendChild(li);
  }

  AddonManager.getAddonByID("scriptish@erikvold.com", function(aAddon) {
    function func(val) addPerson(this, val);
    aAddon.contributors.forEach(func.bind($("contlist")));
    aAddon.translators.forEach(func.bind($("translist")));
  });
})();

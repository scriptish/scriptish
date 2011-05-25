const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
function $(aID) document.getElementById(aID);

(function() {
  if (window.location.href.split("?")[1] == "test") {
    var head = document.documentElement.firstChild;
    var include = function(aSrc, aCallback) {
      var script = document.createElement("script");
      script.src = aSrc;
      script.addEventListener("load", aCallback, false);
      head.appendChild(script);
    }

    include("test/qunit.js", function() {
      include("test/runTests.js", function() {
        $("main").style.display = "none";
        $("test").style.display = "inherit";
        runTests();
      });
    });
    return;
  }

  // Show about:scriptish
  var tools = {};
  Components.utils.import("resource://gre/modules/AddonManager.jsm", tools);

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

  tools.AddonManager.getAddonByID("scriptish@erikvold.com", function(aAddon) {
    var contlist = $("contlist");
    var translist = $("translist");
    aAddon.contributors.forEach(function(val) addPerson(contlist, val));
    aAddon.translators.forEach(function(val) addPerson(translist, val));
  });
})();

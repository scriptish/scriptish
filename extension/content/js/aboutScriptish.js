$(function() {
  if (window.location.href.split("?")[1] == "test") {
    // Run tests
    var include = function(aSrc, aCallback) {
      var script = document.createElement("script");
      script.src = aSrc;
      script.addEventListener("load", aCallback, false);
      $("head")[0].appendChild(script);
    }

    include("test/qunit.js", function() {
      include("test/runTests.js", function() {
        $("#main").hide();
        $("#test").show();
        runTests();
      });
    });
    return;
  }

  // Show about:scriptish
  var tools = {};
  Components.utils.import("resource://gre/modules/AddonManager.jsm", tools);

  var addPerson = function(aTarget, aPerson) {
    var person = aPerson.name.split(/; +/);
    if (person[1]) {
      person = person[0] + " &mdash; "
          + "<a href='" + person[1] + "'>"
          + person[1].replace(/^mailto:/i, "") + "</a>";
    }
    aTarget.append("<li>" + person + "</li>");
  }

  tools.AddonManager.getAddonByID("scriptish@erikvold.com", function(aAddon) {
    var $contlist = $("#contlist");
    var $translist = $("#translist");

    $.each(aAddon.contributors, function(i, val) addPerson($contlist, val));
    $.each(aAddon.translators, function(i, val) addPerson($translist, val));
  });
});

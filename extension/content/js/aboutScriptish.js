$(function() {
  if (window.location.href.split("?")[1] == "test") {
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
  }
});

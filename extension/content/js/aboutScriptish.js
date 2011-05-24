const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

(function() {
  if (window.location.href.split("?")[1] == "test") {
    var head = document.documentElement.firstChild;
    var include = function(aSrc, aCallback) {
      var script = document.createElement("script");
      script.src = aSrc;
      script.addEventListener("load", aCallback, false);
      head.appendChild(script);
    }

    include("test/jquery-1.6.1.min.js", function() {
      include("test/qunit.js", function() {
        include("test/runTests.js", function() {
          $("#main").hide();
          $("#test").show();
          runTests();
        });
      });
    });
  }
})();

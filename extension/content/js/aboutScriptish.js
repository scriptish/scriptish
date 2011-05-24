$(function() {
  var doTest = window.location.href.split("?")[1] == "test";
  if (!doTest) return;
  $("#main").hide();
  $("#test").show();
  runTests();
});


Components.utils.import("resource://scriptish/utils/Scriptish_memoize.js");

module("Scriptish_memoize");

test("Memoization", function() {
  var counter = 0;
  var memoizedFunc = Scriptish_memoize(function(aIn1, aIn2) {
    counter++;
    return aIn1 + aIn2;
  });

  equal(memoizedFunc(2,2), 4, "2 + 2 = 4");
  ok(counter, 1);
  equal(memoizedFunc(2,3), 5, "2 + 3 = 5");
  ok(counter, 2);
  equal(memoizedFunc(2,2), 4, "2 + 2 = 4");
  ok(counter, 2);
  equal(memoizedFunc(2,3), 5, "2 + 3 = 5");
  ok(counter, 2);
  equal(memoizedFunc(12,34), 46, "12 + 34 = 46");
  ok(counter, 3);
  equal(memoizedFunc(1,234), 235, "1 + 234 = 235");
  ok(counter, 4);
});

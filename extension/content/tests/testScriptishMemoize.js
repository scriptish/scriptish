module("Scriptish_memoize");

test("exports", 1, function() checkExports("resource://scriptish/utils/Scriptish_memoize.js", ["Scriptish_memoize"]));

test("memoize0", function() {
  const {Scriptish_memoize} = importModule("resource://scriptish/utils/Scriptish_memoize.js");
  raises(function() Scriptish_memoize(function() true));
});

test("memoize1", function() {
  const {Scriptish_memoize} = importModule("resource://scriptish/utils/Scriptish_memoize.js");
  var counter = 0;
  var memoizedFunc = Scriptish_memoize(function(aIn1) {
    counter++;
    return -aIn1;
  });

  equal(memoizedFunc(2), -2, "-2");
  ok(counter, 1);
  equal(memoizedFunc(3), -3, "-3");
  ok(counter, 2);
  equal(memoizedFunc(2), -2, "-2");
  ok(counter, 2);
  equal(memoizedFunc(3), -3, "-3");
  ok(counter, 2);
  equal(memoizedFunc(4), -4, "-4");
  ok(counter, 3);
});

test("memoize2", function() {
  const {Scriptish_memoize} = importModule("resource://scriptish/utils/Scriptish_memoize.js");
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

test("memoize3", function() {
  const {Scriptish_memoize} = importModule("resource://scriptish/utils/Scriptish_memoize.js");
  var counter = 0;
  var memoizedFunc = Scriptish_memoize(function(aIn1, aIn2, aIn3) {
    counter++;
    return aIn1 + aIn2 + aIn3;
  });

  equal(memoizedFunc(1,2,3), 6, "1 + 2 + 3 = 6");
  ok(counter, 1);
  equal(memoizedFunc(3,2,1), 6, "3 + 2 + 1 = 6");
  ok(counter, 2);
  equal(memoizedFunc(1,2,3), 6, "1 + 2 + 3 = 6");
  ok(counter, 2);
  equal(memoizedFunc(3,2,1), 6, "3 + 2 + 1 = 6");
  ok(counter, 2);
  equal(memoizedFunc(2,3,1), 6, "2 + 3 + 1 = 6");
  ok(counter, 3);
});

test("memoize4", function() {
  const {Scriptish_memoize} = importModule("resource://scriptish/utils/Scriptish_memoize.js");
  var counter = 0;
  var memoizedFunc = Scriptish_memoize(function(aIn1, aIn2, aIn3, aIn4) {
    counter++;
    return aIn1 + aIn2 + aIn3 - aIn4;
  });

  equal(memoizedFunc(1,2,3,7), -1, "1 + 2 + 3 - 7 = -1");
  ok(counter, 1);
  equal(memoizedFunc(3,2,1,7), -1, "3 + 2 + 1 - 7 = -1");
  ok(counter, 2);
  equal(memoizedFunc(1,2,3,7), -1, "1 + 2 + 3 - 7 = -1");
  ok(counter, 2);
  equal(memoizedFunc(3,2,1,7), -1, "3 + 2 + 1 - 7 = -1");
  ok(counter, 2);
  equal(memoizedFunc(2,3,1,7), -1, "2 + 3 + 1 - 7 = -1");
  ok(counter, 3);
});

test("memoize5", function() {
  const {Scriptish_memoize} = importModule("resource://scriptish/utils/Scriptish_memoize.js");
  var counter = 0;
  var memoizedFunc = Scriptish_memoize(function(aIn1, aIn2, aIn3, aIn4, aIn5) {
    counter++;
    return aIn1 + aIn2 + aIn3 - aIn4 - aIn5;
  });

  equal(memoizedFunc(1,2,3,7,-2), 1, "1 + 2 + 3 - 7 - (-2) = 1");
  ok(counter, 1);
  equal(memoizedFunc(3,2,1,7,-2), 1, "3 + 2 + 1 - 7 - (-2) = 1");
  ok(counter, 2);
  equal(memoizedFunc(1,2,3,7,-2), 1, "1 + 2 + 3 - 7 - (-2) = 1");
  ok(counter, 2);
  equal(memoizedFunc(3,2,1,7,-2), 1, "3 + 2 + 1 - 7 - (-2) = 1");
  ok(counter, 2);
  equal(memoizedFunc(2,3,1,7,-2), 1, "2 + 3 + 1 - 7 - (-2) = 1");
  ok(counter, 3);
});

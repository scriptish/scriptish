#!/usr/bin/env node

var exec = require('child_process').exec;

var debug = ("debug" == process.argv[2]);

exec("./build.sh test", function() {
  console.log("Running mozmill tests...");
  if (debug) {
    exec("mozmill -t tests/mozmill-tests -a scriptish-test.xpi --show-all", doAsycTests.bind(null, 0));
  } else {
    exec("mozmill -t tests/mozmill-tests -a scriptish-test.xpi", doAsycTests.bind(null, 0));
  }
});

function dumpResults(e, out) {
  if (out) console.log(out);
}

function doAsycTests(step, e, out) {
  dumpResults(e, out);
  step = step || 0;
  switch (step) {
  case 4:
    console.log("Running mozmill-restart tests...");
    if (debug) {
      exec("mozmill-restart -t tests/mozmill-tests/tests/restartTests -a scriptish-test.xpi --show-all", dumpResults);
    } else {
      exec("mozmill-restart -t tests/mozmill-tests/tests/restartTests -a scriptish-test.xpi", dumpResults);
    }
    return;
  case 0:
    console.log("Starting restart tests in 10 secs... (Press ctrl+z to cancel)");
    return setTimeout(doAsycTests.bind(null, ++step), 7000);
  case 1:
    console.log("Starting restart tests in 3 secs...");
    return setTimeout(doAsycTests.bind(null, ++step), 1000);
  case 2:
    console.log("Starting restart tests in 2 secs...");
    return setTimeout(doAsycTests.bind(null, ++step), 1000);
  case 3:
    console.log("Starting restart tests in 1 secs...");
    return setTimeout(doAsycTests.bind(null, ++step), 1000);
  }
}

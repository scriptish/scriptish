#!/bin/sh

./build.sh test
echo "Running mozmill tests..."
if [ "debug" == "$1" ]; then
  mozmill -t tests/mozmill-tests -a scriptish-test.xpi --show-all
else
  mozmill -t tests/mozmill-tests -a scriptish-test.xpi
fi

echo "Starting restart tests in 10 secs... (Press ctrl+z to cancel)"
sleep 7
echo "Starting restart tests in 3 secs..."
sleep 1
echo "Starting restart tests in 2 secs..."
sleep 1
echo "Starting restart tests in 1 secs..."
sleep 1
echo "Running mozmill-restart tests..."

if [ "debug" == "$1" ]; then
  mozmill-restart -t tests/mozmill-tests/tests/restartTests -a scriptish-test.xpi --show-all
else
  mozmill-restart -t tests/mozmill-tests/tests/restartTests -a scriptish-test.xpi
fi

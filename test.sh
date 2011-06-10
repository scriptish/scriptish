#!/bin/sh

./build.sh test
echo "Running mozmill tests..."
if [ "debug" == "$1" ]; then
  mozmill -t tests/mozmill-tests -a scriptish-test.xpi --show-all
else
  mozmill -t tests/mozmill-tests -a scriptish-test.xpi
fi

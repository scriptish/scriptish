#!/bin/sh

./build.sh test
echo "Running mozmill tests..."
mozmill -t tests/mozmill-tests -a scriptish-test.xpi

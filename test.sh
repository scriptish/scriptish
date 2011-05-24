#!/bin/sh

./build.sh test
mozmill -t tests/mozmill-tests -a scriptish-test.xpi

#!/usr/bin/env python

# Nils Maier has dedicated this work to the public domain by waiving all of his
# rights to the work worldwide under copyright law, including all related
# and neighboring rights, to the extent allowed by law.
# http://creativecommons.org/publicdomain/zero/1.0/

import os, sys, re
from glob import glob
from codecs import open as copen

class Properties(object):
    def __init__(self, file):
        self.file = file
        self._items = {}
        with copen(self.file, "rb", encoding="utf-8") as fp:
            for line in fp:
                line = line.strip()
                if line.startswith("#"):
                    continue
                key, value = line.split("=", 1)
                self._items[key] = value

    def merge(self, rhs):
        # remove obsolete
        for k in self._items.keys():
            if not k in rhs._items:
                del self._items[key]

        # add new keys
        for k in rhs._items.keys():
            if not k in self._items:
                self._items[k] = ""

    def save(self):
        with copen(self.file, "wb", encoding="utf-8") as op:
            for k in sorted(self._items.keys(), key=unicode.lower):
                op.write("%s=%s\n" % (k, self._items[k]))

def process_properties(base, files):
    base = Properties(base)
    base.save()
    for file in files:
        if file == base.file:
            continue
        print file
        file = Properties(file)
        file.merge(base)
        file.save()


if __name__ == "__main__":
    for f in glob("extension/locale/en-US/*.properties"):
        fn = os.path.basename(f)
        process_properties(f, glob("extension/locale/*/" + fn))

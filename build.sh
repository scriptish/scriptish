#!/bin/sh

# Set up variables
if [ "official" = "$1" ]; then
  # For official builds, use the version in install.rdf.
  VER=`sed -ne '/em:version/{ s/.*>\(.*\)<.*/\1/; p}' install.rdf`
else
  # For beta builds, generate a version number.
  VER=`date +"%Y.%m.%d.beta"`
fi
XPI="scriptish-$VER.xpi"

# Copy base structure to a temporary build directory and change to it
echo "Creating working directory ..."
rm -rf build
mkdir build
cp -r \
  chrome.manifest components content defaults install.rdf license LICENSE.txt \
       locale modules skin \
  build/
cd build

echo "Cleaning up unwanted files ..."
find . -depth -name '*~' -exec rm -rf "{}" \;
find . -depth -name '#*' -exec rm -rf "{}" \;

echo "Creating $XPI ..."
zip -qr9XD "../$XPI" *

echo "Cleaning up temporary files ..."
cd ..
rm -rf build

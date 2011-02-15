#!/bin/sh

# Set up variables
if [ "amo" = "$1" ] || [ "staging" = "$1" ]; then
  # For official builds, use the version in install.rdf.
  VER=`grep -Go 'em:version\>\(.*\)\<' extension/install.rdf | grep -Go '>\(.*\)<' | sed -e 's/[><]*//g'`
else
  # For beta builds, generate a version number.
  VER=`date +"%Y.%m.%d.beta"`
fi
XPI="scriptish-$VER.xpi"

# Copy base structure to a temporary build directory and change to it
echo "Creating working directory ..."
rm -rf build
mkdir build
cp LICENSE.txt build/
cd extension
cp -r \
  chrome.manifest components content defaults install.rdf license \
      locale modules skin \
  ../build/
cd ../build

if [ "amo" = "$1" ]; then
  (sed -e 's/<em\:update.*//g' install.rdf > install.rdf.$$ &&
   mv install.rdf.$$ install.rdf)
fi

(sed -e 's/<!--.*//g' install.rdf > install.rdf.$$ &&
 mv install.rdf.$$ install.rdf)

echo "Cleaning up unwanted files ..."
find . -depth -name '*~' -exec rm -rf "{}" \;
find . -depth -name '#*' -exec rm -rf "{}" \;
find . -depth -name '.DS_Store' -exec rm "{}" \;

echo "Creating $XPI ..."
zip -qr9XD "../$XPI" *

echo "Cleaning up temporary files ..."
cd ..
rm -rf build

#!/bin/sh

# Set up variables
if [ "amo" == "$1" ] || [ "staging" == "$1" ]; then
  # For official builds, use the version in install.rdf.
  VER=`grep -Go 'em:version\>\(.*\)\<' extension/install.rdf | grep -Go '>\(.*\)<' | sed -e 's/[><]*//g'`
elif [ "test" == "$1" ]; then
  VER=`echo test`
else
  # For beta builds, generate a version number.
  VER=`date +"%Y.%m.%d.beta"`
fi
XPI="scriptish-$VER.xpi"

# Copy base structure to a temporary build directory and change to it
if [ "test" != "$1" ]; then
  echo "Creating working directory ..."
fi
rm -rf build
mkdir build
cp LICENSE.txt build/
cd extension
cp -r \
  chrome.manifest components content defaults install.rdf license \
      locale modules skin \
  ../build/
cd ../build

sed -e 's/extension\/license/license/g' LICENSE.txt > LICENSE.txt.$$
mv LICENSE.txt.$$ LICENSE.txt

if [ "amo" = "$1" ]; then
  (sed -e 's/<em\:update.*//g' install.rdf > install.rdf.$$ &&
   mv install.rdf.$$ install.rdf)
fi

(sed -e 's/<!--.*//g' install.rdf > install.rdf.$$ &&
 mv install.rdf.$$ install.rdf)

if [ "test" != "$1" ]; then
  echo "Cleaning up unwanted files ..."
  find . -depth -name '*~' -exec rm -rf "{}" \;
  find . -depth -name '#*' -exec rm -rf "{}" \;
  find . -depth -name '.DS_Store' -exec rm "{}" \;
fi

echo "Creating $XPI ..."
zip -qr9XD "../$XPI" *

if [ "test" != "$1" ]; then
  echo "Cleaning up temporary files ..."
fi
cd ..
rm -rf build

var EXPORTED_SYMBOLS = ["Scriptish_cryptoHash"];
Components.utils.import("resource://scriptish/constants.js");

function Scriptish_cryptoHash(aString, aAlg, aCharset) {
  let ch = Instances.ch;
  let unicodeConverter = Instances.suc;
  let str = aString + "";
  let alg = ((aAlg || "SHA1") + "").trim().toUpperCase();
  let charset = (aCharset || "UTF-8") + "";

  try {
    ch.initWithString(alg);
  } catch (e) {
    throw new Error("Invalid hash algorithm specified.");
  }

  try {
    unicodeConverter.charset = charset;
  } catch(e) {
    throw new Error("Invalid charset specified.");
  }

  // Make sure we're working with Unicode
  if (!/^UTF-(?:8|16|32)$/.test(unicodeConverter.charset))
    aString = unicodeConverter.ConvertToUnicode(aString);

  var data = unicodeConverter.convertToByteArray(aString, {});

  ch.update(data, data.length);
  var hash = ch.finish(false); // hash as raw octets

  var hex = [];
  for (var i = 0; i < hash.length; i++) {
    hex.push( ("0" + hash.charCodeAt(i).toString(16)).slice(-2) );
  }
  return hex.join('');
}

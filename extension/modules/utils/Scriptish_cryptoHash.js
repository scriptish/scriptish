var EXPORTED_SYMBOLS = ["Scriptish_cryptoHash"];
Components.utils.import("resource://scriptish/constants.js");

function Scriptish_cryptoHash(aString, aAlg, aCharset) {
  try {
    aString = aString.toString();
  } catch(e) {
    throw new Error("Unable to convert argument into a string.");
  }

  var ch = Instances.ch;

  if (aAlg) {
    try {
      aAlg = aAlg.trim().toUpperCase();
    } catch(e) {}
  } else {
    aAlg = "SHA1";
  }
  switch (aAlg) {
    case "MD2":
      aAlg = ch.MD2;
      break;
    case "MD5":
      aAlg = ch.MD5;
      break;
    case "SHA1":
      aAlg = ch.SHA1;
      break;
    case "SHA256":
      aAlg = ch.SHA256;
      break;
    case "SHA384":
      aAlg = ch.SHA384;
      break;
    case "SHA512":
      aAlg = ch.SHA512;
      break;
    default:
      throw new Error("Invalid hash algorithm specified.");
  }

  var unicodeConverter = Instances.suc;
  unicodeConverter.charset = "UTF-8";

  if (aCharset) {
    try {
      unicodeConverter.charset = aCharset.trim().toUpperCase();
    } catch(e) {
      throw new Error("Invalid charset specified.");
    }
  }

  // Make sure we're working with Unicode
  if (!/^UTF-(?:8|16|32)$/.test(unicodeConverter.charset))
    aString = unicodeConverter.ConvertToUnicode(aString);

  var data = unicodeConverter.convertToByteArray(aString, {});

  ch.init(aAlg);
  ch.update(data, data.length);
  var hash = ch.finish(false); // hash as raw octets

  var hex = [];
  for (var i = 0; i < hash.length; i++) {
    hex.push( ("0" + hash.charCodeAt(i).toString(16)).slice(-2) );
  }
  return hex.join('');
}

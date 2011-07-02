var EXPORTED_SYMBOLS = ["Scriptish_convert2RegExp"];

const RE_REGEXP = /^\/(.*)\/(i)?$/;
const RE_ESCAPE = /[{}()\[\]\\^$.?]/g;
const RE_WILD = /\*/g;
const RE_TLD = /^\^[^\/]*(?:\/\/)?[^\/]*\\\.tld(?:\/.*)?\$$/;

function Scriptish_convert2RegExp(aPattern, aNoTLD) {
  var s = aPattern.toString().trim();

  // Already a regexp?
  if (RE_REGEXP.test(s)) return new RegExp(RegExp.$1, RegExp.$2);

  var res = "^" + s
    .replace(RE_ESCAPE, "\\$&")
    .replace(RE_WILD, ".*")
    + "$";
  var regExp = new RegExp(res, "i");
  regExp.isTLD = !aNoTLD && RE_TLD.test(res);
  return regExp;
}

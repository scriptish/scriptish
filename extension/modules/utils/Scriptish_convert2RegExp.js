var EXPORTED_SYMBOLS = ["Scriptish_convert2RegExp"];

// Mighty TLD Check
const tldChk = new RegExp("^(\\^(?:[^/]*)(?://)?(?:[^/]*))(\\\\\\.tld)((?:/.*)?)$");

// Converts simple pattern notation to a regular expression.
// thanks AdBlock! http://www.mozdev.org/source/browse/adblock/adblock/
function Scriptish_convert2RegExp(aPattern, aNoTLD) {
  var s = aPattern+"";
  var res = "^";

  var regExpChk = /^\/(.*)\/(i)?\n?$/.exec(s);
  if (regExpChk) return new RegExp(regExpChk[1], regExpChk[2]);

  for (var i = 0 ; i < s.length; i++) {
    switch(s[i]) {
      case "*":
        res += ".*";
        break;
      case ".":
      case "?":
      case "^":
      case "$":
      case "+":
      case "{":
      case "}":
      case "[":
      case "]":
      case "|":
      case "(":
      case ")":
      case "\\":
        res += "\\" + s[i];
        break;
      case " ":
      case "\n":
        break;
      default:
        res += s[i];
        break;
    }
  }

  var regExp = new RegExp(res+"$", "i");
  if (!aNoTLD && tldChk.test(res))
    regExp.isTLD = true;

  return regExp;
}

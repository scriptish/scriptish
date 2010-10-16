var EXPORTED_SYMBOLS = ["Scriptish_getURLsForContentWindow"];
function Scriptish_getURLsForContentWindow(aWin) {
  var urls = [];
  var seen = {}
  function urlsOfFrames(aWin) {
    var url = aWin.location.href;
    if (!seen.hasOwnProperty(url)) seen[url] = !!urls.push(url);
    for (var i = 0, win; win = aWin.frames[i++];) urlsOfFrames(win);
    return urls;
  }
  return urlsOfFrames(aWin);
}

module("GM_xmlhttpRequester");

test("exports", function() {
  checkExports(
    "resource://scriptish/api/GM_xmlhttpRequester.js",
    ["GM_xmlhttpRequester"]
    );
});

(function() {
  "use strict";
  const {GM_xmlhttpRequester} = Cu.import("resource://scriptish/api/GM_xmlhttpRequester.js");
  var script = {
    fileURL: "file:///test.js",
    matchesDomain: function() true
  };
  const xhrp = new GM_xmlhttpRequester(window, window, "http://example.org", script, window);
  const xhr = xhrp.contentStartRequest.bind(xhrp);

  asyncTest("plain GET", function() {
    xhr({url: "data:text/plain,test", onload: function(r) {
      QUnit.start();
      strictEqual(r.responseText, "test");
    }});
  });

  asyncTest("plain POST", function() {
    xhr({method: "POST", url: "data:text/plain,test", onload: function(r) {
      QUnit.start();
      strictEqual(r.responseText, "test");
    }});
  });

  test("invalid protos", function() {
    for (var p of ["file", "gopher", "magnet", "torrent", "call"]) {
      raises(function() xhr({url: p + ":text/plain,test"}));
    }
  });

  // TODO redirect + ignores
  // TODO private
  // TODO payload
  // TODO ssl + errors
  // TODO full response object
})();

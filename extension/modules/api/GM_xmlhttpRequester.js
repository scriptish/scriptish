var EXPORTED_SYMBOLS = ["GM_xmlhttpRequester"];
(function(inc){
  inc("resource://scriptish/constants.js");
  inc("resource://scriptish/logging.js");
  inc("resource://scriptish/utils/Scriptish_stringBundle.js");
  inc("resource://scriptish/api.js");
})(Components.utils.import)

function GM_xmlhttpRequester(unsafeContentWin, originUrl, aScript) {
  this.unsafeContentWin = unsafeContentWin;
  this.originUrl = originUrl;
  this.script = aScript;
}

// this function gets called by user scripts in content security scope to
// start a cross-domain xmlhttp request.
//
// details should look like:
// {method,url,onload,onerror,onreadystatechange,headers,data}
// headers should be in the form {name:value,name:value,etc}
// can't support mimetype because i think it's only used for forcing
// text/xml and we can't support that
GM_xmlhttpRequester.prototype.contentStartRequest = function(details) {
  Scriptish_log("> GM_xmlhttpRequest.contentStartRequest");

  try {
    // Validate and parse the (possibly relative) given URL.
    var uri = NetUtil.newURI(details.url, null, NetUtil.newURI(this.originUrl));
    var url = uri.spec;
  } catch (e) {
    // A malformed URL won't be parsed properly.
    throw new Error(Scriptish_stringBundle("error.api.reqURL") + ": " + details.url);
  }

  // check if the script is allowed to access the url
  if (!this.script.matchesDomain(url))
    throw new Error(
        "User script is attempting access to restricted domain '" + uri.host + "'",
        this.script.fileURL);

  // This is important - without it, GM_xmlhttpRequest can be used to get
  // access to things like files and chrome. Careful.
  switch (uri.scheme) {
    case "http":
    case "https":
    case "ftp":
      var req = Instances.xhr;
      this.chromeStartRequest(url, details, req);
      break;
    default:
      throw new Error(Scriptish_stringBundle("error.api.reqURL.scheme") + ": " + details.url);
  }

  Scriptish_log("< GM_xmlhttpRequest.contentStartRequest");

  return {
    abort: function() {
      req.abort();
    }
  };
}

// this function is intended to be called in chrome's security context, so
// that it can access other domains without security warning
GM_xmlhttpRequester.prototype.chromeStartRequest =
    function(safeUrl, details, req) {
  Scriptish_log("> GM_xmlhttpRequest.chromeStartRequest");

  this.setupRequestEvent(this.unsafeContentWin, req, "onload", details);
  this.setupRequestEvent(this.unsafeContentWin, req, "onerror", details);
  this.setupRequestEvent(
      this.unsafeContentWin, req, "onreadystatechange", details);

  if (details.mozBackgroundRequest) req.mozBackgroundRequest = true;

  req.open(
      details.method, safeUrl, true, details.user || "", details.password || "");

  if (details.overrideMimeType) req.overrideMimeType(details.overrideMimeType);

  if (details.ignoreCache)
    req.channel.loadFlags |= Ci.nsIRequest.LOAD_BYPASS_CACHE; // bypass cache

  if (details.headers) {
    var headers = details.headers;

    for (var prop in headers) {
      if (Object.prototype.hasOwnProperty.call(headers, prop))
        req.setRequestHeader(prop, headers[prop]);
    }
  }

  var body = details.data ? details.data : null;
  if (details.binary) req.sendAsBinary(body);
  else req.send(body);

  Scriptish_log("< GM_xmlhttpRequest.chromeStartRequest");
}

// arranges for the specified 'event' on xmlhttprequest 'req' to call the
// method by the same name which is a property of 'details' in the content
// window's security context.
GM_xmlhttpRequester.prototype.setupRequestEvent =
    function(unsafeContentWin, req, event, details) {
  Scriptish_log("> GM_xmlhttpRequester.setupRequestEvent");

  if (details[event]) {
    req[event] = function() {
      Scriptish_log("> GM_xmlhttpRequester -- callback for " + event);

      var responseState = {
        // can't support responseXML because security won't
        // let the browser call properties on it
        responseText: req.responseText,
        readyState: req.readyState,
        responseHeaders: null,
        status: null,
        statusText: null,
        finalUrl: null
      };
      if (4 == req.readyState && 'onerror' != event) {
        responseState.responseHeaders = req.getAllResponseHeaders();
        responseState.status = req.status;
        responseState.statusText = req.statusText;
        responseState.finalUrl = req.channel.URI.spec;
      }

      GM_apiSafeCallback(
          unsafeContentWin, details, details[event], [responseState]);

      Scriptish_log("< GM_xmlhttpRequester -- callback for " + event);
    }
  }

  Scriptish_log("< GM_xmlhttpRequester.setupRequestEvent");
}

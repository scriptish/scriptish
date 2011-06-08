var EXPORTED_SYMBOLS = ["GM_xmlhttpRequester"];
(function(inc){
  inc("resource://scriptish/constants.js");
  inc("resource://scriptish/logging.js");
  inc("resource://scriptish/utils/Scriptish_stringBundle.js");
  inc("resource://scriptish/api.js");
})(Components.utils.import)

const MIME_JSON = /^(application|text)\/(?:x-)?json/i;

/**
 * Abstract base class for (chained) request notification callback overrides
 *
 * Use such overrides sparely, as the individual request performance might
 * degrade quite a bit.
 *
 * @param req XMLHttpRequest (chrome)
 * @author Nils Maier
 */
function NotificationCallbacks(req) {
  throw new Error("trying to initiate an abstract NotificationCallbacks");
}
NotificationCallbacks.prototype = {
  init: function(req) {
    // rewrite notification callbacks
    this._channel = req.channel;
    this._notificationCallbacks = this._channel.notificationCallbacks;
    this._channel.notificationCallbacks = this;
  },
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIInterfaceRequestor]),
  getInterface: function(iid) {
    try {
      return this.query(iid);
    }
    catch (ex) {
      return this.queryOriginal(iid);
    }
  },
  queryOriginal: function(iid) {
    if (this._notificationCallbacks) {
      return this._notificationCallbacks.getInterface(iid);
    }
    throw Cr.NS_ERROR_NO_INTERFACE;
  }
}

/**
 * Ignore (specific) redirects
 * @param req XMLHttpRequest (chrome)
 * @author Nils Maier
 */
function IgnoreRedirect(req, ignoreFlags) {
  this.init(req);
  this.ignoreFlags = ignoreFlags;
}
IgnoreRedirect.prototype = {
  __proto__: NotificationCallbacks.prototype,
  query: XPCOMUtils.generateQI([Ci.nsIChannelEventSink]),
  asyncOnChannelRedirect: function(oldChannel, newChannel, flags, callback) {
    if (this.ignoreFlags & flags) {
      // must throw here, not call callback.onRedirectVerifyCallback,
      // or else it will completely cancel the request
      throw Cr.NS_ERROR_UNEXPECTED;
    }

    try {
      let ces = this.queryOriginal(Ci.nsIChannelEventSink);
      if (ces) {
        ces.asyncOnChannelRedirect(oldChannel, newChannel, flags, callback);
        return;
      }
    }
    catch (ex) {}

    callback.onRedirectVerifyCallback(Cr.NS_OK);
  }
};


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

  if (details.ignoreRedirect)
    new IgnoreRedirect(req,
      Ci.nsIChannelEventSink.REDIRECT_TEMPORARY | Ci.nsIChannelEventSink.REDIRECT_PERMANENT);
  if (details.ignoreTempRedirect)
    new IgnoreRedirect(req, Ci.nsIChannelEventSink.REDIRECT_TEMPORARY);
  if (details.ignorePermanentRedirect)
    new IgnoreRedirect(req, Ci.nsIChannelEventSink.REDIRECT_PERMANENT);

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
}

// arranges for the specified 'event' on xmlhttprequest 'req' to call the
// method by the same name which is a property of 'details' in the content
// window's security context.
GM_xmlhttpRequester.prototype.setupRequestEvent =
    function(unsafeContentWin, req, event, details) {
  var origMimeType = details.overrideMimeType;

  if (details[event]) {
    req[event] = function() {
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
        if (MIME_JSON.test(origMimeType)
            || MIME_JSON.test(details.overrideMimeType)
            || MIME_JSON.test(req.channel.contentType)) {
          try {
            responseState.responseJSON = Instances.json.decode(req.responseText);
          } catch (e) {
            responseState.responseJSON = {};
          }
        }
        responseState.finalUrl = req.channel.URI.spec;
      }

      GM_apiSafeCallback(
          unsafeContentWin, details, details[event], [responseState]);
    }
  }
}

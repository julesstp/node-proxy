/*jshint node:true, indent:2, curly:false, eqeqeq:true, immed:true, latedef:true, newcap:true, noarg:true,
regexp:true, undef:true, strict:true, trailing:true, white:true */
/*global X:true */

(function () {
  "use strict";
  
  var _http = X.http, _ = X._, parser, httpProxy = require("http-proxy");
  
  parser = X.connect.utils.parseCookie;
  
  X.proxyController = X.Object.create({
    proxies: [],
    map: {},
    init: function () {
      this.retrieveList();
    },
    route: function (req, res) {
      var proxy = this.next(), sid, cookie, map, buffer;
      
      //X.debug("%@:%@".f(proxy.target.host, proxy.target.port));
      
      buffer = httpProxy.buffer(req);
      
      if (req.url.match(/socket\.io/g)) {
        cookie = req.cookies? req.cookies.xtsessioncookie: null;
        if (X.none(cookie)) {
          X.warn("Invalid or missing cookie on request for socket");
          //return res.end(); // ????????????
          return proxy.proxyRequest(req, res, {buffer: buffer});
        }
        sid = X.json(cookie).sid;
        if (X.none(sid)) {
          X.warn("Invalid or missing session id on request");
          //return res.end(); // ????????????
          return proxy.proxyRequest(req, res, {buffer: buffer});
        }
        map = this.get("map");
        map[sid] = proxy;
      }
      proxy.proxyRequest(req, res, {buffer: buffer});
    },
    upgrade: function (req, socket, head) {
      var proxy, map = this.get("map"), sid, cookie;
      cookie = req.headers.cookie? parser(req.headers.cookie): null;
      if (X.none(cookie) || X.none(cookie.xtsessioncookie)) {
        X.warn("Invalid or missing cookie on upgrade request", req);
        return; // ??????????
      }
      sid = X.json(cookie.xtsessioncookie).sid;
      if (X.none(sid) || X.none(map[sid])) {
        X.warn("Invalid or missing session id on upgrade request", req);
        return; // ??????????
      }
      proxy = map[sid];
      proxy.proxyWebSocketRequest(req, socket, head);
      delete map[sid];
    },
    retrieveList: function () {
      //X.debug("X.proxyController.retrieveList()");
      var req, options = {
        hostname: "localhost",
        port: 9000,
        path: "/datasources",
        method: "GET"
      };
      req = _http.request(options, _.bind(this.didRetrieveList, this));
      req.on("error", _.bind(this.didError, this));
      req.end();
    },
    next: function () {
      var proxies = this.get("proxies"), ret;
      ret = proxies.shift();
      proxies.push(ret);
      return ret;
    },
    didRetrieveList: function (res) {
      var data = {payload: ""};
      res.on("data", _.bind(this.chunk, this, data));
      res.on("end", _.bind(this.didEnd, this, data));
    },
    chunk: function (data, chunk) {
      data.payload += chunk;
    },
    didEnd: function (data) {
      //X.debug("didEnd(): ", data);
      this.set("proxies", X.json(data.payload));
      this.emit("ready");
    },
    didError: function (err) {
      X.warn(err);
    },
    proxiesDidChange: function () {
      var proxies = this.get("proxies");

      proxies = proxies.map(function (info) {
        
        X.log("Adding datasource, %@ %@:%@".f(info.name, info.hostname, info.port));
        
        return (new httpProxy.HttpProxy({
          target: {
            host: info.hostname,
            port: info.port,
            https: true
          }
        }));
      });
      
      // avoid the observer
      this.proxies = proxies;
    }.observes("proxies"),
    className: "X.proxyController"
  });
}());

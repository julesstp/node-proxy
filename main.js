#!/usr/bin/env node

require("xt");

var httpProxy = require("http-proxy"), https = require("https"), 
    proxy1, proxy2, server, options, fs = XT.fs, path = XT.path,
    parser = XT.connect.utils.parseCookie, map = {}, proxies;

XT.debugging = true;

XT.setup({
  requireServer: true,
  autoStart: true
});

require("./lib/redirector");

// it looks like it will need to have an instance of proxy
// for each available datasource to be able to properly proxy
// the websockets...
keys = path.join(XT.basePath, "../node-datasource/lib/private");
options = {
  key: fs.readFileSync(path.join(keys, "key.pem"), "utf8").trim(),
  cert: fs.readFileSync(path.join(keys, "cert.crt"), "utf8").trim()
};

proxy1 = new httpProxy.HttpProxy({
  target: {
    host: "localhost",
    port: 20100,
    https: true
  }
});

proxy2 = new httpProxy.HttpProxy({
  target: {
    host: "localhost",
    port: 20101,
    https: true
  }
});

proxies = [proxy1, proxy2];

server = XT.connect(options);
server.use(XT.connect.cookieParser());
server.use(function (req, res) {
  XT.debug("https request %@".f(req.url));
  var sid, cookie, proxy = proxies.shift();
  if (req.url.match(/socket\.io/g)) {
    sid = XT.json(req.cookies.xtsessioncookie).sid;
    map[sid] = proxy;
    XT.debug("mapped sid: %@ from request %@".f(sid, req.url));
  }
  proxy.proxyRequest(req, res);
  proxies.push(proxy);
});

server.on("upgrade", function (req, socket, head) {
  var cookie, sid, proxy;
  cookie = XT.json(parser(req.headers.cookie).xtsessioncookie);
  sid = cookie.sid;
  XT.debug("upgrade request for %@ by %@".f(sid, req.url));
  proxy = map[sid];
  proxy.proxyWebSocketRequest(req, socket, head);
  delete map[sid];
});

server.listen(443);
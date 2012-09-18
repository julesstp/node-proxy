(function () {
  
  var _net = require("net"), client,
      connect, retryTimer, failedTimer, failed;
  
  X.debugging = true;
  
  connect = function () {
    client = _net.connect(22000, "localhost");
    client.on("connect", function () {

      X.log("Connection established with the router");
      
      if (failedTimer) clearTimeout(failedTimer);
      if (retryTimer) clearTimeout(retryTimer);

      var info = {};
      info.hostname = "maxhammer";
      info.name = "Reverse Proxy";
      client.write(X.json({type: "proxy", details: info}));
    });
    client.on("error", function (err) {
      //issue(X.fatal("could not connect to router: ", err.message));
      X.warn("Could not connect to the router...retrying in 10 seconds");
      if (!failedTimer) failedTimer = setTimeout(failed, 120000);
      //if (!failedTimer) failedTimer = setTimeout(failed, 60000);
      retryTimer = setTimeout(connect, 10000);
    });
    
    client.setEncoding("utf8");
    
    // node-proxy actually expects responses from the router unlike most
    // of the other services that might register or be pinged, since the
    // router will update the proxy of any new datasources that become
    // available
    client.on("data", function (data) {
      var action;
      data = X.json(data);
      action = data.action;
      if (action === "add") {
        X.proxyController.addProxy(data.details);
      } else if (action === "remove") {
        X.proxyController.removeProxy(data.details);
      }
    });
    
    client.on("end", function () {
      X.warn("Disconnected from the router, trying to reconnect");
      connect();
    });
  };
  
  failed = function () {
    issue(X.fatal("Could not establish a connection with the router"));
  };
  
  //client = _net.connect(22000, X.options.proxy.hostname);
  connect();
  
}());
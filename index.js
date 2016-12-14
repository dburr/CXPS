"use strict";
const Global = require("./extra/global.js");
const log = new Global.Log.create(Global.Log.LEVEL.VERBOSE, "Setup");
const http = require("http");
const Q = require("q");
const fs = require("fs");
const initialSetup = function(){
  var defer = Q.defer();
  var failed = false;
  var c = Global.Config();

  if (c.hmac_key.length == 0){
    log.warn("Warning: HMAC Key has not been configured.");
  }
  if (c.database.connection.host.length == 0 || c.database.connection.database.length == 0 || c.database.connection.user.length == 0){
    defer.reject("MySQL Database has not been configured."); failed = true;
  }

  if (!fs.existsSync("./data/db/unit.db_")){
    defer.reject("required file 'data/db/unit.db_' is missing"); failed = true;
  }

  if (!fs.existsSync("./data/db/live.db_")){
    defer.reject("required file 'data/db/live.db_' is missing"); failed = true;
  }

  if (!fs.existsSync("./data/db/item.db_")){
    defer.reject("required file 'data/db/item.db_' is missing"); failed = true;
  }

  if (!fs.existsSync("./data/db/live_notes.db_")){
    defer.reject("required file 'data/db/live_notes.db_' is missing"); failed = true;
  }

  if (!failed){defer.resolve();}


  return defer.promise;
};




const initiateServer = function () {
  var defer = Q.defer();

  log.verbose("Initiating");
  var server = http.createServer(Global.httpRequestHandler);
  Global.loadModules().then(function(){
    server.listen(Global.Config().server.port, Global.Config().server.hostname, null, function(err){
      if (err){defer.reject(err);return;}
      log.info("Listening on " + server.address().address + ":" + server.address().port);
      defer.resolve();
    });
  }).catch(defer.reject);

  return defer.promise;
};

Global.loadConfig().then(function(){
  log.LOG_LEVEL = Global.Config().log.level;
}).then(initialSetup)
  .then(Global.mysqlConnect)
  .then(function(){

    var d=Q.defer();
    Global.initReadLine();
    log.info("Connected to Database","MYSQL");
    d.resolve();
    return d.promise;
  })
  .then(initiateServer)
  .catch(function(e){
    log.fatal(e);
    process.exit(1);
  });

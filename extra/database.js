const mysql = require("mysql");
const extend = require("extend");
const Log = require("./log");

const Database = function(config){
  this.config = extend({
    logLevel: Log.LEVEL.VERBOSE,
    autoReconnect: true,
    autoReconnectDelay: 1000,
    autoReconnectMaxAttempt: 10,
    disconnected: function(){},
    dateStrings: true,
    queryFormat: function(query, values){
      if (!values) return query;
      return query.replace(/\:(\w+)/g, function (txt, key) {
        if (values.hasOwnProperty(key)) {
          return this.escape(values[key]);
        }
        return txt;
      }.bind(this));
    }
  },config);
  this.log = new Log.create(this.config.logLevel, "Database");
  this.reconnectAttempts = 0;
  this.connection = null;
};

var handleError = function(error, hideMessage){
  var t = this;
  if (!hideMessage) this.log.error(error.message + " [" + error.code + "]");
  switch(error.code){
  case "ECONNREFUSED":
  case "PROTOCOL_CONNECTION_LOST": {
    if (this.config.autoReconnect){
      if (this.config.autoReconnectMaxAttempt > this.reconnectAttempts){
        this.reconnectAttempts += 1;
        this.connect().then(function(){
          t.log.info("Reconnected");
        }).catch(function(err){
          setTimeout(function(){
            handleError.call(t,err);
          },t.config.autoReconnectDelay);
        });
      }else{
        this.config.disconnected.call(this, error, "Max Reconnect Attempts");
      }
    }else{
      this.config.disconnected.call(this, error, "Auto-Reconnect Disabled");
    }
    break;
  }
  default: {
    this.log.warn("No Handle for [" + error.code + "]");
  }
  }
};

Database.prototype.connect = function(){
  var t = this;
  return new Promise(function(resolve,reject){
    t.connection = mysql.createConnection(t.config);
    t.connection.connect(function(err){
      if (err) return reject(err);
      t.reconnectAttempts = 0;
      t.connection.on("error", function(err){
        handleError.call(t, err);
      });

      resolve();
    });
  });
};

Database.prototype.beginTransaction = function(options, callback){
  if (!callback && typeof options === "function") {
    callback = options;
    options = {};
  }
  var t = this;
  return new Promise(function(resolve, reject){
    t.connection.beginTransaction(options, function(err){
      if (typeof callback === "function") return callback(err);
      if (err) return reject(err);
      resolve();
    });
  });
};

Database.prototype.rollback = function(options, callback){
  if (!callback && typeof options === "function") {
    callback = options;
    options = {};
  }
  var t = this;
  return new Promise(function(resolve, reject){
    t.connection.rollback(options, function(err){
      if (typeof callback === "function") return callback(err);
      if (err) return reject(err);
      resolve();
    });
  });
};

Database.prototype.commit = function(options, callback){
  if (!callback && typeof options === "function") {
    callback = options;
    options = {};
  }
  var t = this;
  return new Promise(function(resolve, reject){
    t.connection.commit(options, function(err){
      if (typeof callback === "function") { callback(err); }
      if (err) return reject(err);
      resolve();
    });
  });
};

Database.prototype.query = function(query, values, callback){
  var t = this;
  return new Promise(function(resolve,reject){
    values = values || {};
    if (typeof values === "function" && !callback){
      callback = values;
      values = {};
    }
    if (!(typeof values === "object")){
      return reject(new Error("Invalid Values object"));
    }
    t.connection.query(query, values, function(err, results){
      if (typeof callback === "function"){callback(err,results);}
      if (err) return reject(err);
      resolve(results);
    });
  });
};

Database.prototype.first = function(query, values, callback){
  var t = this;
  return new Promise(function(resolve,reject){
    values = values || {};
    if (typeof values === "function" && !callback){
      callback = values;
      values = {};
    }
    if (!(typeof values === "object")){
      return reject(new Error("Invalid Values object"));
    }
    t.connection.query(query, values, function(err, results){
      if (typeof results === "object" && Array.isArray(results)){
        if (results.length > 0) {
          results = results[0];
        } else {
          results = null;
        }
      }
      if (typeof callback === "function"){callback(err,results);}
      if (err) return reject(err);
      resolve(results);
    });
  });
};


module.exports = Database;

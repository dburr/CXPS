module.exports = function(callback, ms){
  if (typeof callback === "number" && !ms){
    ms = callback;
    callback = null;
  }
  return new Promise(function(resolve){
    setTimeout(function(){
      if (typeof callback === "function") callback();
      resolve();
    }, ms);
  });
};

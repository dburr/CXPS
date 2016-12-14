module.exports = function(Global){
  var execute = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.SINGLE, function(requestData, response){
    response(200,[]);
  });
  return new Global.registerModule({
    execute: execute,
  });
};

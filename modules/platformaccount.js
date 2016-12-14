module.exports = function(Global){
  var isConnectedLlAccount = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.SINGLE, function(requestData, response){
    response(200,{
      is_connected: false
    });
  });
  return new Global.registerModule({
    isconnectedllaccount: isConnectedLlAccount,
  });
};

module.exports = function(Global){
  var challengeInfo = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.BOTH, function(requestData, response){
    response(200, []);
  });

  return new Global.registerModule({
    challengeinfo: challengeInfo
  });
};

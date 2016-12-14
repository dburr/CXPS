module.exports = function(Global){
  var festivalinfo = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.BOTH, function(requestData, response){
    response(200, []);
  });

  return new Global.registerModule({
    festivalinfo: festivalinfo
  });
};

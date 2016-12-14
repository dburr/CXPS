module.exports = function(Global){
  var specialcutin = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.BOTH, function(requestData, response){
    response(200, {special_cutin_list:[]});
  });

  return new Global.registerModule({
    specialcutin: specialcutin
  });
};

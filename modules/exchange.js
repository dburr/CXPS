module.exports = function(Global){
  var owningpoint = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.BOTH, function(requestData, response){
    response(200, {
      exchange_point_list: []
    });
  });

  return new Global.registerModule({
    owningpoint: owningpoint
  });
};

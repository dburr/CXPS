module.exports = function(Global){
  var status = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.BOTH, function(requestData, response){
    response(200, {
      event_scenario_list: []
    });
  });

  return new Global.registerModule({
    status: status
  });
};

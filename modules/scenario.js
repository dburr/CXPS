module.exports = function(Global){
  var scenariostatus = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.BOTH, function(requestData, response){
    response(200, {
      scenario_status_list: [
        {scenario_id: 1, status: 2},
        {scenario_id: 2, status: 2},
        {scenario_id: 3, status: 2},
        {scenario_id: 184, status: 2},
        {scenario_id: 185, status: 2},
        {scenario_id: 186, status: 2},
        {scenario_id: 187, status: 2},
        {scenario_id: 188, status: 2}
      ]
    });
  });

  return new Global.registerModule({
    scenariostatus: scenariostatus
  });
};

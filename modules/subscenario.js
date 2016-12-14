module.exports = function(Global){
  var subscenariostatus = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.BOTH, function(requestData, response){
    response(200, {
      subscenario_status_list: false
    });
  });

  return new Global.registerModule({
    subscenariostatus: subscenariostatus
  });
};

module.exports = function(Global){
  var toscheck = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.SINGLE, function(requestData, response){
    response(200, {tos_id: 1, is_agreed: true});
  });

  return new Global.registerModule({
    toscheck: toscheck,
    tosagree: toscheck  // ¯\_(ツ)_/¯ Does it matter?
  });
};

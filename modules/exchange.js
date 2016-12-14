module.exports = function(Global){
  var log = new Global.Log.create(Global.Config().log.level, "Module: Exchange");
  var owningpoint = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.BOTH, function(requestData, response){

    Global.database().query("SELECT rarity, exchange_point FROM user_exchange_point WHERE user_id=:user AND exchange_point>0", {user: requestData.user_id}, function(err,data){
      if (err){log.error(err); response(403, []); return; }
      response(200, {
        exchange_point_list: data
      });
    });
  });

  return new Global.registerModule({
    owningpoint: owningpoint
  });
};

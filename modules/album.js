module.exports = function(Global){
  var albumall = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.BOTH, function(requestData, response){
    var log = new Global.Log.create(Global.Config().log.level, "Module: Album");
    Global.database().query("SELECT * FROM user_unit_album WHERE user_id=:user",{user: requestData.user_id}, function(err, data){
      if (err){
        log.error(err);
        response(403, {message: err.message});
        return;
      }
      var albumData = [];

      for (var i=0;i<data.length;i++){
        albumData.push({
          unit_id: data[i].unit_id,
          rank_max_flag: data[i].rank_max_flag==1,
          love_max_flag: data[i].love_max_flag==1,
          rank_level_max_flag: data[i].rank_level_max_flag==1,
          all_max_flag: data[i].all_max_flag==1,
          highest_love_per_unit: data[i].highest_love_per_unit,
          total_love: data[i].total_love,
          favorite_point: data[i].favorite_point
        });
      }

      response(200, albumData);
    });
  });

  return new Global.registerModule({
    albumall: albumall
  });
};

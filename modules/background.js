module.exports = function(Global){
  const log = new Global.Log.create(Global.Config().log.level, "Module: Background");
  var background_list = [1];
  var itemDB = new Global.sqlite3.Database("./data/db/item.db_");

  var default_unlock = [1];

  itemDB.all("SELECT background_id FROM background_m WHERE background_id NOT IN (" + background_list.join(",") + ")", function(e,r){
    if (e){ log.error(e); return; }
    r.forEach(function(a){
      background_list.push(a.background_id);
    });
  });

  var backgroundinfo = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.BOTH, function(requestData, response){
    var responseData = {
      background_info: []
    };

    Global.database().query("SELECT setting_background_id FROM users WHERE user_id=:user;",{user: requestData.user_id}, function(err,currentBackgroundInfo){
      if (err){
        log.error(err);
        response(403, {message: err.message});
        return;
      }

      var current_background_id = 1;

      if (currentBackgroundInfo.length == 1 && background_list.includes(currentBackgroundInfo[0].setting_background_id)){
        current_background_id = currentBackgroundInfo[0].setting_background_id;
      }
      if (Global.Config().modules.background.unlock_all){
        for (let i=0;i<background_list.length;i++){
          responseData.background_info.push({
            background_id: background_list[i],
            is_set: current_background_id == background_list[i],
            insert_date: "2016-01-01 00:00:01"
          });

        }
        log.verbose(responseData, "background/backgroundInfo");
        response(200, responseData);
        return;
      }

      var unlockedBackgroundList = {};
      Global.database().query("SELECT background_id, insert_date FROM user_background_unlock WHERE user_id=:user;",{user: requestData.user_id}, function(err, unlockedBackgroundData){
        if (err){
          log.error(err);
          response(403, {message: err.message});
          return;
        }
        var unlockedCurrentBackground = default_unlock.includes(current_background_id);
        for (let i=0;i<unlockedBackgroundData.length;i++){
          unlockedBackgroundList[unlockedBackgroundData[i].background_id] = Global.common().parseDate(unlockedBackgroundData[i].insert_date);
          if (unlockedBackgroundData[i].background_id === current_background_id){
            unlockedCurrentBackground = true;
          }
        }
        if (!unlockedCurrentBackground){
          current_background_id = 1;
        }

        for (let i=0;i<background_list.length;i++){
          if (unlockedBackgroundList[background_list[i]]){
            responseData.background_info.push({
              background_id: background_list[i],
              is_set: current_background_id == background_list[i],
              insert_date: unlockedBackgroundList[background_list[i]]
            });
            break;
          }

          if (default_unlock.includes(background_list[i])){
            responseData.background_info.push({
              background_id: background_list[i],
              is_set: current_background_id == background_list[i],
              insert_date: "2016-01-01 00:00:01"
            });
          }
        }
        log.verbose(responseData, "background/backgroundInfo");
        response(200, responseData);
      });
    });
  });

  return new Global.registerModule({
    backgroundinfo: backgroundinfo
  });
};

module.exports = function(Global){
  const log = new Global.Log.create(Global.Config().log.level, "Module: Award");
  var award_list = [1,22];
  var itemDB = new Global.sqlite3.Database("./data/db/item.db_");

  var default_unlock = [1,22];

  itemDB.all("SELECT award_id FROM award_m WHERE award_id NOT IN (" + award_list.join(",") + ")", function(e,r){
    if (e){ log.error(e); return; }
    r.forEach(function(a){
      award_list.push(a.award_id);
    });
  });

  var awardinfo = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.BOTH, function(requestData, response){
    var responseData = {
      award_info: []
    };

    Global.database().query("SELECT setting_award_id FROM users WHERE user_id=:user;",{user: requestData.user_id}, function(err,currentAwardInfo){
      if (err){
        log.error(err);
        response(403, {message: err.message});
        return;
      }

      var current_award_id = 1;

      if (currentAwardInfo.length == 1 && award_list.includes(currentAwardInfo[0].setting_award_id)){
        current_award_id = currentAwardInfo[0].setting_award_id;
      }
      if (Global.Config().modules.award.unlock_all){
        for (let i=0;i<award_list.length;i++){
          responseData.award_info.push({
            award_id: award_list[i],
            is_set: current_award_id == award_list[i],
            insert_date: "2016-01-01 00:00:01"
          });

        }
        log.verbose(responseData, "award/awardInfo");
        response(200, responseData);
        return;
      }

      var unlockedAwardList = {};
      Global.database().query("SELECT award_id, insert_date FROM user_award_unlock WHERE user_id=:user;",{user: requestData.user_id}, function(err, unlockedAwardData){
        if (err){
          log.error(err);
          response(403, {message: err.message});
          return;
        }
        var unlockedCurrentAward = default_unlock.includes(current_award_id);
        for (let i=0;i<unlockedAwardData.length;i++){
          unlockedAwardList[unlockedAwardData[i].award_id] = Global.common().parseDate(unlockedAwardData[i].insert_date);
          if (unlockedAwardData[i].award_id === current_award_id){
            unlockedCurrentAward = true;
          }
        }
        if (!unlockedCurrentAward){
          current_award_id = 1;
        }

        for (let i=0;i<award_list.length;i++){
          if (unlockedAwardList[award_list[i]]){
            responseData.award_info.push({
              award_id: award_list[i],
              is_set: current_award_id == award_list[i],
              insert_date: unlockedAwardList[award_list[i]]
            });
            break;
          }

          if (default_unlock.includes(award_list[i])){
            responseData.award_info.push({
              award_id: award_list[i],
              is_set: current_award_id == award_list[i],
              insert_date: "2016-01-01 00:00:01"
            });
          }
        }
        log.verbose(responseData, "award/awardInfo");
        response(200, responseData);
      });
    });
  });

  return new Global.registerModule({
    awardinfo: awardinfo
  });
};

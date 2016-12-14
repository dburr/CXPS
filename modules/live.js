module.exports = function(Global){
  const log = new Global.Log.create(Global.Config().log.level, "Module: Live");
  const liveDB = new Global.sqlite3.Database("./data/db/live.db_", Global.sqlite3.OPEN_READONLY);
  const liveNotesDB = new Global.sqlite3.Database("./data/db/live_notes.db_", Global.sqlite3.OPEN_READONLY);
  const availableSettingIDs = [];

  const normal_live_list = [];
  const special_live_list = [];
  //const marathon_live_list = [];

  var default_normal_live_unlock_list = [
    1, 2, 3, 350,
    1018, 1190, 1191, 1192,
    1193, 1194, 1195, 1196,
    1198, 1199, 1200, 1201,
    1202, 1203, 1204, 1205,
    1206, 1207, 1208, 1209,
    1210, 1211, 1212, 1213,
    1214, 1215, 1216, 1217,
    1218, 1219, 1220, 1221,
    1222, 1223, 1224, 1225
  ];

  liveNotesDB.all("SELECT DISTINCT live_setting_id FROM live_note", function(err, rows){
    if (err){ log.error("Failed to Load Live_Setting_ID Cache"); log.error(err); return; }
    for (var i=0;i<rows.length;i++){
      availableSettingIDs.push(rows[i].live_setting_id);
    }
    log.info("Found note data for " + availableSettingIDs.length + " lives.");

    liveDB.all("SELECT live_difficulty_id, live_setting_id FROM normal_live_m", function(err,rows){
      if (err){ log.error("Failed to load normal_live_list"); log.error(err); return; }
      for (var i=0;i<rows.length;i++){
        if (availableSettingIDs.includes(rows[i].live_setting_id)){
          normal_live_list.push(rows[i].live_difficulty_id);
        }else{ log.verbose("Missing Note Data for Normal Live #" + rows[i].live_difficulty_id + " (Setting: " + rows[i].live_setting_id + ")"); }
      }
      log.info("Found data for " + normal_live_list.length + " normal lives.");

    });

    liveDB.all("SELECT live_difficulty_id, live_setting_id FROM special_live_m", function(err,rows){
      if (err){ log.error("Failed to load special_live_list"); log.error(err); return; }
      for (var i=0;i<rows.length;i++){
        if (availableSettingIDs.includes(rows[i].live_setting_id)){
          special_live_list.push(rows[i].live_difficulty_id);
        }else{ log.verbose("Missing Note Data for Special Live #" + rows[i].live_difficulty_id + " (Setting: " + rows[i].live_setting_id + ")"); }
      }
      log.info("Found data for " + special_live_list.length + " special lives.");
    });

  });

  var livestatus = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.BOTH, function(requestData, response){

    var responseData = {
      normal_live_status_list: [],
      special_live_status_list: [],
      marathon_live_status_list: []
    };

    Global.database().query("SELECT live_goal_reward_id, live_difficulty_id FROM user_live_goal_rewards WHERE user_id= :user;", {user: requestData.user_id}, function(err,liveGoalResult){
      if (err){ log.error(err); response(403, {message: err.message}); return; }
      var live_goals = {};
      for (let i=0;i<liveGoalResult.length;i++){
        if (!live_goals[liveGoalResult[i].live_difficulty_id]){
          live_goals[liveGoalResult[i].live_difficulty_id] = [];
        }
        live_goals[liveGoalResult[i].live_difficulty_id].push(liveGoalResult[i].live_goal_reward_id);
      }

      Global.database().query("SELECT live_difficulty_id, status, hi_score, hi_combo, clear_cnt FROM user_live_status WHERE user_id= :user;", {user: requestData.user_id}, function(err, liveStatusResult){
        if (err){ log.error(err); response(403, {message: err.message}); return; }
        var unlocked_normal_lives = {};
        for (let i=0;i<liveStatusResult.length;i++){
          if ((liveStatusResult[i].status > 0 || Global.Config().modules.live.unlock_all_lives) && normal_live_list.includes(liveStatusResult[i].live_difficulty_id)){
            unlocked_normal_lives[liveStatusResult[i].live_difficulty_id] = {
              status: liveStatusResult[i].status,
              hi_score: liveStatusResult[i].hi_score,
              hi_combo: liveStatusResult[i].hi_combo,
              clear_cnt: liveStatusResult[i].clear_cnt
            };
          }
        }
        for (let i=0;i<default_normal_live_unlock_list.length;i++){
          if (!unlocked_normal_lives[default_normal_live_unlock_list[i]]){
            unlocked_normal_lives[default_normal_live_unlock_list[i]] = {
              status: 1,
              hi_score: 0,
              hi_combo: 0,
              clear_cnt: 0
            };
          }
        }

        for (var ldid in unlocked_normal_lives) {
          if (!unlocked_normal_lives.hasOwnProperty(ldid)) continue;
          var status = unlocked_normal_lives[ldid];
          var achieved_goals = live_goals[ldid] || [];

          responseData.normal_live_status_list.push({
            live_difficulty_id: parseInt(ldid),
            status: parseInt(status.status),
            hi_score: parseInt(status.hi_score),
            hi_combo_count: parseInt(status.hi_combo),
            clear_cnt: parseInt(status.clear_cnt),
            achieved_goal_id_list: achieved_goals
          });

        }
        log.verbose(responseData, "live/livestatus");
        response(200, responseData);
      });
    });
  });

  var schedule = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.BOTH, function(requestData, response){
    var responseData = {
      event_list: [],
      live_list: [],
      limited_bonus_list: [],
      random_live_list: []
    };
    log.verbose(responseData, "live/schedule");

    response(200, responseData);

  });

  return new Global.registerModule({
    livestatus: livestatus,
    schedule: schedule
  });
};

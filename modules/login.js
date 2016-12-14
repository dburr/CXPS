module.exports = function(Global){

  const log = new Global.Log.create(Global.Config().log.level, "Module: Login");
  const randomstring = require.main.require("randomstring");

  const starter_center_units = [null, 49 , 50 , 51 , 52 , 53 , 54 , 55 , 56 , 57, null, 788, 789, 790, 791, 792, 793, 794, 795, 796];



  var authkey = new Global.registerAction(Global.CONSTANT.AUTH.NONE, Global.CONSTANT.REQUEST_TYPE.SINGLE, function(requestData, response){
    var newToken = false;
    while(newToken === false){
      newToken = Global.createAuthToken(randomstring.generate(75 + Math.floor(Math.random()*10)), null, Date.now() + 10000);
    }
    requestData.authorize_token = newToken;
    response(200, {authorize_token: newToken});
  });

  var startup = new Global.registerAction(Global.CONSTANT.AUTH.PRE_LOGIN, Global.CONSTANT.REQUEST_TYPE.SINGLE, function(requestData, response){
    log.verbose(requestData);
    if (typeof requestData.formData.login_key === "string" &&
        typeof requestData.formData.login_passwd === "string" &&
        requestData.formData.login_key.length === 36 &&
        requestData.formData.login_passwd.length === 128 &&
        requestData.formData.login_key.match(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/gi) &&
        requestData.formData.login_passwd.match(/^[0-9A-Z]{128}/gi)
      ){
      try {
        Global.database().beginTransaction(function(err){
          if (err){ response(403, {}); log.error(err); return; }
          log.verbose("Started Transaction");
          Global.database().query("INSERT INTO users (user_id) VALUES (null);", function(err, result){
            if (err){
              return Global.database().rollback(function(){
                response(403, {});
              });
            }
            Global.database().query("INSERT INTO user_login VALUES (:id, :key, :pass, null);",{
              id: result.insertId,
              key: requestData.formData.login_key,
              pass: requestData.formData.login_passwd
            }, function(err){
              if (err){
                return Global.database().rollback(function(){
                  response(403, {}); log.error(err);
                });
              }
              Global.database().commit(function(err){
                if (err){
                  return Global.database().rollback(function(){
                    response(403,{}); log.error(err);
                  });
                }
                log.verbose("Created new User: #" + result.insertId);
                response(200, {
                  login_key: requestData.formData.login_key,
                  login_passwd: requestData.formData.login_passwd,
                  user_id: result.insertId
                });
              });
            });
          });
        });
      } catch (e){
        log.error(e);
        response(403,{});
      }
    }else{
      response(403, {});
    }
  });

  var startwithoutinvite = new Global.registerAction(Global.CONSTANT.AUTH.PRE_LOGIN, Global.CONSTANT.REQUEST_TYPE.SINGLE, function(requestData, response){
    //This might have a use? no idea.
    response(200, []);
  });

  var login = new Global.registerAction(Global.CONSTANT.AUTH.PRE_LOGIN, Global.CONSTANT.REQUEST_TYPE.SINGLE, function(requestData, response){
    //Request: {"country_code": "AU","login_key": "86bef4dd-d127-4f4f-8cc6-a893e7a662f8","login_passwd": "c4fbdf04decd770efecc746dcbfefa81f89058e4d6803a18619994d8bb3313da86036c2c181512c5ffe0841e91dcfe8b3a8b0ae9e131dfeacce4d128aed762a6"}
    //Response: {"response_data":{"authorize_token":"0sIyazDZejHj7FPhLSocb1WXpsQ5KqCuvGAQxji2bm7kqRdjSgWMxS2K9TNXNApScuVkpRWqRr5Ro08tTnB3Qd","user_id":30860791,"review_version":"","server_timestamp":1481507323},"release_info":[],"status_code":200}

    if (typeof requestData.formData.login_key === "string" &&
        typeof requestData.formData.login_passwd === "string" &&
        requestData.formData.login_key.length === 36 &&
        requestData.formData.login_passwd.length === 128 &&
        requestData.formData.login_key.match(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/gi) &&
        requestData.formData.login_passwd.match(/^[0-9A-Z]{128}/gi)
      ){
      console.log("a");
      Global.database().beginTransaction(function(err){
        if (err){ response(403, {}); log.error(err); return; }
        Global.database().query("SELECT user_id FROM user_login WHERE login_key = :key AND login_passwd = :pass;",{
          key: requestData.formData.login_key,
          pass: requestData.formData.login_passwd
        },function(err,result){
          if (err){
            return Global.database().rollback(function(){
              response(403,{}); log.error(err);
            });
          }
          console.log("b");
          if (result.length >= 1){
            var token = randomstring.generate(80 + Math.floor(Math.random()*10));
            Global.database().query("UPDATE user_login SET login_token= :token WHERE user_id = :user;", {token: token, user: result[0].user_id}, function(err){
              if (err){
                return Global.database().rollback(function(){
                  response(403,{}); log.error(err);
                });
              }
              console.log("c");
              Global.database().commit(function(err){
                if (err){
                  return Global.database().rollback(function(){
                    response(403,{}); log.error(err);
                  });
                }
                console.log("d");
                try {
                  response(200, {authorize_token: token, user_id: result[0].user_id, review_version: "", server_timestamp: Math.floor(Date.now()/1000)});
                } catch (e){ log.error(e); }
              });
            });
          }else{
            // Invalid Key/pass
            response(600, { error_code: 407 });
          }
        });
      });
    }else{
      response(403, []);
    }
  });

  var topinfo = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.SINGLE, function(requestData, response){
    Global.database().query("SELECT next_free_muse_gacha, next_free_aqours_gacha FROM users WHERE user_id = :user", {user: requestData.user_id}, function(err,nextFreeGacha){
      if (err){
        log.error(err);
        response(403, []);
        return;
      }
      var responseData = {
        friend_action_cnt: 0,
        friend_greet_cnt: 0,
        friend_variety_cnt: 0,
        present_cnt: 0,
        free_muse_gacha_flag: (Date.now()/1000) >= nextFreeGacha.next_free_muse_gacha,
        free_aqours_gacha_flag: (Date.now()/1000) >= nextFreeGacha.next_free_aqours_gacha,
        server_datetime: Global.common().parseDate(Date.now()),
        server_timestamp: Math.floor(Date.now()/1000),
        next_free_muse_gacha_timestamp: nextFreeGacha.next_free_muse_gacha,
        next_free_aqours_gacha_timestamp: nextFreeGacha.next_free_aqours_gacha,
        notice_friend_datetime: "2000-01-01 12:00:00",
        notice_mail_datetime: "2000-01-01 12:00:00",
        friends_approval_wait_cnt: 0
      };
      log.verbose(responseData, "login/topinfo");
      response(200, responseData);
    });

  });

  var topinfoonce = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.SINGLE, function(requestData, response){
    var responseData = {
      new_achievement_cnt: 0,
      unaccomplished_acchievement_cnt: 0,
      handover_expire_status: 0,
      live_daily_reward_exist: false
    };
    log.verbose(responseData, "login/topInfoOnce");
    response(200, responseData);
  });

  var unitlist = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.SINGLE, function(requestData, response){

    //{"response_data":{"member_category_list":[{"member_category":1,"unit_initial_set":[{"unit_initial_set_id":1,"unit_list":[13,9,8,23,starter_center_units[0],24,21,20,19],"center_unit_id":starter_center_units[0]},{"unit_initial_set_id":2,"unit_list":[13,9,8,23,50,24,21,20,19],"center_unit_id":50},{"unit_initial_set_id":3,"unit_list":[13,9,8,23,51,24,21,20,19],"center_unit_id":51},{"unit_initial_set_id":4,"unit_list":[13,9,8,23,52,24,21,20,19],"center_unit_id":52},{"unit_initial_set_id":5,"unit_list":[13,9,8,23,53,24,21,20,19],"center_unit_id":53},{"unit_initial_set_id":6,"unit_list":[13,9,8,23,54,24,21,20,19],"center_unit_id":54},{"unit_initial_set_id":7,"unit_list":[13,9,8,23,55,24,21,20,19],"center_unit_id":55},{"unit_initial_set_id":8,"unit_list":[13,9,8,23,56,24,21,20,19],"center_unit_id":56},{"unit_initial_set_id":9,"unit_list":[13,9,8,23,57,24,21,20,19],"center_unit_id":57}]},{"member_category":2,"unit_initial_set":[{"unit_initial_set_id":11,"unit_list":[13,9,8,23,788,24,21,20,19],"center_unit_id":788},{"unit_initial_set_id":12,"unit_list":[13,9,8,23,789,24,21,20,19],"center_unit_id":789},{"unit_initial_set_id":13,"unit_list":[13,9,8,23,790,24,21,20,19],"center_unit_id":790},{"unit_initial_set_id":14,"unit_list":[13,9,8,23,791,24,21,20,19],"center_unit_id":791},{"unit_initial_set_id":15,"unit_list":[13,9,8,23,792,24,21,20,19],"center_unit_id":792},{"unit_initial_set_id":16,"unit_list":[13,9,8,23,793,24,21,20,19],"center_unit_id":793},{"unit_initial_set_id":17,"unit_list":[13,9,8,23,794,24,21,20,19],"center_unit_id":794},{"unit_initial_set_id":18,"unit_list":[13,9,8,23,795,24,21,20,19],"center_unit_id":795},{"unit_initial_set_id":19,"unit_list":[13,9,8,23,796,24,21,20,19],"center_unit_id":796}]}]},"release_info":[],"status_code":200}

    var responseData = {
      member_category_list: [
        {
          member_category: 1,
          unit_initial_set: [
            {unit_initial_set_id:1,unit_list:[13,9,8,23,starter_center_units[1],24,21,20,19],center_unit_id:starter_center_units[1]},
            {unit_initial_set_id:2,unit_list:[13,9,8,23,starter_center_units[2],24,21,20,19],center_unit_id:starter_center_units[2]},
            {unit_initial_set_id:3,unit_list:[13,9,8,23,starter_center_units[3],24,21,20,19],center_unit_id:starter_center_units[3]},
            {unit_initial_set_id:4,unit_list:[13,9,8,23,starter_center_units[4],24,21,20,19],center_unit_id:starter_center_units[4]},
            {unit_initial_set_id:5,unit_list:[13,9,8,23,starter_center_units[5],24,21,20,19],center_unit_id:starter_center_units[5]},
            {unit_initial_set_id:6,unit_list:[13,9,8,23,starter_center_units[6],24,21,20,19],center_unit_id:starter_center_units[6]},
            {unit_initial_set_id:7,unit_list:[13,9,8,23,starter_center_units[7],24,21,20,19],center_unit_id:starter_center_units[7]},
            {unit_initial_set_id:8,unit_list:[13,9,8,23,starter_center_units[8],24,21,20,19],center_unit_id:starter_center_units[8]},
            {unit_initial_set_id:9,unit_list:[13,9,8,23,starter_center_units[9],24,21,20,19],center_unit_id:starter_center_units[9]}
          ]
        },
        {
          member_category: 1,
          unit_initial_set: [
            {unit_initial_set_id:11,unit_list:[13,9,8,23,starter_center_units[11],24,21,20,19],center_unit_id:starter_center_units[11]},
            {unit_initial_set_id:12,unit_list:[13,9,8,23,starter_center_units[12],24,21,20,19],center_unit_id:starter_center_units[12]},
            {unit_initial_set_id:13,unit_list:[13,9,8,23,starter_center_units[13],24,21,20,19],center_unit_id:starter_center_units[13]},
            {unit_initial_set_id:14,unit_list:[13,9,8,23,starter_center_units[14],24,21,20,19],center_unit_id:starter_center_units[14]},
            {unit_initial_set_id:15,unit_list:[13,9,8,23,starter_center_units[15],24,21,20,19],center_unit_id:starter_center_units[15]},
            {unit_initial_set_id:16,unit_list:[13,9,8,23,starter_center_units[16],24,21,20,19],center_unit_id:starter_center_units[16]},
            {unit_initial_set_id:17,unit_list:[13,9,8,23,starter_center_units[17],24,21,20,19],center_unit_id:starter_center_units[17]},
            {unit_initial_set_id:18,unit_list:[13,9,8,23,starter_center_units[18],24,21,20,19],center_unit_id:starter_center_units[18]},
            {unit_initial_set_id:19,unit_list:[13,9,8,23,starter_center_units[19],24,21,20,19],center_unit_id:starter_center_units[19]}
          ]
        }
      ]
    };

    response(200, responseData);
  });

  var unitselect = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.SINGLE, function(requestData, response){

    Global.database().beginTransaction(function(err){
      if (err){ response(403, {}); log.error(err); return;}

      Global.database().query("SELECT tutorial_state FROM users WHERE user_id=:user", {user: requestData.user_id}, function(err, data){
        if (err){
          Global.database().rollback(function(){
            log.error(err);
            response(403, {message: err.message});
          });
          return;
        }
        if (data.length != 1){
          Global.database().rollback(function(){
            response(403, {});
          });
          return;
        }
        var tutorial_state = data[0].tutorial_state;
        if (tutorial_state != 1){
          Global.database().rollback(function(){
            response(403, {});
          });
          return;
        }
        var u = starter_center_units[requestData.formData.unit_initial_set_id];
        if (!u){
          Global.database().rollback(function(){
            response(403,{});
          });
          return;
        }
        var unit_ids = [13,9,8,23,u,24,21,20,19];

        Global.common().userAddMultiUnit(requestData.user_id, unit_ids, {}).then(function(uouids){

          unit_ids = [13,9,8,23,u,24,21,20,19];
          Global.database().query("UPDATE users SET tutorial_state=-1,partner_unit=:partner WHERE user_id=:user", {partner: uouids[4], user: requestData.user_id}, function(err){
            if (err){
              Global.database().rollback(function(){
                response(403, {message: err.message});
              });
              return;
            }
            Global.database().query("INSERT INTO user_unit_deck VALUES (:user, 1, 'Team A');", {user: requestData.user_id}, function(err){
              if (err){
                Global.database().rollback(function(){
                  response(403, {message: err.message});
                });
                return;
              }
              Global.database().query("INSERT INTO user_unit_deck_slot VALUES (:user, 1, 1, :s1),(:user, 1, 2, :s2),(:user, 1, 3, :s3),(:user, 1, 4, :s4),(:user, 1, 5, :s5),(:user, 1, 6, :s6),(:user, 1, 7, :s7),(:user, 1, 8, :s8),(:user, 1, 9, :s9);",{
                user: requestData.user_id,
                s1: uouids[0],
                s2: uouids[1],
                s3: uouids[2],
                s4: uouids[3],
                s5: uouids[4],
                s6: uouids[5],
                s7: uouids[6],
                s8: uouids[7],
                s9: uouids[8],
              }, function(err){
                if (err){
                  Global.database().rollback(function(){
                    response(403, {message: err.message});
                  });
                  return;
                }
                Global.database().commit(function(err){
                  if (err){
                    Global.database().rollback(function(){
                      response(403, {message: err.message});
                    });
                    return;
                  }
                  var responseData = {
                    unit_id: unit_ids
                  };
                  response(200, responseData);
                });
              });


            });


          });
        }).catch(function(e){
          Global.database().rollback(function(){
            response(403, {message: e.message});
          });
          log.error(e);
        });
      });


    });

  });

  return new Global.registerModule({
    authkey: authkey,
    startup: startup,
    startwithoutinvite,
    login: login,
    topinfo: topinfo,
    topinfoonce: topinfoonce,
    unitlist: unitlist,
    unitselect: unitselect
  });

};

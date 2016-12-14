module.exports = function(Global){
  const log = new Global.Log.create(Global.Config().log.level, "Module: PersonalNotice");
  var get = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.SINGLE, function(requestData, response){
    Global.database().query("SELECT * FROM server_settings WHERE setting_name IN ('motd_title', 'motd_message')",{}, function(err,result){
      if (err){
        log.error(err);
        response(503, {});
        return;
      }

      var motd_title = "";
      var motd_message = "";

      for (var i=0;i<result.length;i++){
        if (result[i].setting_name == "motd_title"){
          motd_title = result[i].value;
        }
        if (result[i].setting_name == "motd_message"){
          motd_message = result[i].value;
        }
      }

      var responseData = {
        has_notice: (motd_title.length>=1 && motd_message.length>=1),
        notice_id: 1,
        type: 1,
        title: motd_title,
        contents: motd_message
      };

      response(200, responseData);

    });
  });
  var agree = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.SINGLE, function(requestData, response){
    response(200,{});
  });
  return new Global.registerModule({
    get: get,
    agree: agree
  });
};

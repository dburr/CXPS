module.exports = function(Global){
  const db = Global.database();
  const log = new Global.Log.create(Global.Config().log.level, "Module: PersonalNotice");
  var progress = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.SINGLE, function(requestData, response){
    if (typeof requestData.formData.tutorial_state === "number"){
      var newStep = requestData.formData.tutorial_state;
      db.query("SELECT tutorial_state FROM users WHERE user_id= :user",{user: requestData.user_id}, function(err, current){
        if (err){
          log.error(err);
          response(403, {});
          return;
        }
        if (!current[0]){response(403, {}); return;}
        var currentStep = current[0].tutorial_state;
        console.log(currentStep + "->" + newStep);
        if (currentStep === 0 && newStep === 1){
          log.info("Step! ZERO to ONE");
          db.query("UPDATE users SET tutorial_state=1 WHERE user_id= :user", {user: requestData.user_id}, function(err){
            if (err){
              log.error(err);
              response(403, {});
              return;
            }
            response(200, {});
          });
        }else{
          response(403, {message: "Invalid Step"});
        }
      });
    }else{
      response(403, {});
    }
  });
  
  return new Global.registerModule({
    progress: progress
  });
};

module.exports = function(Global){
  const log = new Global.Log.create(Global.Config().log.level, "Module: User");
  var userinfo = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.SINGLE, function(requestData, response){
    Global.database().query("SELECT * FROM users WHERE user_id = :user", {user: requestData.user_id}, function(err, result){
      if (err){
        log.error(err);
        response(503, {message: err.message});
        return;
      }
      if (result[0]){
        result = result[0];
        result.energy_full_time = Global.common().parseDate(result.energy_full_time);
        result.insert_date = Global.common().parseDate(result.insert_date);
        result.update_date = Global.common().parseDate(result.update_date);
        response(200, {user: result});
        return;
      }
      response(403, []);
      return;
    });
  });

  var changename = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.SINGLE, function(requestData, response){
    if (requestData.formData.name && requestData.formData.name.match(/^.{1,10}$/)){
      console.log("Name Valid");

      Global.database().query("UPDATE users SET name= :name WHERE user_id= :user;", {
        name: requestData.formData.name,
        user: requestData.user_id
      }, function(err){
        if (err){
          console.log("Name Invalid");
          response(600, {error_code: 1100});
          return;
        }
        response(200, {before_name: "", after_name: requestData.formData.name});
      });


    }else{
      console.log("Name Invalid");
      response(600, {error_code: 1101});
    }

  });

  var showallitem = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.BOTH, function(requestData, response){
    response(200, {items: []});
  });

  var getnavi = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.BOTH, function(requestData, response){
    Global.database().query("SELECT partner_unit FROM users WHERE user_id=:user",{user: requestData.user_id}, function(err,data){
      if (err){
        log.error(err);
        response(403, {message: err.message});
        return;
      }
      response(200, {
        user: {
          user_id: requestData.user_id,
          unit_owning_user_id: data[0].partner_unit || 0
        }
      });
    });

  });

  return new Global.registerModule({
    userinfo: userinfo,
    changename: changename,
    showallitem: showallitem,
    getnavi: getnavi
  });





};

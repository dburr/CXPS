const extend = require("extend");
const Q = require("q");

const default_unit_data = {
  level: 1,
  rank: 1,
  love: 0,
  unit_number : false
};

module.exports = function(Global){
  const log = new Global.Log.create(Global.Config().log.level, "Common");

  const unitDB = new Global.sqlite3.Database("./data/db/unit.db_", Global.sqlite3.OPEN_READONLY);

  var userAddUnit = function(user_id, unit_id, data){
    var defer = Q.defer();
    var unitData = extend({}, default_unit_data, data);

    if (!(typeof user_id === "number" &&
          typeof unit_id === "number" &&
          user_id >= 1 && unit_id >= 1 &&
          typeof unitData.level   === "number" &&
          typeof unitData.rank    === "number" &&
          typeof unitData.love    === "number" &&
          unitData.level >= 1 && unitData.rank >= 1 &&
          unitData.love >= 0)){
      defer.reject(new Error("An invalid value was provided"));
      return defer.promise;
    }

    var insertData = {
      user_id: user_id,
      unit_id: null,
      exp: 0,
      next_exp: null,
      level: null,
      max_level: null,
      rank: null,
      max_rank: null,
      love: null,
      max_love: null,
      unit_skill_level: null,
      max_hp: null,
      removable_skill_capacity: null,
      display_rank: null,
      stat_smile: null,
      stat_pure: null,
      stat_cool: null,
      attribute: null
    };

    unitDB.get("SELECT * FROM unit_m WHERE " + (unitData.unit_number?"unit_number":"unit_id") + " = ?", [unit_id], function(err,unit_m){
      if (err){ defer.reject(err); return; }
      if (!unit_m){ defer.reject((unitData.unit_number?"unit_number":"unit_id") + " '" + unit_id + "' does not exist."); return; }
      insertData.unit_id = unit_m.unit_id;
      insertData.attribute = unit_m.attribute_id;
      insertData.max_rank = (unit_m.disable_rank_up>=1?1:2);
      insertData.rank = Math.min(insertData.max_rank, unitData.rank);
      insertData.display_rank = insertData.rank;
      insertData.max_love = (insertData.rank==2?unit_m.after_love_max:unit_m.before_love_max);
      insertData.max_level = (insertData.rank==2?unit_m.after_level_max:unit_m.before_level_max);
      insertData.level = Math.min(insertData.max_level, unitData.level);
      insertData.love = Math.min(insertData.max_love, unitData.love);
      insertData.unit_skill_level = (unit_m.default_unit_skill_id==null?0:1);
      insertData.removable_skill_capacity = Math.min(unit_m.max_removable_skill_capacity,insertData.rank==insertData.max_rank?(unit_m.default_removable_skill_capacity+1):unit_m.default_removable_skill_capacity);
      insertData.max_removable_skill_capacity = unit_m.max_removable_skill_capacity;
      unitDB.all("SELECT * FROM unit_level_up_pattern_m WHERE unit_level_up_pattern_id = ? AND (unit_level IN (?,?))",
        [unit_m.unit_level_up_pattern_id, insertData.level, insertData.level-1], function(err, ulup_m){
          if (err){ defer.reject(err); return; }
          for (let i=0;i<ulup_m.length;i++){
            if (ulup_m[i].unit_level == insertData.level){
              insertData.next_exp = ulup_m[i].next_exp;
              insertData.stat_smile = unit_m.smile_max - ulup_m[i].smile_diff;
              insertData.stat_pure = unit_m.pure_max - ulup_m[i].pure_diff;
              insertData.stat_cool = unit_m.cool_max - ulup_m[i].cool_diff;
              insertData.max_hp = unit_m.hp_max - ulup_m[i].hp_diff;
            }else if (ulup_m[i].unit_level == (insertData.level-1)){
              insertData.exp = ulup_m[i].next_exp;
            }
          }

          Global.database().beginTransaction(function(err){
            if (err){ defer.reject(err); log.error(err); return; }
            var Query = "INSERT INTO units \
(user_id, unit_id, `exp`, next_exp, `level`, max_level, `rank`, max_rank, love, max_love, unit_skill_level, max_hp, removable_skill_capacity, max_removable_skill_capacity, display_rank, stat_smile, stat_pure, stat_cool, attribute ) \
VALUES (:user_id, :unit_id, :exp, :next_exp, :level, :max_level,:rank, :max_rank, :love, :max_love, :unit_skill_level, :max_hp, :removable_skill_capacity, :max_removable_skill_capacity, :display_rank, :stat_smile, :stat_pure, :stat_cool, :attribute)";

            Global.database().query(Query, insertData, function(err, insertResult){
              if (err){
                Global.database().rollback(function(){
                  if (err.code == "ER_NO_REFERENCED_ROW_2"){
                    defer.reject("user_id '" + insertData.user_id + "' does not exist.");
                    return;
                  }
                  defer.reject(err);
                });
                return;
              }
              var isMaxRank = (insertData.rank==insertData.max_rank);

              userUpdateAlbum(
                insertData.user_id, insertData.unit_id,
                isMaxRank, (insertData.love==insertData.max_love && isMaxRank),
                (insertData.level==insertData.max_level && isMaxRank), insertData.love,
                insertData.love, 0).then(function(){
                  Global.database().commit(function(err){
                    if (err){
                      Global.database().rollback(function(){
                        defer.reject(err);
                      });
                      return;
                    }
                    defer.resolve(insertResult.insertId);
                  });
                }).catch(function(err){
                  Global.database().rollback(function(){
                    defer.reject(err);
                  });
                });


            });
          });



        });
    });





    return defer.promise;
  };
  const userUpdateAlbum = function(user_id, unit_id, rank_max, love_max, level_max, love, addLove, addFavPt){
    var defer = Q.defer();

    Global.database().query("SELECT * FROM user_unit_album WHERE user_id=:user AND unit_id=:unit LIMIT 1;",{user: user_id, unit: unit_id}, function(err, rows){
      if (err){ defer.reject(err); return; }
      var values = {};
      if (rows.length == 0){
        values = {
          user: user_id,
          unit: unit_id,
          rank: rank_max?1:0,
          love: love_max?1:0,
          level: level_max?1:0,
          all: (rank_max && level_max && love_max)?1:0,
          lovemax: love,
          lovetotal: addLove,
          fav: addFavPt
        };

        Global.database().query("INSERT INTO user_unit_album VALUES (:user, :unit, :rank, :love, :level, :all, :lovemax, :lovetotal, :fav);", values, function(err){
          if (err){
            defer.reject(err);
            return;
          }
          defer.resolve();
        });
      }else{
        var existing = rows[0];
        values = {
          user: user_id,
          unit: unit_id,
          rank: (rank_max||existing.rank_max_flag)?1:0,
          love: (love_max||existing.love_max_flag)?1:0,
          level: (level_max||existing.rank_level_max_flag)?1:0,
          all: ((rank_max && level_max && love_max)||existing.all_max_flag)?1:0,
          lovemax: Math.max(love,existing.highest_love_per_unit),
          lovetotal: existing.total_love + addLove,
          fav: existing.favorite_point + addFavPt
        };

        Global.database().query("UPDATE user_unit_album SET rank_max_flag=:rank, love_max_flag=:love, rank_level_max_flag=:level,all_max_flag=:all,highest_love_per_unit=:lovemax,total_love=:lovetotal,favorite_point=:fav WHERE user_id=:user AND unit_id=:unit;", values, function(err){
          if (err){
            defer.reject(err);
            return;
          }
          defer.resolve();
        });


      }

    });

    return defer.promise;
  };
  const userAddMultiUnit = function(user_id, unit_id_array, data){
    var resultArray = [];
    var defer = Q.defer();
    var next = function(cb){

      var n = unit_id_array.shift();
      if (!n){cb();return;}
      userAddUnit(user_id, n, data).then(function(uouid){
        resultArray.push(uouid);
        next(cb);
      }).catch(function(e){
        defer.reject(e);
      });
    };
    next(function(){
      defer.resolve(resultArray);
    });

    return defer.promise;
  };

  const parseDate = function(value, second){
    if (typeof value === "number" || value instanceof Date){
      if (second) value = Math.floor(value*1000);
      var d;
      if (typeof value === "number") d = new Date(value);
      if (value instanceof Date) d = value;
      var YYYY = ("000" + d.getFullYear()).substr(-4);
      var MM = ("0" + d.getMonth()).substr(-2);
      var DD = ("0" + d.getDate()).substr(-2);
      var HH = ("0" + d.getHours()).substr(-2);
      var mm = ("0" + d.getMinutes()).substr(-2);
      var SS = ("0" + d.getSeconds()).substr(-2);
      return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${SS}`;
    }else{
      return value;
    }
  };

  const parseUnitData = function(unitData){
    var data = {
      unit_owning_user_id: unitData.unit_owning_user_id,
      unit_id: unitData.unit_id,
      exp: unitData.exp,
      next_exp: unitData.next_exp,
      level: unitData.level,
      max_level: unitData.max_level,
      rank: unitData.rank,
      max_rank: unitData.max_rank,
      love: unitData.love,
      max_love: unitData.max_love,
      unit_skill_level: unitData.unit_skill_level,
      unit_skill_exp: unitData.unit_skill_exp,
      max_hp: unitData.max_hp,
      unit_removable_skill_capacity: unitData.removable_skill_capacity,
      favorite_flag: (unitData.favorite_flag==1),
      display_rank: unitData.display_rank,
      is_rank_max: unitData.rank>=unitData.max_rank,
      is_love_max: unitData.love>=unitData.max_love,
      is_level_max: unitData.level>=unitData.max_level,
      is_removable_skill_capacity_max: unitData.removable_skill_capacity>=unitData.max_removable_skill_capacity,
      insert_date: parseDate(unitData.insert_date)
    };
    return data;
  };

  const COMMANDS = {
    u: function(){
      COMMANDS.useraddunit.apply(null,arguments);
    },
    useraddunit: function(){
      try {
        if (arguments.length < 2) throw new Error("Not Enough Arguments");
        var args = [];
        var useNumber = false;
        if (arguments[1].startsWith("n")){
          useNumber = true;
          arguments[1] = arguments[1].substr(1);
        }

        for (var i=0;i<arguments.length;i++){
          if (isNaN(arguments[i])) throw new Error("'" + arguments[i] + "' is not a number");
          args.push(parseInt(arguments[i]));
        }
        userAddUnit(args[0], args[1], {
          level: args[2] || default_unit_data.level,
          rank: args[3] || default_unit_data.rank,
          love: args[4] || default_unit_data.love,
          unit_number: useNumber
        }).then(function(d){
          log.info(d, "useraddunit");
        }).catch(function(e){
          log.error(e, "useraddunit");
        });
      } catch (e){
        log.warn(e.message);
        log.always("useraddunit {user_id:int} {[n]unit_id:int} [level:int] [rank:int] [love:int]", "Command Usage");
        log.always("                            ^ (prefix id with 'n' to use unit_number)","Command Usage");
      }

    }
  };




  log.verbose("Initiating Common Module");
  return {
    COMMANDS: COMMANDS,
    userAddUnit: userAddUnit,
    userAddMultiUnit: userAddMultiUnit,
    userUpdateAlbum: userUpdateAlbum,
    parseDate: parseDate,
    parseUnitData: parseUnitData
  };



};

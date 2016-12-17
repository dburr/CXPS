module.exports = function(Global){
  var log = new Global.Log.create(Global.Config().log.level, "Module: Unit");
  var unitDB = new Global.sqlite3.Database("./data/db/unit.db_",Global.sqlite3.OPEN_READONLY);
  var exchangeDB = new Global.sqlite3.Database("./data/db/exchange.db_",Global.sqlite3.OPEN_READONLY);
  var noExchangePointList = [];
  var supportUnitList = {};

  exchangeDB.all("SELECT * FROM exchange_nopoint_unit_m", function(err,rows){
    if (err){ log.error(err); return; }
    rows.forEach(function(r){
      noExchangePointList.push(r.unit_id);
    });
    log.verbose("Loaded NoExchangePoint List: " + noExchangePointList.length + " units.");
  });

  unitDB.all("SELECT name,unit_id,attribute_id,rarity,disable_rank_up,merge_exp,sale_price,merge_cost FROM unit_m as u JOIN unit_level_up_pattern_m as l ON u.unit_level_up_pattern_id=l.unit_level_up_pattern_id WHERE disable_rank_up != 0",function(err, rows){
    if (err){log.error(err); return;}
    rows.forEach(function(r){
      var skill_exp = r.disable_rank_up==3?Math.pow(10,(r.rarity-1)):0;
      supportUnitList[r.unit_id] = {
        name: r.name,
        attribute: r.attribute_id,
        rarity: r.rarity,
        merge_cost: r.merge_cost,
        sale_price: r.sale_price,
        exp:  r.merge_exp,
        skill_exp: skill_exp
      };
    });
  });

  var unitall = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.BOTH, function(requestData, response){
    Global.database().query("SELECT * FROM units WHERE user_id=:user AND deleted=0;",{user: requestData.user_id}, function(err, data){
      if (err){
        log.error(err);
        response(403, []);
        return;
      }
      var responseData = [];
      for(var i=0;i<data.length;i++){
        var u = data[i];
        responseData.push(Global.common().parseUnitData(u));
      }
      response(200, responseData);
    });
  });

  var deckinfo = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.BOTH, function(requestData, response){
    var error = function(err){
      log.error(err);
      response(403, []);
    };
    Global.database().query("SELECT main_deck FROM users WHERE user_id=:user",{user: requestData.user_id}, function(err,userData){
      if (err){return error(err);}
      var mainDeck = userData[0].main_deck;
      Global.database().query("SELECT deck.user_id, deck.deck_name, deck.unit_deck_id, slot.slot_id, slot.unit_owning_user_id FROM user_unit_deck as deck INNER JOIN user_unit_deck_slot as slot ON (deck.unit_deck_id = slot.deck_id AND deck.user_id = slot.user_id) WHERE deck.user_id=:user AND unit_deck_id IN (1,2,3,4,5,7,8,9);",{user: requestData.user_id}, function(err, data){
        if (err){ return error(err); }
        var decks = {};
        var deckIDs = [];
        for (let i=0;i<data.length;i++){
          var s = data[i];
          if (!decks[s.unit_deck_id]){
            deckIDs.push(s.unit_deck_id);
            decks[s.unit_deck_id] = {
              unit_deck_id: s.unit_deck_id,
              deck_name: s.deck_name,
              main_flag: s.unit_deck_id == mainDeck,
              unit_owning_user_ids: []
            };
          }
          decks[s.unit_deck_id].unit_owning_user_ids.push({
            position: s.slot_id,
            unit_owning_user_id: s.unit_owning_user_id
          });
        }
        var responseData = [];
        for (let i=0;i<deckIDs.length;i++){
          responseData.push(decks[deckIDs[i]]);
        }
        log.verbose(responseData,"unit/deckinfo");
        response(200, responseData);
      });
    });
  });

  var favorite = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.BOTH, function(requestData, response){
    if (!(typeof requestData.formData.unit_owning_user_id === "number")) { response(403,[]); return; }
    Global.database().query("SELECT unit_owning_user_id FROM units WHERE deleted=0 AND user_id=:user AND unit_owning_user_id=:unit",{user: requestData.user_id, unit: requestData.formData.unit_owning_user_id}, function(err, ownershipCheck){
      if (err){
        log.error(err);
        response(403, {message: err.message});
        return;
      }
      if (ownershipCheck.length != 1){
        response(403, {});
        return;
      }
      Global.database().query("UPDATE units SET favorite_flag=:fav WHERE unit_owning_user_id=:unit", {unit: requestData.formData.unit_owning_user_id, fav: (requestData.formData.favorite_flag===1?1:0)}, function(err){
        if (err){
          log.error(err);
          response(403, {message: err.message});
          return;
        }
        response(200, []);
      });
    });
  });

  var supporterall = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.BOTH, function(requestData, response){


    Global.database().query("SELECT unit_id,amount FROM user_support_unit WHERE user_id=:user",{user: requestData.user_id}, function(err,rows){
      if (err){ log.error(err); response(403,{message: err.message}); return; }
      response(200,{
        unit_support_list: rows
      });
    });
  });
  var removableskillinfo = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.BOTH, function(requestData, response){
    Global.common().getRemovableSkillInfo(requestData.user_id).then(function(skillInfo){
      response(200, skillInfo);
    }).catch(function(e){
      log.error(e);
      response(403, {message: e.message});
    });

  });

  var sale = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.BOTH, function(requestData, response){
    if (!(typeof requestData.formData.unit_owning_user_id === "object" && Array.isArray(requestData.formData.unit_owning_user_id))){
      response(403, {});
      return;
    }
    var sale_list = requestData.formData.unit_owning_user_id;
    Global.database().query("SELECT * FROM v_units_not_locked WHERE user_id=:user AND unit_owning_user_id IN (:uouids);", {user: requestData.user_id, uouids: sale_list}, function(err,unitData){
      if (err){
        log.error(err);
        response(600, {message: err.message});
        return;
      }

      if (unitData.length != sale_list.length){
        response(403, {});
        return;
      }

      var total_sale_price = 0;
      var sale_detail = [];
      var total_sale_seals = {
        "2": 0,
        "3": 0,
        "4": 0,
        "5": 0
      };

      var next = function(cb){
        var n = unitData.shift();
        if (!n){ cb(); return; }

        unitDB.get("SELECT U.rarity, L.sale_price FROM unit_m as U JOIN unit_level_up_pattern_m as L ON L.unit_level_up_pattern_id = U.unit_level_up_pattern_id WHERE U.unit_id=? AND L.unit_level=?;",[n.unit_id, n.level], function(err,row){
          total_sale_price += parseInt(row.sale_price);
          sale_detail.push({
            unit_owning_user_id: n.unit_owning_user_id,
            unit_id: n.unit_id,
            price: parseInt(row.sale_price)
          });
          log.verbose(row);
          if (typeof total_sale_seals[row.rarity.toString()] === "number" && (!noExchangePointList.includes(n.unit_id))){
            total_sale_seals[row.rarity.toString()] += parseInt(1);
          }
          next(cb);
        });
      };
      next(function(){
        log.verbose("Sale Value: " + parseInt(total_sale_price));
        log.verbose("Sale Seals: " + JSON.stringify(total_sale_seals));

        var error = function(e){
          if (e){log.error(e);}
          Global.database().rollback(function(){
            if (e instanceof Error){
              response(403,{message: e.message});
            }else{
              response(403,{});
            }
          });
          return 0;
        };

        Global.common().getUserInfo(requestData.user_id, ["level","exp","next_exp","game_coin","sns_coin","social_point","unit_max","energy_max","friend_max"]).then(function(before_user_info){
          Global.database().beginTransaction(function(err){
            if (err){return error(err);}
            Global.database().query("DELETE FROM units WHERE unit_owning_user_id IN (:uouids);", {uouids: sale_list}, function(err){
              if (err){return error(err);}
              Global.database().query("UPDATE users SET game_coin=game_coin+:coin WHERE user_id=:user",{coin: total_sale_price, user: requestData.user_id}, function(err){
                if (err){return error(err);}
                Global.database().query("INSERT INTO user_exchange_point VALUES (:user,2,:s2),(:user,3,:s3),(:user,4,:s4),(:user,5,:s5) ON DUPLICATE KEY UPDATE exchange_point=exchange_point+VALUES(exchange_point);",{
                  user: requestData.user_id,
                  s2: total_sale_seals["2"],
                  s3: total_sale_seals["3"],
                  s4: total_sale_seals["4"],
                  s5: total_sale_seals["5"]
                }, function(err){
                  if (err){return error(err);}
                  Global.database().commit(function(err){
                    if (err){return error(err);}
                    Global.common().getUserInfo(requestData.user_id, ["level","exp","next_exp","game_coin","sns_coin","social_point","unit_max","energy_max","friend_max"]).then(function(after_user_info){
                      Global.common().getRemovableSkillInfo(requestData.user_id).then(function(removableskillinfo){
                        var get_exchange_point_list = [];
                        if (total_sale_seals["2"]>0) get_exchange_point_list.push({rarity: 2, exchange_point: total_sale_seals["2"]});
                        if (total_sale_seals["3"]>0) get_exchange_point_list.push({rarity: 3, exchange_point: total_sale_seals["3"]});
                        if (total_sale_seals["4"]>0) get_exchange_point_list.push({rarity: 4, exchange_point: total_sale_seals["4"]});
                        if (total_sale_seals["5"]>0) get_exchange_point_list.push({rarity: 5, exchange_point: total_sale_seals["5"]});
                        var responseData = {
                          total: total_sale_price,
                          detail: sale_detail,
                          before_user_info: before_user_info,
                          after_user_info: after_user_info,
                          reward_box_flag: false,
                          get_exchange_point_list: get_exchange_point_list,
                          unit_removable_skill: removableskillinfo
                        };
                        response(200, responseData);
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
  var rankup = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.BOTH, function(requestData, response){
    var error = function(err, doLog, extra){
      Global.database().rollback();
      if (doLog) log.error(err);
      if (extra) log.debug(extra);
      response(403, {message: err.message});
    };
    try {
      if (!(typeof requestData.formData.unit_owning_user_ids === "object" && Array.isArray(requestData.formData.unit_owning_user_ids)) && requestData.formData.unit_owning_user_ids.length == 1) throw new Error("Invalid Request");
      if (!(typeof requestData.formData.unit_owning_user_ids[0] === "number" && parseInt(requestData.formData.unit_owning_user_ids[0])==requestData.formData.unit_owning_user_ids[0])) throw new Error("Invalid Request");
      if (!(typeof requestData.formData.base_owning_unit_user_id === "number" && parseInt(requestData.formData.base_owning_unit_user_id)==requestData.formData.base_owning_unit_user_id)) throw new Error("Invalid Request");
      if(requestData.formData.base_owning_unit_user_id == requestData.formData.unit_owning_user_ids[0]) throw new Error("Nope.");
      Global.database().query("SELECT * FROM v_units_not_locked WHERE user_id=:user AND unit_owning_user_id IN (:units)",{user: requestData.user_id, units: [requestData.formData.unit_owning_user_ids[0]]}, function(err, sacrificeUnit){
        if (err) return error(err, true, this.sql);
        if (sacrificeUnit.length != 1) return error(new Error("Can't sacrifice that card."));
        sacrificeUnit = sacrificeUnit[0];
        Global.database().query("SELECT * FROM units WHERE user_id=:user AND unit_owning_user_id=:unit AND deleted=0;",{user: requestData.user_id, unit: requestData.formData.base_owning_unit_user_id}, function(err,baseUnit){
          if (err) return error(err, true, this.sql);
          if (baseUnit.length != 1) return error(new Error("That card is not available."));
          baseUnit = baseUnit[0];
          if (sacrificeUnit.unit_id != baseUnit.unit_id) return error(new Error("Not Same Unit"));
          log.verbose(baseUnit);
          if (baseUnit.rank >= baseUnit.max_rank && baseUnit.removable_skill_capacity>=baseUnit.max_removable_skill_capacity){
            return error(new Error("Card Already Maxed"),false);
          }

          unitDB.get("SELECT rank_up_cost, disable_rank_up, after_love_max, after_level_max FROM unit_m WHERE unit_id=?",[baseUnit.unit_id], function(err, baseUnitData){
            if (err) return error(err, true);
            if (!baseUnitData) return error(new Error("Failed to find unit data [" + baseUnit.unit_id + "]"), true);
            if (baseUnitData.disable_rank_up > 0) return error(new Error("That unit cannot be ranked up."));
            Global.common().getUserInfo(requestData.user_id).then(function(beforeUserInfo){
              if (beforeUserInfo.game_coin < baseUnitData.rank_up_cost) return error(new Error("Not Enough Coin"));
              var gainSlots = 1;
              if (baseUnit.rank>=baseUnit.max_rank){ gainSlots+=1; }
              Global.database().beginTransaction(function(err){
                if (err) return error(err, true);
                Global.database().query("UPDATE units SET rank=max_rank,display_rank=max_rank,removable_skill_capacity=:skillcap, max_love=:maxlove, max_level=:maxlevel WHERE unit_owning_user_id=:unit",{
                  unit: baseUnit.unit_owning_user_id,
                  skillcap: Math.min(baseUnit.max_removable_skill_capacity, baseUnit.removable_skill_capacity+gainSlots),
                  maxlove: baseUnitData.after_love_max,
                  maxlevel: baseUnitData.after_level_max
                },function(err){
                  if (err) return error(err, true, this.sql);
                  Global.database().query("DELETE FROM units WHERE unit_owning_user_id=:unit", {unit: sacrificeUnit.unit_owning_user_id}, function(err){
                    if (err) return error(err, true, this.sql);
                    Global.database().query("UPDATE users SET game_coin=game_coin-:cost WHERE user_id=:user", {cost: baseUnitData.rank_up_cost, user: requestData.user_id}, function(err){
                      if (err) return error(err, true, this.sql);
                      Global.common().userUpdateAlbum(requestData.user_id, baseUnit.unit_id, true, false, false, 0, 0, 0).then(function(){
                        Global.database().commit(function(err){
                          if (err) return error(err,true);
                          Global.database().query("SELECT * FROM units WHERE unit_owning_user_id=:unit",{unit:baseUnit.unit_owning_user_id}, function(err, afterUnitInfo){
                            if (err) return error(err,true, this.sql);
                            log.verbose(afterUnitInfo);
                            Global.common().getUserInfo(requestData.user_id).then(function(afterUserInfo){
                              Global.common().getRemovableSkillInfo(requestData.user_id).then(function(removableSkillInfo){
                                var responseData = {
                                  before: Global.common().parseUnitData(baseUnit),
                                  after: Global.common().parseUnitData(afterUnitInfo[0]),
                                  before_user_info: beforeUserInfo,
                                  after_user_info: afterUserInfo,
                                  user_game_coin: baseUnitData.rank_up_cost,
                                  open_subscenario_id: null,
                                  get_exchange_point_list: [],
                                  unit_removable_skill: removableSkillInfo
                                };
                                response(200, responseData);
                              });
                            });
                          });
                        });
                      }).catch(function(err){
                        error(err, true);
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    } catch (e){
      error(e);
    }

  });

  var deck = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.BOTH, function(requestData, response){
    if (!(typeof requestData.formData.unit_deck_list === "object" && Array.isArray(requestData.formData.unit_deck_list))){
      response(403,[]);
      return;
    }
    var decks = [];
    var usedDeckIDs = [];

    try {
      var hasMainDeck = false;
      var allUnits = [];
      for (var i=0;i<requestData.formData.unit_deck_list.length;i++){
        var d = requestData.formData.unit_deck_list[i];
        if (typeof d.unit_deck_id != "number") { response(403, []); return; }
        if (typeof d.deck_name != "string") { response(403, []); return; }
        if (typeof d.main_flag != "number") { response(403, []); return; }
        if (!(typeof d.unit_deck_detail === "object" && Array.isArray(d.unit_deck_detail))) { response(403, []); return; }
        if (![1,2,3,4,5,6,7,8,9].includes(d.unit_deck_id)){ response(403,[]); return;}
        if (usedDeckIDs.includes(d.unit_deck_id)){ response(403,[]); return;}
        usedDeckIDs.push(d.unit_deck_id);
        if (d.deck_name.length > 10) { response(403,[]); return; }
        if (d.main_flag == 1){
          if (hasMainDeck) {response(403,[]); return; }
          if (d.unit_deck_detail.length != 9) { response(403,[]); return; }
          hasMainDeck = true;
        }
        if (d.unit_deck_detail.length > 9) { response(403,[]); return; }
        var usedPositions = [];
        var usedUnitIDs = [];
        for (var j=0;j<d.unit_deck_detail.length;j++){
          var s = d.unit_deck_detail[j];
          if (typeof s.position != "number") {response(403,[]); return;}
          if (typeof s.unit_owning_user_id != "number") {response(403,[]); return;}
          if (s.position != parseInt(s.position)){response(403,[]); return;}
          if (s.unit_owning_user_id != parseInt(s.unit_owning_user_id)){response(403,[]); return;}
          if (usedPositions.includes(s.position)){response(403,[]); return;}
          usedPositions.push(s.position);
          if (usedUnitIDs.includes(s.unit_owning_user_id)){response(403,[]); return;}
          usedUnitIDs.push(s.unit_owning_user_id);
          if (!allUnits.includes(s.unit_owning_user_id)){allUnits.push(s.unit_owning_user_id);}
        }
        decks.push(d);
      }
    } catch (e){
      response(403,[]);
      log.error(e);
      return;
    }
    if (!hasMainDeck){
      response(403, []);
      return;
    }
    Global.database().query("SELECT unit_owning_user_id FROM units WHERE user_id=:user AND deleted=0 AND unit_owning_user_id IN (:units) ;",{user: requestData.user_id, units:allUnits}, function(err, unitCheckList){
      if (err){
        log.debug(this.sql);
        log.error(err);
        response(403, []);
        return;
      }
      if (unitCheckList.length != allUnits.length){
        response(403,[]);
        return;
      }
      var error = function(err,sql){
        log.error(err);
        if (sql) log.debug(sql);
        Global.database().rollback(function(){
          response(403, {message: err.message});
        });
      };
      Global.database().beginTransaction(function(err){
        if (err) return error(err);
        Global.database().query("DELETE FROM user_unit_deck WHERE user_id=:user",{user: requestData.user_id}, function(err){
          if (err) return error(err,this.sql);
          var tempDeckList = decks.slice();
          var insertNextDeck = function(callback){
            let next = tempDeckList.shift();
            if (!next){callback(); return; }
            Global.database().query("INSERT INTO user_unit_deck VALUES (:user, :deck, :name);",{user: requestData.user_id, deck: next.unit_deck_id, name: next.deck_name}, function(err){
              if (err) return error(err, this.sql);
              var insertNextUnit = function(unitCallback){
                var nextu = next.unit_deck_detail.shift();
                if (!nextu) return unitCallback();
                Global.database().query("INSERT INTO user_unit_deck_slot VALUES (:user, :deck, :slot, :unit)",{user: requestData.user_id, deck: next.unit_deck_id, slot: nextu.position, unit: nextu.unit_owning_user_id}, function(err){
                  if (err) return error(err.this.sql);
                  insertNextUnit(unitCallback);
                });
              };
              insertNextUnit(function(){insertNextDeck(callback);});
            });
          };
          insertNextDeck(function(){
            Global.database().commit(function(err){
              if (err) return error(err);
              response(200,[]);
            });
          });
        });
      });
    });
  });

  var setdisplayrank = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.BOTH, function(requestData, response){
    if (!(requestData.formData.display_rank === 1 || requestData.formData.display_rank === 2)) return response(403,{});
    if (!(typeof requestData.formData.unit_owning_user_id === "number" && parseInt(requestData.formData.unit_owning_user_id)===requestData.formData.unit_owning_user_id)) return response(403,{});
    Global.database().query("SELECT rank,max_rank,unit_owning_user_id FROM units WHERE user_id=:user AND unit_owning_user_id=:unit", {user: requestData.user_id, unit: requestData.formData.unit_owning_user_id}, function(err, unit){
      if (err){log.error(err); return response(403,{message: err.message});}
      log.debug(this.sql);
      if (!unit || unit.length==0) return response(403,{message: "unit not found"});
      unit = unit[0];
      log.debug(unit);
      if (requestData.formData.display_rank > unit.rank) return response(403,{message: "illegal rank"});
      Global.database().query("UPDATE units SET display_rank=:rank WHERE unit_owning_user_id=:unit",{unit: unit.unit_owning_user_id, rank: requestData.formData.display_rank}, function(err){
        if (err){log.error(err); return response(403,{});}
        response(200,{});
      });
    });
  });

  var merge = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.BOTH, function(requestData, response){
    var error = function(err, doLog, extra){
      Global.database().rollback();
      if (doLog) log.error(err);
      if (extra) log.debug(extra);
      response(403, {message: err.message});
    };
    var f = requestData.formData;

    if ( //Verify FormData Types
      (!(typeof f.base_owning_unit_user_id === "number" && f.base_owning_unit_user_id === parseInt(f.base_owning_unit_user_id))) ||
      (!(typeof f.unit_owning_user_ids === "object" && Array.isArray(f.unit_owning_user_ids))) ||
      (!(typeof f.unit_support_list === "object" && Array.isArray(f.unit_support_list)))
    ) return error(new Error("Invalid Request"));
    var totalSacrificeCount = 0;
    for (let i=0;i<f.unit_owning_user_ids.length;i++){
      totalSacrificeCount += 1;
      if (!(typeof f.unit_owning_user_ids[i] === "number" && f.unit_owning_user_ids[i] === parseInt(f.unit_owning_user_ids[i]))) return error(new Error("Invalid Request"));
    }

    for (let i=0;i<f.unit_support_list.length;i++){
      if (!(typeof f.unit_support_list[i] === "object")) return error(new Error("Invalid Request"));
      if (!(typeof f.unit_support_list[i].unit_id === "number")) return error(new Error("Invalid Request"));
      if (!(typeof f.unit_support_list[i].amount === "number" && parseInt(f.unit_support_list[i].amount) == f.unit_support_list[i].amount)) return error(new Error("Invalid Request"));
      if (!(f.unit_support_list[i].unit_id in supportUnitList)) return error(new Error("Invalid Support Unit ID"));
      totalSacrificeCount += f.unit_support_list[i].amount;
    }
    if (totalSacrificeCount > 12 || totalSacrificeCount < 1) return error(new Error("Invalid number of sacrifices"));
    Global.database().query("SELECT unit_id, amount FROM user_support_unit WHERE user_id=:user",{user: requestData.user_id}, function(err, owningSupportInfo){
      if (err) return error(err, true, this.sql);
      var owningSupports = {};
      for (let i=0;i<owningSupportInfo.length;i++){
        owningSupports[owningSupportInfo[i].unit_id] = owningSupportInfo[i].amount;
      }
      for (let i=0;i<f.unit_support_list.length;i++){
        if (!(f.unit_support_list[i].unit_id in owningSupports && owningSupports[f.unit_support_list[i].unit_id] >= f.unit_support_list[i].amount)) return error(new Error("Not Enough Supports"));
      }
      let _t = f.unit_owning_user_ids.slice();
      if (_t.length==0) _t.push(0); //Empty Array Hack/Fix
      console.log(f.unit_owning_user_ids.slice().push(0));
      Global.database().query("SELECT * FROM v_units_not_locked WHERE user_id=:user AND unit_owning_user_id IN (:units);",{user: requestData.user_id, units: _t}, function(err,sacrificeData){
        if (err) return error(err, true, this.sql);
        if (sacrificeData.length != f.unit_owning_user_ids.length) return error(new Error("Invalid Sacrifice Cards"));
        Global.database().query("SELECT * FROM units WHERE unit_owning_user_id=:unit AND user_id=:user AND deleted=0;", {user: requestData.user_id, unit: f.base_owning_unit_user_id}, function(err,mainUnitData){
          if (err) return error(err, true, this.sql);
          if ((!mainUnitData) || mainUnitData.length != 1) return error(new Error("Main Unit Invalid"));
          mainUnitData = mainUnitData[0];
          if (mainUnitData.level >= mainUnitData.max_level && (mainUnitData.unit_skill_level == 0 || mainUnitData.unit_skill_level>=8)) return error(new Error("Unit is Maxed"));
          var gain_exp = 0;
          var gain_skill = 0;
          var coin_cost = 0;
          var seals = {
            "2": 0,
            "3": 0,
            "4": 0,
            "5": 0
          };
          for (let i=0;i<f.unit_support_list.length;i++){
            var attrMatch = (supportUnitList[f.unit_support_list[i].unit_id].attribute==5||supportUnitList[f.unit_support_list[i].unit_id].attribute==mainUnitData.attribute);
            gain_exp += (supportUnitList[f.unit_support_list[i].unit_id].exp * f.unit_support_list[i].amount)*(attrMatch?1.2:1);
            gain_skill += (supportUnitList[f.unit_support_list[i].unit_id].skill_exp * f.unit_support_list[i].amount)*(attrMatch?1:0);
            coin_cost += (supportUnitList[f.unit_support_list[i].unit_id].merge_cost * f.unit_support_list[i].amount);
          }
          unitDB.get("SELECT * FROM unit_m WHERE unit_id=?",[mainUnitData.unit_id], function(err,mainUnitM){
            if (err) return error(err, true);
            if (!mainUnitM) return err(new Error("Failed to find info..."));
            mainUnitData.M = mainUnitM;
            mainUnitData.default_unit_skill_id = mainUnitM.default_unit_skill_id;
            mainUnitData.unit_level_up_pattern_id = mainUnitM.unit_level_up_pattern_id;
            var unitsToDo = sacrificeData.slice();
            var nextUnit = function(callback){
              var next = unitsToDo.shift();
              if (!next) {callback(); return;}
              log.verbose(next);
              unitDB.get("SELECT merge_cost, merge_exp, default_unit_skill_id, sl.grant_exp as skill_grant_exp, attribute_id, rarity FROM unit_m as u JOIN unit_level_up_pattern_m as l ON u.unit_level_up_pattern_id=l.unit_level_up_pattern_id LEFT JOIN unit_skill_m as s ON u.default_unit_skill_id = s.unit_skill_id LEFT JOIN unit_skill_level_m as sl ON s.unit_skill_id = sl.unit_skill_id WHERE unit_id=? AND unit_level=? AND(skill_level=? OR skill_level IS NULL)",[next.unit_id,next.level,next.unit_skill_level], function(err,row){
                if (err) return callback(err);
                if (!row) return callback(new Error("Missing Unit"));
                gain_exp += row.merge_exp * (row.attribute_id==mainUnitData.attribute?1.2:1);
                coin_cost += row.merge_cost;
                if ((!(noExchangePointList.includes(next.unit_id))) && row.rarity.toString() in seals){
                  seals[row.rarity.toString()] += 1;
                }
                if (row.default_unit_skill_id && row.default_unit_skill_id === mainUnitData.default_unit_skill_id) gain_skill += row.skill_grant_exp;
                nextUnit(callback);
              });
            };
            nextUnit(function(err){
              log.debug(seals);
              if (err) return error(err, true);
              log.verbose("Gain Skill EXP: " + gain_skill);
              Global.common().getUserInfo(requestData.user_id).then(function(user_info){
                if (user_info.game_coin < coin_cost) return error(new Error("Not Enough Coin"));
                var exp_multiplier = 1;
                var r = Math.random();
                if (r<=0.1){
                  exp_multiplier+=0.5;
                  if (r<=0.02){
                    exp_multiplier+=0.5;
                  }
                }
                var newExp = mainUnitData.exp + (gain_exp*exp_multiplier);
                var newSkillExp = mainUnitData.default_unit_skill_id?(mainUnitData.unit_skill_exp + gain_skill):0;
                var newLevel = mainUnitData.level;
                var newLevelData = null;
                var newSkillLevel = mainUnitData.unit_skill_level;
                var level_up = function(callback){
                  if (newLevel >= mainUnitData.max_level) return callback();
                  unitDB.get("SELECT next_exp,hp_diff,smile_diff,pure_diff,cool_diff FROM unit_level_up_pattern_m WHERE unit_level_up_pattern_id=? AND unit_level=?",[mainUnitData.unit_level_up_pattern_id, newLevel], function(err, row){
                    if (err) return error(err, true);
                    newLevelData = row;
                    if (newExp >= row.next_exp){
                      newLevel += 1;
                      return level_up(callback);
                    }
                    callback();
                  });
                };
                level_up(function(){
                  log.verbose(newSkillLevel);
                  var skill_level_up = function(callback){
                    if (newSkillLevel==0 || newSkillLevel==8) return callback();
                    unitDB.get("SELECT next_exp FROM unit_skill_level_up_pattern_m JOIN unit_skill_m ON unit_skill_m.unit_skill_level_up_pattern_id=unit_skill_level_up_pattern_m.unit_skill_level_up_pattern_id WHERE unit_skill_id=? AND skill_level=?;",[mainUnitData.default_unit_skill_id, newSkillLevel], function(err,row){
                      if (err) return error(err, true);
                      if (!row) callback();
                      if (newSkillExp >= row.next_exp) {
                        newSkillLevel += 1;
                        return skill_level_up(callback);
                      }
                      callback();
                    });
                  };
                  skill_level_up(function(){
                    Global.database().beginTransaction(function(err){
                      if (err) return error(err, true);
                      //Remove Supports
                      var removeSupports = function(callback){
                        var n = f.unit_support_list.shift();
                        if (!n) return callback();
                        Global.database().query("UPDATE user_support_unit SET amount=amount-:amount WHERE unit_id=:unit AND user_id=:user;", {amount: n.amount, unit: n.unit_id, user: requestData.user_id}, function(err){
                          if (err) return error(err,true, this.sql);
                          removeSupports(callback);
                        });
                      };
                      removeSupports(function(){
                        f.unit_owning_user_ids.push(0);
                        Global.database().query("DELETE FROM units WHERE unit_owning_user_id IN (:units)",{units: f.unit_owning_user_ids}, function(err){
                          if (err) return error(err,true, this.sql);
                          var newData = {
                            unit: mainUnitData.unit_owning_user_id,
                            hp: mainUnitData.M.hp_max - newLevelData.hp_diff,
                            smile: mainUnitData.M.smile_max - newLevelData.smile_diff,
                            pure: mainUnitData.M.pure_max - newLevelData.pure_diff,
                            cool: mainUnitData.M.cool_max - newLevelData.cool_diff,
                            level: newLevel,
                            exp: newExp,
                            nextexp: newLevelData.next_exp,
                            skilllevel: newSkillLevel,
                            skillexp: newSkillExp,
                          };
                          log.verbose(newData);
                          Global.database().query("UPDATE units SET max_hp=:hp,stat_smile=:smile,stat_pure=:pure,stat_cool=:cool,level=:level,exp=:exp,next_exp=:nextexp,unit_skill_level=:skilllevel,unit_skill_exp=:skillexp WHERE unit_owning_user_id=:unit", newData, function(err){
                            if (err) return error(err,true,this.sql);
                            var isMaxRank = mainUnitData.rank>=mainUnitData.max_rank;
                            Global.common().userUpdateAlbum(requestData.user_id, mainUnitData.unit_id, isMaxRank, (mainUnitData.love==mainUnitData.max_love&&isMaxRank), (newData.level==mainUnitData.max_level&&isMaxRank), 0, 0, 0).then(function(){
                              Global.database().query("UPDATE users SET game_coin=game_coin-:cost WHERE user_id=:user",{user: requestData.user_id, cost: coin_cost}, function(err){
                                if (err) return error(err,true, this.sql);
                                Global.database().commit(function(err){
                                  if (err) return error(err,true);
                                  Global.common().getUserInfo(requestData.user_id).then(function(after_user_info){
                                    Global.database().query("SELECT * FROM units WHERE unit_owning_user_id=:unit",{unit: mainUnitData.unit_owning_user_id}, function(err,after){
                                      if (err) return error(err, true, this.sql);
                                      var get_exchange_point_list = [];
                                      Object.keys(seals).forEach(function(s){
                                        if (seals[s] > 0){
                                          get_exchange_point_list.push({rarity: parseInt(s), exchange_point: seals[s]});
                                        }
                                      });
                                      Global.common().getRemovableSkillInfo(requestData.user_id).then(function(removableSkillInfo){
                                        var responseData = {
                                          before_user_info: user_info,
                                          after_user_info: after_user_info,
                                          before: Global.common().parseUnitData(mainUnitData),
                                          after: Global.common().parseUnitData(after[0]),
                                          user_game_coin: coin_cost,
                                          evolution_setting_id: exp_multiplier==2?3:(exp_multiplier==1.5?2:1),
                                          bonus_value: exp_multiplier,
                                          open_subscenario_id: null,
                                          get_exchange_point_list: get_exchange_point_list,
                                          unit_removable_skill: removableSkillInfo
                                        };
                                        response(200,responseData);
                                      });
                                    });
                                  });
                                });
                              });
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  return new Global.registerModule({
    unitall: unitall,
    deckinfo: deckinfo,
    supporterall: supporterall,
    removableskillinfo: removableskillinfo,
    favorite: favorite,
    sale: sale,
    deck: deck,
    rankup: rankup,
    setdisplayrank: setdisplayrank,
    merge: merge
  });
};

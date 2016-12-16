module.exports = function(Global){
  var log = new Global.Log.create(Global.Config().log.level, "Module: Unit");
  var unitDB = new Global.sqlite3.Database("./data/db/unit.db_",Global.sqlite3.OPEN_READONLY);
  var exchangeDB = new Global.sqlite3.Database("./data/db/exchange.db_",Global.sqlite3.OPEN_READONLY);
  var noExchangePointList = [];

  exchangeDB.all("SELECT * FROM exchange_nopoint_unit_m", function(err,rows){
    if (err){ log.error(err); return; }
    rows.forEach(function(r){
      noExchangePointList.push(r.unit_id);
    });
    log.verbose("Loaded NoExchangePoint List: " + noExchangePointList.length + " units.");
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
    response(200, {unit_support_list:[]});
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


  return new Global.registerModule({
    unitall: unitall,
    deckinfo: deckinfo,
    supporterall: supporterall,
    removableskillinfo: removableskillinfo,
    favorite: favorite,
    sale: sale,
    deck: deck,
    rankup: rankup,
    setdisplayrank: setdisplayrank
  });
};

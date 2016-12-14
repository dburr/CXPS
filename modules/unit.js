module.exports = function(Global){
  var log = new Global.Log.create(Global.Config().log.level, "Module: Unit");
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

  var supporterall = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.BOTH, function(requestData, response){
    response(200, {unit_support_list:[]});
  });
  var removableskillinfo = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.BOTH, function(requestData, response){
    response(200, {
      owning_info: [],
      equipment_info: []
    });
  });

  return new Global.registerModule({
    unitall: unitall,
    deckinfo: deckinfo,
    supporterall: supporterall,
    removableskillinfo: removableskillinfo
  });
};

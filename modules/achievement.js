module.exports = function(Global){
  var initialAccomplishedList = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.BOTH, function(requestData, response){
    response(200, [
      {achievement_category_id: 1, count: 0, achievement_list:[]},
      {achievement_category_id: 2, count: 0, achievement_list:[]},
      {achievement_category_id: 3, count: 0, achievement_list:[]},
      {achievement_category_id: 4, count: 0, achievement_list:[]},
      {achievement_category_id: 5, count: 0, achievement_list:[]},
      {achievement_category_id: 7, count: 0, achievement_list:[]},
      {achievement_category_id: 10000, count: 0, achievement_list:[]},
    ]);
  });

  return new Global.registerModule({
    initialaccomplishedlist: initialAccomplishedList
  });
};

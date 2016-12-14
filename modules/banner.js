module.exports = function(Global){
  var bannerlist = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.BOTH, function(requestData, response){
    response(200, {
      time_limit: Global.common().parseDate(Date.now()+36000000),
      member_category_list: [
        {
          member_category: 1,
          banner_list: [
            {
              banner_type: 0,
              target_id: 65,
              asset_path: "assets/image/event/banner/e_bt_03.png",
              asset_path_se: "assets/image/event/banner/e_bt_03se.png",
              master_is_active_event: false
            }
          ]
        },
        {
          member_category: 2,
          banner_list: [
            {
              banner_type: 0,
              target_id: 65,
              asset_path: "assets/image/event/banner/e_bt_03.png",
              asset_path_se: "assets/image/event/banner/e_bt_03se.png",
              master_is_active_event: false
            }
          ]
        }
      ]
    });
  });

  return new Global.registerModule({
    bannerlist: bannerlist
  });
};

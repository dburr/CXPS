module.exports = function(Global){
  var noticeMarquee = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.BOTH, function(requestData, response){
    response(200, {
      item_count: 0,
      marquee_list: []
    });
  });

  return new Global.registerModule({
    noticemarquee: noticeMarquee
  });
};

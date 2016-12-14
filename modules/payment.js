module.exports = function(Global){
  var productList = new Global.registerAction(Global.CONSTANT.AUTH.CONFIRMED_USER, Global.CONSTANT.REQUEST_TYPE.BOTH, function(requestData, response){
    response(200, {
      sns_product_list: [
        {product_id: "0", name: "", price: "", product_type: 2, item_list: []}  //One sns_product is required. Product Type 2 makes it not visible... no idea why.
      ],
      product_list: []
    });
  });

  return new Global.registerModule({
    productlist: productList
  });
};

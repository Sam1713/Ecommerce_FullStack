
const express = require('express');
const router = express.Router();
const {logged} = require('../auth/userAuth');




const orderController = require('../controller/orderController');
const Order=require('../models/orderModel')
const setCommonHeaders = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    // You can add more headers if needed
    // res.setHeader('Another-Header', 'header-value');
    next();
  };
  const { isLoggedIn } = require('../auth/userAuth');
  // Use the middleware for all routes
  router.use(setCommonHeaders);




router.get('/order/:id',isLoggedIn,setCommonHeaders,orderController.render_user_orders);

router.get('/',isLoggedIn,setCommonHeaders,orderController.render_orders)

router.get('/order-details/:id',isLoggedIn,orderController.render_order_details);

router.get('/cancel_order/:product_id/:order_id',isLoggedIn, orderController.cancel_order);

router.get('/get-invoice',  orderController.get_invoice);

router.get('/return-order', isLoggedIn,setCommonHeaders, orderController.return_order);

router.post('/order-return', isLoggedIn,setCommonHeaders, orderController.order_return);


module.exports=router;
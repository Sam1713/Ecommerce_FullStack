const express = require('express');
const router = express.Router();

const cartController = require('../controller/cartController');
const { isLoggedIn,block } = require('../auth/userAuth');
const { verifyOTP } = require('../controller/userController');


const setCommonHeaders = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    next();
  };
  
  // Use the middleware for all routes
  router.use(setCommonHeaders);

router.get('/cart',isLoggedIn,block,setCommonHeaders,cartController.showCart)

router.post('/add-to-cart/:userId/:productId', cartController.addToCart);
router.get('/add-quantity/:productId',isLoggedIn,block,setCommonHeaders, cartController.incrementQuantity);

router.get('/minus-quantity/:productId',isLoggedIn,block, cartController.decrementQuantity);

// Server-side route for POST requests
router.delete('/delete/:productId', cartController.removeItem);

router.get('/checkout',isLoggedIn,block, cartController.render_checkout);


router.get('/order-success',isLoggedIn,block,setCommonHeaders,cartController.order_success)
router.post('/place-order', cartController.placeOrder);
router.post('/verify-payment', cartController.verifyPaymenet)



// router.post('/add-to-cart/:userId/:productId', cartController.addToCart);
// router.post('/update-cart', cartController.updateCart);

// // Route to display the cart details
// router.get('/cart-details',isLoggedIn, cartController.showCartDetails);

// // Add a new route to handle the POST request
// router.post('/update-checkbox/:productId', cartController.updateCheckbox);


// router.get('/delete/:productId',cartController.renderDelete)

module.exports = router;

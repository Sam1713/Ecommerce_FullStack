

const express = require('express');
const router = express.Router();
const session=require('express-session')

const adminController = require('../controller/adminController');
const {isLoggedInAdmin,isLoggedOut} = require('../auth/adminauth');


const disableCache = (req, res, next) => {
    res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
    res.header("Expires", "-1");
    res.header("Pragma", "no-cache");
    next();
  };
  router.use(disableCache)
  router.use(
    session({
      secret: 'adminSecret',
      resave: false,
      saveUninitialized: true,
    })
  );
  // Use the middleware for all routes
//   router.use(setCommonHeaders);



router.get('/adm-login',isLoggedOut,disableCache, adminController.renderAdminLogin);

router.get('/admin-ho',isLoggedInAdmin,disableCache, adminController. render_dharboard);

// router.get('/',logged,setCommonHeaders, adminController.redirect_dash);

router.get('/get-sales',isLoggedInAdmin,adminController.getGraphDetails);


router.post('/admin-log', adminController.adminLogin);

router.get('/dashboard',isLoggedInAdmin, adminController.renderDashboard);

router.get('/logouttt',isLoggedInAdmin,disableCache, adminController.logouttt);

router.get('/search',isLoggedInAdmin,adminController.searchUsers);

router.get('/unblock/:id', adminController.unblockUser);

router.get('/block/:id', adminController.blockUser);


router.get('/orders',isLoggedInAdmin,adminController.get_orders);
router.get('/orders/view-invoice',isLoggedInAdmin, adminController.get_invoice);

router.get('/order-user',isLoggedInAdmin,adminController.getUsers);

router.get('/orders/:userId',isLoggedInAdmin,adminController.userOrderPage)



router.get('/manage-order',isLoggedInAdmin, adminController.render_change_order_status);

router.post('/changeStatus/:id', adminController.update_order_status)

router.get('/return',isLoggedInAdmin, adminController.getNotifications);

router.get('/approve/:id',isLoggedInAdmin, adminController.aproveRequest);

router.get('/decline/:id',isLoggedInAdmin,adminController.declineRequest);




module.exports = router;

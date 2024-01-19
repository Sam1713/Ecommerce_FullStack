
const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');
const { isLoggedIn } = require('../auth/userAuth');
const { disableCache } = require('../controller/adminController');
const multer = require('multer');
const path = require('path');



const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/images/product');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const setCommonHeaders = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    next();
  };
  
  router.use(setCommonHeaders);


const upload = multer({ storage: storage });

router.get('/error',userController.error)

router.get('/',isLoggedIn,userController.renderLogin);

router.post('/login', userController.login);

router.get('/signup', userController.renderSignup);

router.post('/signup', userController.signup);

router.get('/match-otp', userController.renderMatchOTP);

router.post('/match-otp', userController.matchOTP);

router.get('/home',isLoggedIn,setCommonHeaders, userController.renderHome);




router.get('/logout',userController.logout);

router.get('/forgot-password',userController.renderforgotPassword)

router.get('/verify-password',userController.verifyPassword)


router.post('/forgot-password', userController.sendOtpForPassword);
router.post('/resend-otp', userController.resendOTP);

router.get('/confirm-password',userController.confirmPassword)

router.post('/confirm-password', userController.verifyPasswordOTP);

router.post('/new-password/:id',userController.newPassword)

router.get('/otp-verify',  userController.renderOTPVerify);




router.get('/user/prod-detail/:id',isLoggedIn,setCommonHeaders, userController.renderProductDetail);

router.get('/use/:id',isLoggedIn,setCommonHeaders, userController.renderUse);


router.get('/user-profile',isLoggedIn,setCommonHeaders,userController.renderUserProfile)


router.get('/user-profile-edit/:userId',isLoggedIn,setCommonHeaders,userController.renderEditUser)

router.post('/user-profile-edit/:userId', isLoggedIn, userController.updateUser);

router.post('/profile/update/image/:userId', userController.upload.single('profileImage'), userController.updateProfileImage);

router.get('/my-address/',isLoggedIn,setCommonHeaders,userController.render_Address)

router.post('/my-address/new-address',userController.add_new_address);

router.post('/checkout/new-address',userController.add_new_address_checkout);

router.get('/my-address/edit-address/:id',isLoggedIn,setCommonHeaders,userController.render_edit_address)

router.post('/my-address/update-address/:id',userController.update_user_address);

router.delete('/my-address/delete/:id', userController.delete_address);

router.get('/wallet',isLoggedIn,setCommonHeaders,userController.wallet)





 
  
module.exports = router;

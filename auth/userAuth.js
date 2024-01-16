const Category = require('../models/categoryModel');
const Product = require('../models/productModel');
const User=require('../models/userModel');
const flash=require('connect-flash')

const { v4: uuidv4 } = require('uuid');
// exports.isLoggedIn = (req, res, next) => {
//   console.log('Checking if user is logged in...');
//   console.log('req.session.user:', req.session.user);

//   if (req.session.user) {
//     console.log('User is not logged in. Redirecting to /login.');
//     // res.redirect('/login'); // Redirect to the login page if the user is not logged in
//   // }else{
//   //   // const products=await Product.findOne({})
//   //   // console.log('User is logged in. Proceeding to the next middleware.');
//     res.render('user/home'); // Continue to the next middleware if the user is logged in
//   // }
//   }else{
//     next()
//   }
    
// };
// isLoggedIn middleware
// exports.isLoggedIn = async (req, res, next) => {
//   try {
//     console.log('Checking if user is logged in...');
//     console.log('req.session.user:', req.session.user);

//     if (req.session.userId) {
//       // If the user is logged in, fetch products and pass them to the render function
//       const products = await Product.find();
//       const categories=await Category.find()
//        res.render('cart/cart-details',{categories,products}) // Make products available to all templates
//     }

//     next(); // Proceed to the next middleware
//   } catch (error) {
//     console.error('Error in isLoggedIn middleware:', error);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// };


// exports.isLoggedIn = (req, res, next) => {
//   console.log('Checking if user is logged in...');
//   console.log('req.session.user:', req.session.user);

//   if (req.session.user) {
//     console.log('User is logged in. Proceeding to the next middleware.');
//     next(); // Continue to the next middleware if the user is logged in
//   } else {
//     console.log('User is not logged in. Rendering cart/cart-details.');
//     res.redirect('/login'); // Render the 'cart-details' page if the user is not logged in
//   }
// };
exports.isLoggedIn=(req,res,next)=>{
  if(req.session.user){
    console.log('ud',req.session.user)
  
    next()
  }else{
    console.log('hai')
    res.render('user/login',{msg:req.flash('errorMessage')} )
   
    
    // Pass errorMessage to the template
  }

  exports.blocked=async (req,res,next)=>{
    if (req.session.user) {
      
      const user = req.session.user;
      const email = user.email;
      const usr = await User.findOne({ email });

      if (usr.blocked === true) {
        console.log('welcome');
        req.flash('errorMessage', `Sorry ${user.name},Your account has been blocked`);
        return res.redirect('/login'); // Add return here to end the function
      }
  }else{
    next()
  }
  }
  }



exports.logged = (req, res, next) => {
  if (req.session.adm) {
   
    console.log('sf',req.session.adm)
    next() // Redirect to the dashboard if the user is logged in
  } else {
    res.render('admin/adm-login',{msg:req.flash('msg')}); // Continue to the next middleware if the user is not logged in
  }
};
exports=async(req,res,next)=>{
  try{
    if(req.session.adm){
      res.redirect('/admin/admin-ho')
      
    }else{
      next()
    }
  }catch(error){
    console.log(error)
  }
}
   
    
  //   // Pass errorMessage to the template
  // }
// exports.isBlocked = (req, res, next) => {
//   const user = req.session.user;

//   // Check if the user is blocked
//   if (user && user.blocked) {
//     // Clear the session or handle as needed
//    isBlocked = true;
//     req.session.destroy();
//     return res.redirect('/login');
//   } else {
//    isBlocked = false;
//   }

//   // User is not blocked, continue to the next middleware/route handler
//   next();
// };

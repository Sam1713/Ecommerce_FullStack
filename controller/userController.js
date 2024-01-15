const express = require('express');
const session = require('express-session');
const flash=require('express-flash')
const { MongoClient } = require('mongodb');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');


const User = require('../models/userModel');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Address=require('../models/addressModel')
const Order=require('../models/orderModel')
const Banner = require('../models/bannerModel');


const disableCache = (req, res, next) => {
  console.log('disableCache middleware');
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.header('Expires', '-1');
  res.header('Pragma', 'no-cache');
  next();
};



const error=(req,res)=>{
  res.render('errorPage/error')
}
const renderLogin = async (req, res) => {
  
  console.log('/login route handler');
  const successMessage=req.flash('successMessage')
  const errorMessage = req.flash('errorMessage');
  if (errorMessage.length > 0 || successMessage>0) {
    return res.render('user/login', { msg: errorMessage,successMessage });
  }


  if (req.session.user) {
    // If the user is already logged in, redirect to '/home'
    return res.redirect('/home');
  }

};



const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      if (user.blocked) {
        console.log(user);
        req.flash('errorMessage', 'Sorry, your account has been blocked');
        return res.redirect('/login');
      } else {
      
        // Set session user
        req.session.user = user;
        console.log('req.session',req.session)
        console.log('Session user set:', req.session.user);
        console.log('User logged in. Session ID:', req.sessionID);
        
        // Redirect to home
        return res.redirect('/home');
      }
    } else if (!user) {
      req.flash('errorMessage', 'Email is not valid');
      return res.redirect('/login');
    } else if (user.password != password) {
      req.flash('errorMessage', 'Password is not valid');
      return res.redirect('/login');
    }
  } catch (error) {
    console.error('Error logging in:', error);
    return res.redirect('/error');
  }
};

const renderSignup = (req, res) => {
  res.render('user/signup',{msg:req.flash('errorMessage')});
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
  return passwordRegex.test(password);
};

let otpStorage = {};

const signup = async (req, res) => {
  try {
    const { name, email, number, password } = req.body;

    if (!validateEmail(email)) {
      req.flash('errorMessage','Invalid email');
        return res.redirect('/signup')
    }

    if (!validatePassword(password)) {
      req.flash('errorMessage','Invalid Password');
       return res.redirect('/signup')
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      req.flash('errorMessage', 'User already exists');
      return res.redirect('/signup');
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    console.log('Generated OTP:', otp);

    otpStorage[email] = { otp, name, number, password };
    console.log('Stored OTP:', otpStorage[email]);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'samsaju399@gmail.com',
        pass: 'yrwi nnrp gjtr qits',
      },
    });

    await transporter.sendMail({
      from: 'samsaju399@gmail.com',
      to: email,
      subject: 'Registration OTP',
      text: `Your OTP for registration is ${otp}`,
    });

    res.redirect(`/match-otp?email=${encodeURIComponent(email)}`);
  } catch (error) {
    console.error('Error signing up:', error);
    res.locals.error_messages = ['An unexpected error occurred'];
    return res.render('user/signup');
  }
};

const renderMatchOTP = (req, res) => {
  const { email } = req.query;

  if (email) {
    res.render('user/signup-otp', { email });
  } else {
    res.send('Invalid request');
  }
};

const matchOTP = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const storedData = otpStorage[email];

    if (!storedData) {
      console.log('User data not found');
      res.send('User data not found');
      return;
    }

    console.log('Request received. Email:', email, 'OTP:', otp);
    console.log('Stored OTP:', storedData.otp);

    if (otp == storedData.otp) {
      console.log('Entered OTP matches Stored OTP');

      const hashedPassword = await bcrypt.hash(storedData.password, 10);
      const newUser = new User({
        email,
        name: storedData.name,
        password: hashedPassword,
        number: storedData.number,
      });

      await newUser.save();

      delete otpStorage[email];
      res.json(`${email} is successfully registered`);
    } else {
      console.log('Entered OTP does not match Stored OTP');

      res.send('Invalid OTP');
    }
  } catch (error) {
    console.error('Error matching OTP:', error);
    res.send('Internal Server Error');
  }
};
const PAGE_SIZE = 8; 
const renderHome = async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

   // Number of products per page

    if (req.session.user) {
      const user = req.session.user;
      const email = user.email;
      const usr = await User.findOne({ email });

      if (user.blocked === true) {
        console.log('welcome');
        req.flash('errorMessage', `Sorry ${user.name},Your account has been blocked`);
        return res.redirect('/login'); // Add return here to end the function
      }

      const page = req.query.page || 1; // Get the page number from query parameters or default to 1

      let banners = await Banner.find({ banner_status: true });
      banners[0] = {
        new: 'active',
        image: {
          filename: banners[0].image.filename,
        },
        reference: banners[0].reference,
      };

      const totalProducts = await Product.countDocuments();
      const totalPages = Math.ceil(totalProducts / PAGE_SIZE);

      const products = await Product.find()
        .skip((page - 1) * PAGE_SIZE) // Calculate the number of documents to skip based on the page number
        .limit(PAGE_SIZE); // Limit the number of documents to retrieve

      const categories = await Category.find();
      const isHomePage=true

      res.render('user/home', {
        isHomePage,
        products,
        categories,
        banners,
        msg: req.flash('errorMessage'),
        currentPage: parseInt(page),
        totalPages,
      });
    }
  } catch (error) {
    console.error('Error rendering home:', error);
    req.flash('errorMessage', 'An unexpected error occurred');
    res.redirect('/error');
  }
};



 
const logout = async (req, res) => {
  try {
    if (req.session.user) {
      console.log('dsfsf')
      console.log('user',req.session.user)
     delete req.session.user;
      
    }
    res.redirect('/login');
  } catch (error) {
    res.redirect('/error');
  }
};



const renderforgotPassword = async(req, res) => {
 
res.render('user/forgot passowrd');
};


const sendOtpForPassword = async (req, res) => {
  console.log('sdfdsf')
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.send({ error: 'User not found' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'samsaju399@gmail.com',
        pass: 'yrwi nnrp gjtr qits',
      },
    });

    const randomNum = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
const otpExpirationTime = new Date();
otpExpirationTime.setMinutes(otpExpirationTime.getMinutes() + 1);

// Update the user's OTP properties and save to the database
user.otp = {
  code: randomNum,
  expirationTime: otpExpirationTime,
  generationTime: new Date(),
};

await user.save();



    const mailDetails = {
      from: 'samsaju399@gmail.com',
      to: email,
      subject: 'Your OTP for App',
      html: `<p>Dear User,</p>
        <p>Your OTP is: <strong>${randomNum}</strong></p>
        <p>OTP will expire at: ${otpExpirationTime.toLocaleString()}</p>
        <p>Please use this OTP within the next minute to complete your authentication.</p>
        <p>Thank you,</p>
        <p>[Your Company/Organization Name]</p>`,
    };

    transporter.sendMail(mailDetails, (error, info) => {
      if (error) {
        console.log('Error sending email:', error);
        return res.send({ error: 'Error sending email' });
      } else {
        res.redirect(`/verify-password?email=${email}`);
      }
    });
  } catch (error) {
    console.error(error);
    return res.redirect('/error');
  }
};


const verifyPassword= async (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.send({ error: 'Email parameter is missing' });
  }

  try {
    const user = await User.findOne({ email });
    const otpExpirationTime = user.otp.expirationTime;
    res.render('user/verify-password', { email, user,otpExpirationTime,msg:req.flash('errorMessage')});
  } catch (error) {
    console.error(error);
    return res.redirect('/error');
  }
};
const verifyPasswordOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    console.log('Email:', email);
    console.log('Submitted OTP:', otp);
    const user = await User.findOne({ email });

    console.log('User from DB:', user);

    if (!user) {
      return res.send({ error: 'User not found' });
    }

    // Check if the OTP has expired
    const currentTime = new Date();
    if (user.otp.expirationTime && currentTime > user.otp.expirationTime) {
      console.log('OTP has expired');
      // Clear the expired OTP
      user.otp = {
        code: null,
        expirationTime: null,
        generationTime: null,
      };
      await user.save();
      req.flash('errorMessage', 'OTP has expired');
      return res.redirect(`/verify-password?email=${user.email}`);
        }


    if (user.otp.code !== parseInt(otp, 10)) {
      return res.send({ error: 'Invalid OTP' });
    }

    user.isVerified = true;
    // Clear the OTP after successful verification
    user.otp = {
      code: null,
      expirationTime: null,
      generationTime: null,
    };
    await user.save();

    if (user.blocked) {
      return res.send({ message: `${user.email} is blocked` });
    }

    if (user) {
      res.redirect(`/confirm-password?email=${email}`);
    }
  } catch (error) {
    console.error(error);
    return res.redirect('/error');
  }
};

const resendOTP = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.send({ error: 'User not found' });
    }

    if (user.isVerified) {
      return res.send({ message: 'User is already verified' });
    }

    // Generate a new OTP and set the expiration time
    const randomNum = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
    const otpExpirationTime = new Date();
    otpExpirationTime.setMinutes(otpExpirationTime.getMinutes() + 1);

    // Update the user's OTP properties and save to the database
    user.otp = {
      code: randomNum,
      expirationTime: otpExpirationTime,
      generationTime: new Date(),
    };

    await user.save();


    // Send the new OTP via email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'samsaju399@gmail.com',
        pass: 'yrwi nnrp gjtr qits',
      },
    });

    const mailDetails = {
      from: 'samsaju399@gmail.com',
      to: email,
      subject: 'Your New OTP for App',
      html: `<p>Dear User,</p>
        <p>Your new OTP is: <strong>${randomNum}</strong></p>
        <p>OTP will expire at: ${otpExpirationTime.toLocaleString()}</p>
        <p>Please use this OTP within the next minute to complete your authentication.</p>
        <p>Thank you,</p>
        <p>[Your Company/Organization Name]</p>`,
    };

    transporter.sendMail(mailDetails, (error, info) => {
      if (error) {
        console.log('Error sending email:', error);
        return res.send({ error: 'Error sending email' });
      } else {
        res.redirect(`/verify-password?email=${email}`);
      }
    });
  } catch (error) {
    return res.redirect('/error');
  }
};

// Add this route to your express app



const confirmPassword=async(req,res)=>{
  const email = req.query.email;
  if (!email) {
    return res.send({ error: 'Email parameter is missing' });
  }

  try {
    const user = await User.findOne({ email });
    res.render('user/confirm-password', { email, user });
  } catch (error) {
    return res.redirect('/error');
  }
}

const newPassword = async (req, res) => {
  try {
    const userId = req.params.id;
    const { password } = req.body;

    // Retrieve the user's information from your database based on the email
    const storedData = await User.findById(userId);

    if (storedData) {
      // Hash the new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update the user's password in the database
      storedData.password = hashedPassword;
      await storedData.save();
      req.flash('successMessage', `password changed successfully`);
      return res.redirect('/login');

      // Redirect to the login page after a successful password update
      return res.redirect('/login');
    }

    res.status(404).send('User not found');
  } catch (error) {
    console.error('Error updating password:', error);
    res.redirect('/error');
  }
};

const renderOTPVerify = async(req, res) => {

  res.render('user/otp-verify');
};




const calculateQuantity = (req) => {
  return req.query.quantity || 1; 
};

const renderProductDetail = async (req, res) => {
  try {
    if (req.session.user) {
      const user = req.session.user;
      const productId = req.params.id;
      const selectedQuantity = calculateQuantity(req);

      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.redirect('Invalid product ID');
      }

      const product = await Product.findById(productId).populate('category');

      if (!product) {
        return res.send('Product not found');
      }
      console.log('prod',product)

      let discountedPrice = null;
      let discount = null;
      let offerStartDate = null;
      let offerEndDate = null;

      if (product.offers && product.offers.length > 0) {
        const offer = product.offers[0];
        discount = offer.discount;

        const currentDate = new Date();
        if (offer.startDate <= currentDate && currentDate <= offer.endDate) {
          // Calculate discounted price only if the offer is valid
          discountedPrice = product.price - (product.price * (discount / 100));
          offerStartDate = offer.startDate;
          offerEndDate = offer.endDate;
        }
      }

      if (product.offers && product.offers.length > 0) {
        product.offers[0].discountedPrice = discountedPrice;
        await product.save();
      }
      const isHomePage = false

      // Include offerStartDate and offerEndDate in the rendering context
      return res.render('user/prod-detail', {
        isHomePage,
        user,
        product,
        productId,
        discountedPrice,
        discount,
        offerStartDate,
        offerEndDate,
      });
    } else {
      res.redirect('/login');
    }
  } catch (error) {
    res.redirect('/error');
  }
};




const renderUse = async (req, res) => {
  try {
    if (req.session.user) {
       
      const user = req.session.user;
      const productId = req.params.id;  // Get the productId
   

      const userId = await User.findById(updateUser);

     
      res.render('user/prod-detail', { user, productId, msg:req.flash('errorMessage')   });
    } else {
      console.log('User not logged in. Redirecting to login.');
      res.redirect('/login');
    }
  } catch (error) {
    console.error('Error in renderUse:', error);
    res.redirect('/error');
  }
};




const renderUserProfile = async (req, res) => {
  try {
    if (req.session.user) {
      const use = req.session.user;
      
      const email = use.email;
      const usr = await User.findOne({ email });

      if (usr.blocked === true) {
        console.log('welcome');
        req.flash('errorMessage', `Sorry ${use.name},Your account has been blocked`);
        return res.redirect('/login'); // Add return here to end the function
      }
    }
    const userId = req.session.user;
    const user = await User.findById(userId);
    const addresses=await Address.find()
    if (!user) {
      console.log('User not found');
    }
    const isHomePage = false

    res.render('user/user-profile', { user: user,addresses:addresses,msg:req.flash('errorMessage'),isHomePage  }); // Pass 'user' to the template
  } catch (error) {
    console.log(error);
    res.redirect('/error')
  }
};
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images/user'); // Set your desired upload directory
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now());
  },
});

const upload = multer({ storage: storage });

const updateProfileImage = async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.json({ error: 'User not found' });
    }

    // Delete the existing profile image if it exists
    if (user.profileImage) {
      const imagePath = path.join(__dirname, '..', 'public', 'images', 'user', user.profileImage);

      try {
        await fs.unlink(imagePath); 
      } catch (unlinkError) {
        
      }
    }

    // Update profile image
    user.profileImage = req.file.filename;
    await user.save();

    console.log('User profile image updated successfully');
    res.redirect('/user-profile');
  } catch (error) {
    console.error('Error updating user profile image:', error);
    res.redirect('/error');
  }
};

const renderEditUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.json({ error: 'User not found' });
    }
    const isHomePage = false

    res.render('user/user-profile-edit', { user,isHomePage });
  } catch (error) {
    res.redirect('/error');
  }
};
const updateUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.json({ error: 'User not found' });
    }

    user.name = req.body.name;
    user.email = req.body.email;
    user.number = req.body.number;
    const newPassword = req.body.password;
    if (newPassword) {
      // Hash the new password before saving it
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      user.password = hashedPassword;
    }

    await user.save();

    res.redirect('/user-profile'); // Redirect to the user profile page or wherever you want to redirect after the update
  } catch (error) {
    res.redirect('/error');
  }
};


const add_new_address = async (req, res) => {
  const {
    address_cust_name,
    phone,
    house_name,
    area_street,
    locality,
    town,
    state,
    pincode,
    landmark,
    alternate_phone,
    customer_id,
    address_type,
  } = req.body;
  try {
    // Check if required fields are present
    if (!address_cust_name || !customer_id) {
      throw new Error('address_cust_name and customer_id are required fields');
    }

    // Create the address using the correct field names
    await Address.create({
      address_user_name: address_cust_name,
      user_id: customer_id,
      phone,
      house_name,
      area_street,
      locality,
      town,
      state,
      pincode,
      landmark,
      alternate_phone,
      address_type,
    });

    req.flash('success', 'Address added successfully');
    res.redirect('/my-address');
  } catch (error) {
    // Handle validation errors or other errors
    req.flash('error', 'Error adding address');
    res.redirect('/my-account/my-address');
  }
};

//add new Adress to User from ckeckout
const add_new_address_checkout = async (req, res) => {
  const {
    address_cust_name,
    phone,
    house_name,
    area_street,
    locality,
    town,
    state,
    pincode,
    landmark,
    alternate_phone,
    customer_id,
    address_type,
  } = req.body;

  try {
    // Check if required fields are present
    if (!address_cust_name || !customer_id) {
      throw new Error('address_cust_name and customer_id are required fields');
    }
    // Create the address using the correct field names
    await Address.create({
      address_user_name: address_cust_name,
      user_id: customer_id,
      phone,
      house_name,
      area_street,
      locality,
      town,
      state,
      pincode,
      landmark,
      alternate_phone,
      address_type,
    });
    req.flash('success', 'Address added successfully');
    res.redirect('/my-address');
  } catch (error) {
    // Handle validation errors or other errors
    console.error(error);
    req.flash('error', 'Error adding address');
    res.redirect('/error');
  }
}

//viewAddress
const render_Address = async (req, res) => {
  try {
    let id = req.session.user._id;
    const userData = await User.findById(req.session.user._id)    
    const addresses = await Address.find({ user_id: id, delete: false });
    const isHomePage = false
    res.render('user/myAddress', {
      isHomePage,
      addresses,
      userData: userData, // Assuming userData is a Mongoose document
    });
  } catch (error) {
    res.redirect('/error');
    console.error(error);
  
  }
};



//render edit address form
const render_edit_address = async (req, res) => {
  let id = req.params.id;
  const address = await Address.findOne({ _id: id });
  const isHomePage = false
  
  res.render('user/edit_address', { isHomePage, address })
}


//update user address 
const update_user_address = async (req, res) => {
  let id = req.params.id;
  let data = req.body;
  const updateAddress = await Address.findOneAndUpdate({ _id: id }, data, { new: true });
  req.flash('success', 'address updated successfully');
  res.redirect('/my-address');
}

//delete address 
const delete_address = async (req, res) => {
  const addressId = req.params.id;

  try {
      // Delete the address from the database
      const deletedAddress = await Address.findByIdAndDelete(addressId);

      if (!deletedAddress) {
          // Address not found
          return res.status(404).json({ success: false, message: 'Address not found' });
      }

      res.json({ success: true, message: 'Address deleted successfully' });
  } catch (error) {
      console.error('Error deleting address:', error);
      res.redirect('/error');
  }
};


const wallet=async(req,res)=>{
  const user=req.session.user
  if (user.wallet_history.length > 0) {
    user.wallet_history.reverse();

}
const isHomePage=false
res.render('user/user_wallet',{user,isHomePage})
}










// In your routes







module.exports = {
  disableCache,
  renderLogin,
  login,
  renderSignup,
  signup,
  renderMatchOTP,
  matchOTP,

  renderHome,
  logout,
  renderforgotPassword,
  sendOtpForPassword,
  verifyPassword,
  verifyPasswordOTP,
  confirmPassword,
  newPassword,
  renderOTPVerify,
  resendOTP,

  renderProductDetail,
  renderUse,
  error,
  renderUserProfile,
  renderEditUser,
  updateUser,
  updateProfileImage,
  upload,
  add_new_address,
  update_user_address,
  add_new_address_checkout,
  render_Address,
  render_edit_address,
  updateUser,
  delete_address,
  wallet
  
  
};

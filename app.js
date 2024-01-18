var createError = require('http-errors');
var express = require('express');
const session=require('express-session')
const flash = require('express-flash');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const bcrypt = require('bcrypt');
const multer = require('multer');
const Swal=require('sweetalert')
require('dotenv').config();


const { MongoClient } = require('mongodb')
const MongoStore = require('connect-mongo')
const nodemailer = require("nodemailer");



// eslint-disable-next-line no-unused-vars

var app = express();


// Use middleware to override the HTTP method

const mongoose = require('mongoose');
const connectToDatabase = require('./db/connection');
const User=require('./models/userModel')
const Product=require('./models/productModel.js');
const Order=require('./models/orderModel.js')
const Address=require('./models/addressModel')
const Coupen=require('./models/coupenModel')


// app.use(session({
//   secret: 'yoursecret',
//   resave: false,
//   saveUninitialized: false,
//   store: MongoStore.create({
//     mongoUrl: 'mongodb://127.0.0.1:27017/eshop', // Replace with your MongoDB connection URL
//     collectionName: 'sessions', // Optional: specify the collection name for sessions
//   }),
// }));



//manage session for admin
app.use(session({
  secret: 'secrekeey',
  resave: false,
  maxAge: 1000 * 60 * 60,
  saveUninitialized: true
}))

app.use(flash())

var indexRouter = require('./routes/index');
var adminRouter = require('./routes/admin');
const productRouter = require('./routes/product');
const categoryRouter=require('./routes/category')
const cartRouter=require('./routes/cart')
const orderRouter=require('./routes/order')
const coupenRouter=require('./routes/coupen')
const productSearchRouter = require('./routes/productSearchRoute');
const bannerRouter=require('./routes/bannerRouter')
const salesRouter=require('./routes/salesRouter')



const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/image/product-images');
  },
  filename: function (req, file, cb) {
    cb(null, 'image-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


connectToDatabase();


app.use('/', indexRouter);
app.use('/admin', adminRouter);
app.use('/products', productRouter);
app.use('/categories', categoryRouter);
app.use('/order',orderRouter)
app.use('/cart',cartRouter)
app.use('/coupen',coupenRouter)
app.use('/prod', productSearchRouter);
app.use('/banner',bannerRouter)
app.use('/sales-report', salesRouter);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});


// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

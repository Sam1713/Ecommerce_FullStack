// var express = require('express');
// var router = express.Router();
// const bcrypt=require('bcrypt')
// const User=require('../models/userModel');
// const multer = require('multer');
// const path = require('path');

// const {isLoggedIn,logged} = require('../auth/userAuth');
// const Product=require('../models/productModel');
// const Category = require('../models/categoryModel');



// const disableCache = (req, res, next) => {
//   console.log('disableCache middleware');
//   res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
//   res.header('Expires', '0');
//   res.header('Pragma', 'no-cache');
//   next();
// };
// router.use(disableCache);


// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//       cb(null, 'public/images/product');
//     },
//     filename: function (req, file, cb) {
//       cb(null, 'image-' + Date.now() + path.extname(file.originalname));
//     }
//   });
  
//   const upload = multer({ storage: storage });
  
//   router.get('/add-product',(req,res)=>{
//     res.render('product/add-product')
//   })
  
//   router.post('/add-product', upload.array('images', 5), async (req, res) => {
//     try {
      
//       const { name, category, price, description } = req.body;
//       const productImages = req.files.map(file => file.filename);
//       const newProduct = new Product({
//         name,
//         category,
//         price,
//         description,
//         productImages
//       });
  
     
//       const savedProduct = await newProduct.save();
//       const products = await Product.find();
//       res.redirect('/products/view-products');
//     } catch (error) {
//       console.error(error);
//       res.send({ message: 'Internal Server Error' });
//     }
//   });
//   router.get('/view-products',async (req,res)=>{
//     try{
//     const products=await Product.find()
//     res.render('product/view-products',{products})
//     }catch(error){
//       res.send(error)
//     }
//   })
  
//   router.get('/edit-product/:productId', async (req, res) => {
//     const productId = req.params.productId;
  
//     try {
//       const product = await Product.findById(productId);
  
//       if (!product) {
//         return res.send({ message: 'Product not found' });
//       }
  
//       res.render('product/edit-product', { product });
//     } catch (error) {
//       console.error(error);
//       res.send({ message: 'Internal Server Error' });
//     }
//   });
  
//   router.post('/edit-product/:productId', upload.array('newImages', 5), async (req, res) => {
//     try {
//       const productId = req.params.productId;
//       const { name, category, price, description } = req.body;
  
//       const newImages = req.files.map(file => file.filename);
  
//       const product = await Product.findById(productId);
  
//       if (!product) {
//         return res.send({ message: 'Product not found' });
//       }
//       product.name = name;
//       product.category = category;
//       product.price = price;
//       product.description = description;
  
//       if (newImages.length > 0) {
//         product.productImages = product.productImages.concat(newImages);
//       }
//       await product.save();
//       res.redirect(`/products/view-products`);
//     } catch (error) {
//       console.error(error);
//       res.send({ message: 'Internal Server Error' });
//     }
//   });
//   router.get('/delete-product/:productId', (req, res) => {
//     const productId = req.params.productId;
  
//     Product.findByIdAndDelete(productId)
//       .then(deletedProduct => {
//         if (!deletedProduct) {
//        return res.send({ message: 'Product not found' });
//         }
  
//         res.redirect('/products/view-products');
//       })
//       .catch(error => {
//         console.error(error);
//         res.send({ message: 'Internal Server Error' });
//       });
//   });
  
  
  
  
//   module.exports = router;
  

const express = require('express');
const router = express.Router();
const productController = require('../controller/productController');
const {isLoggedInAdmin} = require('../auth/adminauth');
const {isLoggedIn} = require('../auth/userAuth');



// Add Product
router.get('/add-product',isLoggedInAdmin, productController.renderAddProduct);

router.post('/add-product', productController.upload.array('images', 5), productController.addProduct);

router.get('/search',isLoggedIn, productController.searchProducts);

// View Products
router.get('/view-products',isLoggedInAdmin, productController.viewProducts);

// Edit Product
router.get('/edit-product/:productId',isLoggedInAdmin, productController.editProduct);

router.post('/edit-product/:productId', productController.upload.array('newImages', 5), productController.updateProduct);

// Delete Product
router.get('/delete-product/:productId',isLoggedInAdmin, productController.deleteProduct);
router.get('/category-pro', productController.viewProductsByCategory);

module.exports = router;

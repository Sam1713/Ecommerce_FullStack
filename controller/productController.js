const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const Product = require('../models/productModel');
const categoryController = require('./categoryController');
const Category = require('../models/categoryModel');
const fs = require('fs');
const User=require('../models/userModel')
const Banner = require('../models/bannerModel');



const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images/product');
  },
  filename: function (req, file, cb) {
    cb(null, 'image-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });



categoryController.getAllCategories = async () => {
  try {
    const categories = await Category.find();
    return categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error; // You might want to handle errors appropriately in your application
  }
};

const renderAddProduct = async (req, res) => {
  try {
    // Fetch categories using the category controller
    const categories = await categoryController.getAllCategories();

    // Render the add-product page and pass the categories to the template
    res.render('product/add-product', { categories,msg:req.flash('errorMessage') });
  } catch (error) {
    console.error('Error rendering add-product page:', error);
    res.send('Internal Server Error');
  }
};

const addProduct = async (req, res) => {
  try {
    // Extracting product information from the request body
    const { name, category, price, description, stock,discount, startDate, endDate } = req.body;
    console.log('description', description);

    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const productImages = req.files
      .filter(file => allowedImageTypes.includes(file.mimetype))
      .map(file => file.filename);

    // Checking if there are any valid image files
    if (productImages.length === 0) {
      req.flash("errorMessage","Invalid Image Format")
      return res.redirect('/products/add-product');
    }
    // const hai=req.session.user
    // console.log('fddsf',hai)

    // const userId = req.session.user._id;
    // const existingCartItem = await User.findOne({
    //   _id: userId,
    //   'cart.productId': req.params.productId,
    // });

    // if (existingCartItem) {
    //   res.send({ message: 'Product already in the cart.' });
    //   return;
    // }

    // Check if there is sufficient stock
    const remainingStock = stock - req.body.quantity;
    if (remainingStock < 0) {
      res.send({ message: 'Insufficient stock for this product.' });
      return;
    }

    // Selecting the first image file
    const firstImage = productImages[0];

    const imagePath = path.join('public/images/product', firstImage);

    const newProduct = new Product({
      name,
      category,
      price,
      stock,
      description,
      productImages: [firstImage],
      offers: [{
        discount,
        startDate,
        endDate
    }] // Save only the first image
    });

    // Saving the new product to the database
    const savedProduct = await newProduct.save();

    // Update the stock of the product
    

    // Redirecting to the view-products page
    res.redirect('/products/view-products');
  } catch (error) {
    console.error('Error in addProduct:', error);
    res.send({ message: 'Internal Server Error' });
  }
};
const PAGE_SIZE = 8;
const searchProducts = async (req, res) => {
  
  console.log('hai')
  const { query } = req.query;
  console.log('quer',{query})
  const page = req.query.page || 1
  try {
    let banners = await Banner.find({ banner_status: true });
    banners[0] = {
      new: 'active',
      image: {
        filename: banners[0].image.filename,
      },
      reference: banners[0].reference,
    };

    const products = await Product.find({
      $or: [
        { name: new RegExp(query, 'i') },
      ],
    });

    console.log('pr',products)

    const totalProducts = await Product.countDocuments();
    const totalPages = Math.ceil(totalProducts / PAGE_SIZE); // Assuming PAGE_SIZE is defined
    const isHomePage=false
    const categories = await Category.find();
    res.render('user/home', {
      isHomePage,
      products,
      categories,
      banners,
      msg: req.flash('errorMessage'),
      currentPage: parseInt(page),
      totalPages,
      PAGE_SIZE // Pass totalPages to the template
    });

  } catch (error) {
    console.error('Error searching users:', error);
    res.redirect('/home');
  }
};


const viewProducts = async (req, res) => {
  try {
    const PAGE_SIZE = 4;
    const page = parseInt(req.query.page) || 1;

    // Calculate total count without skipping and limiting
    const totalCount = await Product.countDocuments();
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);
    
    const products = await Product.find().populate('category')
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE);

    res.render('product/view-products', { products, page, PAGE_SIZE, totalCount,totalPages });
    console.log('Products:', products);
  } catch (error) {
    res.send(error);
  }
};



const editProduct = async (req, res) => {
  const productId = req.params.productId;

  try {
    // Use populate to get the category details
    const product = await Product.findById(productId)
    const category=await Category.find()
    console.log('sdfsdf',product)

    if (!product) {
      return res.send({ message: 'Product not found' });
    }

    res.render('product/edit-product', { product,category });
  } catch (error) {
    console.error(error);
    res.send({ message: 'Internal Server Error' });
  }
};
const updateProduct = async (req, res) => {
  try {
    const productId = req.params.productId;
    const { name, price, description, category, stock } = req.body;
    const newImages = req.files.map(file => file.filename);

    // Use populate to get the category details
    const product = await Product.findById(productId).populate('category', 'name');

    if (!product) {
      return res.send({ message: 'Product not found' });
    }

    const existingImages = product.productImages;
    const updatedImages = existingImages.filter(image => !req.body[`removeImage_${image}`]);

    updatedImages.push(...newImages);

    // Update product details
    product.name = name;
    product.price = price;
    product.description = description;
    product.stock = stock;

    // Check if category is provided and not 'undefined'
    if (category !== undefined) {
      // Assuming category is a reference to another model (e.g., Category model)
      product.category = category;
    }

    product.productImages = updatedImages;

    await product.save();

    res.redirect(`/products/view-products`);
  } catch (error) {
    console.error(error);
    res.send({ message: 'Internal Server Error' });
  }
};


const deleteProduct = async (req, res) => {
  const productId = req.params.productId;

  try {
    const deletedProduct = await Product.findByIdAndDelete(productId);
    if (!deletedProduct) {
      return res.send({ message: 'Product not found' });
    }

    res.redirect('/products/view-products');
  } catch (error) {
    console.error(error);
    res.send({ message: 'Internal Server Error' });
  }
};
const viewProductsByCategory = async (req, res) => {
  try {
    const selectedCategory = req.query.category;

    
    const products = selectedCategory
      ? await Product.find({ 'category': selectedCategory }).populate('category','name')
      : await Product.find().populate('category');

    const categories = await Category.find();

    res.render('user/category-pro', { products, categories, selectedCategory });
  } catch (error) {
    console.error('Error rendering home:', error);
    req.flash('errorMessage', 'An unexpected error occurred');
    res.redirect('/login');
  }
};


module.exports = {

  upload,
  renderAddProduct,
  addProduct,
  searchProducts,
  viewProducts,
  editProduct,
  updateProduct,
  deleteProduct,
  viewProductsByCategory
};

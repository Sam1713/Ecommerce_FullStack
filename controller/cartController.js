cartController = require('../controller/cartController');
const Product = require('../models/productModel');
const Address = require('../models/addressModel')
const User = require('../models/userModel')
const Order = require('../models/orderModel')
const Payment = require('../models/paymentModel')
const Swal = require('sweetalert')
const Coupen = require('../models/coupenModel');
const flash = require('connect-flash');

const mongoose = require('mongoose');

const Razorpay = require('razorpay');

const crypto = require('crypto');

var instance = new Razorpay({
  key_id: 'rzp_test_2e8RlQcLpjetq9',
  key_secret: process.env.RAZ_SECRET_KEY,
});

const showCart = async (req, res) => {
  try {
    if (req.session.user) {
      const use = req.session.user;
      const email = use.email;
      const usr = await User.findOne({ email });

      if (usr.blocked === true) {
        console.log('welcome');
        req.flash('errorMessage', `Sorry ${use.name},Your account has been blocked`);
        return res.redirect('/login'); 
      }
    }

    const userId = req.session.user._id;
    const user = await User.findById(userId).populate({
      path: 'cart.productId',
      populate: { path: 'category', model: 'Category' },
    });

    if (!user) {
      return res.json({ error: 'User not found' });
    }
    let totalPrice = 0;

    for (let i = 0; i < user.cart.length; i++) {
      const item = user.cart[i];

      if (item.productId && item.productId.price !== undefined) {
        const priceToConsider = item.productId.offers && item.productId.offers.length > 0
          ? item.productId.offers[0].discountedPrice || item.productId.price
          : item.productId.price;

        totalPrice += priceToConsider * item.quantity;
      } else {
        console.error('Invalid item data:', item);
      }
    }
    const isHomePage = false
    // Render the cart template
    res.render('cart/cart-details', { cart: user.cart, totalPrice, msg: req.flash('errorMessage'),isHomePage });
  } catch (error) {
    return res.redirect('/error');
  }
};




const addToCart = async (req, res) => {
  try {
    if (req.session.user) {
      const use = req.session.user;
      const email = use.email;
      const usr = await User.findOne({ email });

      if (usr.blocked === true) {
        req.flash('errorMessage', `Sorry ${use.name},Your account has been blocked`);
        return res.redirect('/login'); // Add return here to end the function
      }
    }
    const userId = req.params.userId;
    const productId = req.params.productId;


    const prod = await Product.findById(productId);

    // Check if the product is found and has sufficient stock
    if (!prod || prod.stock <= 0) {
      req.flash('errorMessage', 'Sorry,The item is out of stock');

      return res.redirect('/home');
      // Redirect to an appropriate page
    }
    // Find the user by ID and populate the cart with product details
    const user = await User.findById(userId).populate('cart.productId');

    if (!user) {
      return res.json({ error: 'User not found' });
    }

    // Find the product by ID
    const product = await Product.findById(productId);
    if (!product) {
      return res.json({ error: 'Product not found' });
    }
    const discountedPrice = (product.offers && product.offers[0] && product.offers[0].discountedPrice)
      ? product.offers[0].discountedPrice
      : product.price;




    // Check if the product is already in the user's cart
    const existingCartItem = user.cart.find((cartItem) => cartItem.productId && cartItem.productId.equals(product._id));

    if (existingCartItem) {
   
      existingCartItem.quantity += 1;
    } else {
   
      user.cart.push({
        productId: productId,
        quantity: 1,
        name: product.name,     
        price: discountedPrice,
        image: product.productImages[0], 
      });
    }
    await user.save();

    return res.redirect('/cart/cart');
  } catch (error) {
    console.error('Error adding product to cart:', error);
    return res.redirect('/error');
  }
};


const incrementQuantity = async (req, res) => {
  try {
    let userID = req.session.user._id;
    const productId = req.params.productId;
    let user = await User.findOne({ _id: userID });

    // Fetch the product and its stock
    const product = await Product.findOne({ _id: productId });
    const currentQuantity = user.cart.find(item => item.productId._id.toString() === productId.toString());

    if (!product || !currentQuantity) {
      return res.json({
        success: false,
        message: 'Product or quantity not found',
      });
    }

    let currentStock = product.stock;
    let quantity = currentQuantity.quantity;

    if (quantity >= currentStock) {
      
       req.flash('errorMessage', 'Sorry,The item is out of stock');
  
        console.log('working')
        return res.redirect('/cart/cart');
      
    } else {
      const updated = await User.updateOne(
        {
          _id: userID,
          'cart.productId': product._id,
        },
        {
          $inc: {
            'cart.$.quantity': 1,
          },
        }
      );

      if (updated) {
        res.json({
          success: true,
        });
      }
    }
  } catch (error) {
    res.json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};



const decrementQuantity = async (req, res) => {
  let userID = req.session.user._id;
  const productId = req.params.productId;
  let user = await User.findOne({ _id: userID });
  const currentQuantity = user.cart.find((item) => item.productId == productId);
  let quantity = currentQuantity.quantity;

  const updated = await User.updateOne(
    {
      _id: userID,
      "cart.productId": productId,
    },
    {
      $inc: {
        "cart.$.quantity": -1,
      },
    }
  );

  if (updated) {
    res.json({
      success: true,
    });
  }

}


const removeItem = async (req, res) => {
  const userID = req.session.user._id;
  const productId = req.params.productId;

  const updated = await User.updateOne(
    { _id: userID },
    { $pull: { cart: { productId: productId } } }
  );
  if (updated) {
    res.json({
      success: true,
    });
  }
};

const render_checkout = async (req, res) => {
  try {
    let userId = req.session.user._id;
    const address = await Address.find({ user_id: userId, delete: false });
    const user = await User.findById(userId).select('cart');

    // Check if the user's cart is empty
    if (!user || !user.cart || !Array.isArray(user.cart) || user.cart.length === 0) {
      console.log('empty')
      return res.redirect('/cart/cart');
    }
    let offerPrice = 0
    let sellingPrice = [];

    for (let i = 0; i < user.cart.length; i++) {
      let sellingprice;
      let product = await Product.findById(user.cart[i].productId);
      if (product.offers && product.offers.length > 0 && product.offers[0].discountedPrice) {
        offerPrice = product.price - product.offers[0].discountedPrice

        sellingprice = {
          productId: product._id,
          discountedPrice: product.offers[0].discountedPrice,
        };
      } else {
        sellingprice = {
          productId: product._id,
          price: product.price,
        };
      }

      sellingPrice.push(sellingprice);
    }

    let totalAmount = 0;
    for (let i = 0; i < sellingPrice.length; i++) {
      totalAmount += parseInt(sellingPrice[i].discountedPrice || sellingPrice[i].price, 10) * user.cart[i].quantity;
    }

    let coupens = await Coupen.aggregate([{
      $match: {
        start_date: { $lte: new Date() },
        exp_date: { $gte: new Date() },
        is_delete: false,
        $expr: {
          $and: [
            { $ne: ["$max_count", "$used_count"] },
            { $not: { $in: [userId, "$user_list"] } }

          ],
        }
      }
    }]);
    let userData = req.session.user
    let wallet;
    if (totalAmount <= userData.user_wallet) {
      wallet = true;
    } else {
      wallet: false;
    }
    function formatDateString(inputDateString) {
      const dateObject = new Date(inputDateString);

      const year = dateObject.getUTCFullYear();
      const month = String(dateObject.getUTCMonth() + 1).padStart(2, '0');
      const day = String(dateObject.getUTCDate()).padStart(2, '0');

      const formattedDate = `${day}-${month}-${year}`;
      return formattedDate;
    }
    coupens.forEach((e) => {
      e.exp_date = formatDateString(e.exp_date);
    })

    if (req.query.coupen) {
      const total = req.query.total;
      const coupen = await Coupen.findOne({ _id: req.query.coupen });
      if (coupen.min_amount <= total) {
        let discount = coupen.discount;

        totalAmount = totalAmount - (totalAmount * discount / 100);

        return res.json({
          success: true,
          total: totalAmount,
          coupen_id: coupen._id,
          discount: coupen.discount,
          coupen_code: coupen.coupon_code
        });
      } else {
        return res.json({
          success: false,
          min_amount: coupen.min_amount
        });
      }
    }
    const isHomePage = false

    res.render('user/checkout', { userData: req.session.user, coupens, wallet, address, cart: user.cart, totalAmount, offerPrice,isHomePage });
  } catch (error) {
    res.redirect('/error');
  }
};



const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user._id;
     
    if (!req.body.address || !req.body.price) {
      return res.json({ success: false, message: 'Incomplete information provided', showAlert: true });
      
    }
    let status;
    if (req.body.payment_method === 'COD' || req.body.payment_method === 'wallet') {
        status = 'confirmed';
    } else {
        status = 'pending';
    }
    const userData = await User.findById(userId).populate({
      path: 'cart.productId',
      model: 'Product',
    });
   

    const cartList = userData.cart.map((cartItem) => {
      const product = cartItem.productId;
      let discountedPrice = 0;

      // Check if there are offers
      if (product.offers && product.offers.length > 0) {
        for (const offer of product.offers) {
          const currentDate = new Date();

          // Check if the current date is within the offer period
          if (currentDate >= offer.startDate && currentDate <= offer.endDate) {
            // Use the discounted price from the offer
            discountedPrice = offer.discountedPrice;
            break; 
          }
        }
      }

      const price = discountedPrice > 0 ? discountedPrice * cartItem.quantity : product.price * cartItem.quantity;

      return {
        product_id: product._id,
        quantity: cartItem.quantity,
        price: price,
        status: status,
      };
    });


    

    for (const cartItem of userData.cart) {
      const product = cartItem.productId;
      const remainingStock = product.stock - cartItem.quantity;

      if (remainingStock < 0) {
        return res.json({ success: false, message: 'Insufficient stock for one or more products in the cart', showAlert: true });
      }

      const updatedProduct = await Product.findByIdAndUpdate(
        product._id,
        { stock: remainingStock },
        { new: true } 
      );
    }

    const address = await Address.findOne({ _id: req.body.address });

    let totalAmount = cartList.reduce((acc, item) => acc + item.price, 0);

    let items = [];

    if (req.body.coupen !== '') {
      const couponId = new mongoose.Types.ObjectId(req.body.coupen);

      if (status === 'confirmed') {
        let coupon = await Coupen.findByIdAndUpdate(
          { _id: couponId },
          {
            $inc: { used_count: 1 },
            $push: { user_list: userId },
          },
          {
            new: true
          }
        );
      }

      let dicount = req.body.discount;
      let coupen_code = req.body.coupen_code;

      for (let i = 0; i < cartList.length; i++) {
        items.push({
          product_id: cartList[i].product_id,
          quantity: cartList[i].quantity,
          price: (parseInt(cartList[i].price)) - (parseInt(cartList[i].price) * dicount / 100),
          status: status,
        });
      }
    } else {
      for (let i = 0; i < cartList.length; i++) {
        items.push({
          product_id: cartList[i].product_id,
          quantity: cartList[i].quantity,
          price: parseInt(cartList[i].price),
          status: status,
        });
      }
    }

    const order = {
      customer_id: userId,
      items: items,
      address: address,
      status: status,
      payment_method: req.body.payment_method,
      totalAmount: parseInt(req.body.price),
    };

    if (req.body.payment_method === 'COD') {
      const createOrder = await Order.create(order);

      if (createOrder) {
        await User.updateOne({ _id: userId }, { $unset: { cart: 1 } });
        res.json({ success: true, message: 'Order placed successfully', showAlert: true });
      } else {
        res.json({ success: false, message: 'Order placement failed' });
      }
    } else if (req.body.payment_method === 'wallet') {
      const createOrder = await Order.create(order);
      if (createOrder) {
        const user = req.session.user;

        await User.updateOne({ _id: user._id }, { $unset: { cart: '' } });

        const priceValue = parseInt(req.body.price);
        const userWalletValue = user && user.user_wallet !== undefined ? parseInt(user.user_wallet) : 0;

        if (!isNaN(userWalletValue)) {
        } else {
          console.error('Invalid user_wallet value:', user.user_wallet);
        }
        const newHistoryItem = {
          amount: parseInt(req.body.price),
          status: "Debit",
          time: Date.now(),
        };

        const updatedUser = await User.findByIdAndUpdate(
          { _id: user._id },
          { $push: { wallet_history: newHistoryItem } },
          { new: true }
        );

        res.json({
          success: true
        });
      }
    } else {
      const createOrder = await Order.create(order);
      let total = parseInt(req.body.price);
      let orderId = createOrder._id;

      let user = await User.findById(req.session.user._id);

      // Create an order for razorpay
      const Razorder = await createRazOrder(orderId, total).then((order) => order);

      const timestamp = Razorder.created_at;
      const date = new Date(timestamp * 1000); // Convert the Unix timestamp to milliseconds

      // Format the date and time
      const formattedDate = date.toISOString();

      // Create an instance for payment details
      let payment = new Payment({
        payment_id: Razorder.id,
        amount: parseInt(Razorder.amount) / 100,
        currency: Razorder.currency,
        order_id: orderId,
        status: Razorder.status,
        created_at: formattedDate,
      });

      // Save in the database
      await payment.save();

      res.json({
        status: true,
        order: Razorder,
        user
      });
    }
  } catch (err) {
    res.send(err.message);
  }
}

//create razorpay order 
const createRazOrder = (orderId, total) => {
  return new Promise((resolve, reject) => {
    let options = {
      amount: total * 100,  // amount in the smallest currency unit
      currency: "INR",
      receipt: orderId.toString()
    };
    instance.orders.create(options, function (err, order) {
      if (err) {
        console.log(err)
      }
      resolve(order);
    });
  })

}


//verifying payment
const verifyPaymenet = async (req, res) => {
  const hmac = crypto.createHmac("sha256", process.env.RAZ_SECRET_KEY);
  hmac.update(req.body.razorpay_order_id + "|" + req.body.razorpay_payment_id);
  let generatedSignature = hmac.digest("hex");
  let isSignatureValid = generatedSignature === req.body.razorpay_signature;

  if (isSignatureValid) {
    let customer_id = req.session.user._id;

    let items = req.session.user.cart;
    for (let i = 0; i < items.length; i++) {
      await Product.updateOne({ _id: items[i].product_id }, { $inc: { stock: -(items[i].quantity) } });
    }


    await User.updateOne({ _id: customer_id }, { $unset: { cart: '' } })
    let paymentId = req.body.razorpay_order_id;
    const orderID = await Payment.findOne({ payment_id: paymentId }, { _id: 0, order_id: 1 });
    const order_id = orderID.order_id;
    const updateOrder = await Order.updateOne({ _id: order_id }, { $set: { 'items.$[].status': 'confirmed', status: 'confirmed' } });
    let couponId = await Order.findOne({ _id: order_id }, { coupon: 1, _id: 0 });
    if (couponId && couponId.coupon && couponId.coupon.coupon_id) {
      couponId = couponId.coupon.coupon._id;
      if (couponId) {
        let updateCoupon = await Coupen.findByIdAndUpdate(
          { _id: couponId },
          {
            $inc: { used_count: 1 },
            $push: { user_list: customer_id },
          },
          {
            new: true
          }
        );
      }
    }

    req.session.order = {
      status: true
    }
    res.json({
      success: true
    })
  }
}


const order_success = async (req, res) => {
  let user_id = new mongoose.Types.ObjectId(req.session.user._id);
  let order = await Order.aggregate([
    {
      $match: {
        customer_id: user_id
      }
    },
    {
      $sort: {
        createdAt: -1
      }
    },
    {
      $limit: 1
    }
  ]);
  let order_id = order[0]._id;
  res.render('user/order-success', { order: order_id });
}


const verify_order = (req, res, next) => {
  let order = req.session.order;
  if (order) {
    res.redirect('/');
  } else {
    next();
  }
}

module.exports = {
  showCart,
  addToCart,
  incrementQuantity,
  decrementQuantity,
  removeItem,
  render_checkout,
  createRazOrder,
  verifyPaymenet,
  placeOrder,
  verify_order,
  order_success
}
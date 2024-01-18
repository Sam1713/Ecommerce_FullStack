const bcrypt = require('bcrypt');
const User = require('../models/userModel');
const Product = require('../models/productModel');
const flash=require('express-flash')
const Order=require('../models/orderModel')
const mongoose = require('mongoose');
const Return = require('../models/returnSchema');
const { logged } = require('../auth/userAuth');
const session = require('express-session');


const renderAdminLogin = async (req, res) => {
    
    res.render('admin/adm-login', { msg: req.flash('msg') });
  };
  


  const adminLogin = (req, res) => {
      const name = 'sam';
      const pass = 'admin@123';
      const { username, password } = req.body;
  
      if (username === name && password === pass) {
          // Set session admin with user type
       
          req.session.isAdminLoggedIn=true
  
          res.redirect('/admin/admin-ho');
      } else {
          req.flash('msg', 'something went wrong');
          return res.redirect('/admin/adm-login');
      }
  };
  
  
const render_dharboard = async (req, res) => {


  let sales = await Order.aggregate([
      {
          $match: {
              "items.status": "Delivered"
          }
      }
  ]);
  let totalRevenew = 0;
  sales.forEach((sale) => {
      totalRevenew += sale.totalAmount;
  });
  const currentYear = new Date().getFullYear();

  let yearsArray = [];
  for (let year = currentYear; year >= 2022; year--) {
      yearsArray.push(year);
  }

  const custommers = (await User.find({ blocked: false })).length;
  const products = (await Product.find({ deleted: false })).length
  try {
      let orders = await Order.aggregate([

          {
              $lookup: {
                  from: 'users',
                  localField: 'customer_id',
                  foreignField: '_id',
                  as: 'user'
              }
          },
          {
              $unwind: '$user'
          },
          {
              $unwind: '$items'
          },
          {
              $lookup: {
                  from: 'products',
                  localField: 'items.product_id',
                  foreignField: '_id',
                  as: 'product'
              }
          },
          {
              $unwind: '$product'
          },
          {
              $project: {
                  _id: 1,
                  'user.name': 1,
                  'product.name': 1,
                  address: 1,
                  items: 1,
                  total_amount: 1,
                  createdAt: 1,
                  payment_method: 1
              }
          }
      ]);

      const queryParams = req.query;

      // Filter by day if "day" query parameter is provided
      if (queryParams.day !== undefined && queryParams.day !== "") {
          const day = new Date();
          orders = orders.filter((order) => {

              const orderDay = new Date(order.createdAt).setHours(0, 0, 0, 0);
              return orderDay >= day.setHours(0, 0, 0, 0);
          });
      }

      // to get the start and end of the month
      function getStartAndEndOfMonth() {
          const today = new Date();
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          return { startOfMonth, endOfMonth };
      }

      if (queryParams.month !== undefined && queryParams.month !== "") {
          const { startOfMonth, endOfMonth } = getStartAndEndOfMonth();
          orders = orders.filter((order) => {
              const orderDate = new Date(order.createdAt);
              return orderDate >= startOfMonth && orderDate <= endOfMonth;
          });
      }

      // get the start and end of the week
      function getStartAndEndOfWeek() {
          const today = new Date();
          const startOfWeek = new Date(today);
          startOfWeek.setHours(0, 0, 0, 0);
          startOfWeek.setDate(today.getDate() - today.getDay());
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 7);
          return { startOfWeek, endOfWeek };
      }

      if (queryParams.week !== undefined && queryParams.week !== "") {
          const { startOfWeek, endOfWeek } = getStartAndEndOfWeek();
          orders = orders.filter((order) => {
              const orderDate = new Date(order.createdAt);
              return orderDate >= startOfWeek && orderDate < endOfWeek;
          });
      }
      res.render('admin/admin-ho', { custommers, orders, products, totalRevenew, yearsArray});

  } catch (err) {
      res.send(err.message)
  }
}

// get dashboard Items
const getGraphDetails = async (req, res) => {

  const sales = await Order.aggregate([
      {
          $match: {
              "items.status": "Delivered"
          }
      }
  ]);
//   console.log('det',sales)
  const monthlyRevenue = Array(12).fill(0);
  let year = req.query.year;
  if (year) {
      year = parseInt(year);
  } else {
      year = new Date().getFullYear();
  }
  console.log('year',year)

  sales.forEach((sale) => {
      if (sale.items && sale.items.length > 0) {
          const saleYear = new Date(sale.createdAt).getFullYear();
          if (year === saleYear) {
              sale.items.forEach((item) => {
                  const deliveredOn = new Date(item.delivered_on);
                  const month = deliveredOn.getMonth();
                  const totalAmount = sale.totalAmount;
                  monthlyRevenue[month] += totalAmount;
              });
          }
      }
  });
  res.json({
      success: true,
      data: monthlyRevenue
  });
}




const renderDashboard = async (req, res) => {
{
    try {

        const PAGE_SIZE = 4;
        const page = parseInt(req.query.page) || 1;
    
        // Calculate total count without skipping and limiting
        const totalCount = await User.countDocuments();
        
    
        const users = await User.find({})
          .skip((page - 1) * PAGE_SIZE)
          .limit(PAGE_SIZE);
    
      res.render('admin/dashboard', { users,totalCount,PAGE_SIZE,page });
    } catch (error) {
      res.send(`Error fetching users: ${error.message}`);
    }
  } 
};

const logouttt = (req, res) => {

   
        try{
            req.session.isAdminLoggedIn=false
          
          res.redirect('/admin/adm-login')
        }catch(error){
          console.log(error)
        }
    }
      
    

const searchUsers = async (req, res) => {
  const { query } = req.query;
  try {
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ],
    });
    res.render('admin/dashboard', { users });
  } catch (error) {
    res.redirect('/admin/dashboard');
  }
};

const unblockUser = async (req, res) => {
  try {
    const userId = req.params.id;
    await User.findByIdAndUpdate(userId, { blocked: false });
    res.redirect('/admin/dashboard');
  } catch (error) {
    res.send('Error unblocking user');
  }
};

const blockUser = async (req, res) => {
  try {
    const userId = req.params.id;
    await User.findByIdAndUpdate(userId, { blocked: true });
    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error(error);
    res.send('Error blocking user');
  }
};




const getUsers = async (req, res) => {
  try {
    
    const users = await User.find();
    res.render('admin/order-user', { users });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};

// Assuming you have a route like '/admin/orders/:userId'
const userOrderPage= async (req, res) => {
  try {
    const userId = req.params.userId;
    // Fetch orders related to the userId
    const user = await Order.find({ customer_id: userId });
    const orderDetails=user

    // Render the order details page
    res.render('admin/orderDetails', {  orderDetails,user,userId});
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};

const get_orders = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const PAGE_SIZE = 6;
    const totalOrders = await Order.countDocuments();
    const totalPages = Math.ceil(totalOrders / PAGE_SIZE);

    const orders = await Order.find()
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE);
   

  const userId=req.session.userId
 
 let orde = await Order.aggregate([
    {
        $project: {
            _id: 1,
            customer_id: 1,
            items: 1,
            address: 1,
            payment_method: 1,
            status: 1,
            createdAt: 1,
            
        }
    },

    {
        $unwind: { path: '$items' }
    }])
  let orderDetails = await Order.aggregate([
        {
            $project: {
                _id: 1,
                customer_id: 1,
                items: 1,
                address: 1,
                payment_method: 1,
                status: 1,
                createdAt: 1,
                
            }
        },
        {
            $unwind: { path: '$items' }
        },
        {
            $lookup: {
                from: 'products',
                localField: 'items.product_id',
                foreignField: '_id',
                as: 'products'
            }
        },
        {
            $unwind: { path: '$products' }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'customer_id',
                foreignField: '_id',
                as: 'userName'
            }
        },
        {
            $unwind: { path: '$userName' }
        },
        {
            $project: {
                _id: 1,
                'userName.name': 1,
                'products.name': 1,
                items: 1,
                address: 1,
                payment_method: 1,
                status: 1,
                createdAt: 1,
                
            }
        },
        {
            $sort: {
              createdAt: -1,
            },
          },
          {
            $skip: (page - 1) * PAGE_SIZE,
          },
          {
            $limit: PAGE_SIZE,
          },
    ]);
    const user=await User.findById(userId)

  orderDetails.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB - dateA;
  });

  orderDetails.forEach(obj => {
      if (obj?.createdAt) {
          obj.createdAt = formatDate(obj.createdAt);
      }
  });

  function formatDate(date) {
      const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
      return new Date(date).toLocaleDateString(undefined, options);
  }



  



res.render('admin/orderDetails', {
    success: req.flash('success')[0],
    error: req.flash('error')[0],
    orderDetails,
    orderDetails,
    user,
    currentPage: page,
    totalPages,
    PAGE_SIZE
  });
}

const render_change_order_status = async (req, res) => {
  
  
  // Use the mongoose.Types.ObjectId directly
  let product_id = new mongoose.Types.ObjectId(req.query.productId);
  let order_id = new mongoose.Types.ObjectId(req.query.orderId);
  let order = await Order.aggregate([
      {
          $match: {
              _id: order_id,
              'items.product_id': product_id
              
          }
      },
      {
          $project: {
              _id: 1,
              customer_id: 1,
              items: 1,
              address: 1,
              payment_method: 1,
              status: 1,
              createdAt: 1,
              totalAmount:1
          }
      },
      {
          $unwind: { path: '$items' }
      },
      {
          $lookup: {
              from: 'products',
              localField: 'items.product_id',
              foreignField: '_id',
              as: 'product'
          }
      },
      {
          $unwind: { path: '$product' }
      },
      {
          $lookup: {
              from: 'users',
              localField: 'customer_id',
              foreignField: '_id',
              as: 'user'
          }
      },
      {
          $unwind: { path: '$user' }
      },
      {
          $project: {
              _id: 1,
              'user.name': 1,
          
              'product.name':1,
              'product.productId': 1,
              items: 1,
              address: 1,
              payment_method: 1,
              status: 1,
              createdAt: 1,
              totalAmount:1
          }
      }
  ]);

  order.forEach(obj => {
      if (obj.items && obj.items.quantity && obj.items.price) {
          obj.items.price = obj.items.quantity * obj.items.price;
      }
  });

  let productIdToFind = req.query.productId

  const showOrder = order.find(order => order.items.product_id.toString() === productIdToFind);

  if (showOrder.items.status === "Delivered") {
      showOrder.items.delivered = true;
      showOrder.items.pending = false;
      showOrder.items.out_forDelivery = false;
      showOrder.items.shipped = false;
      showOrder.items.confirmed = false;
  } else if (showOrder.items.status === "pending") {
      showOrder.items.delivered = false;
      showOrder.items.pending = true;
      showOrder.items.out_forDelivery = false;
      showOrder.items.shipped = false;
      showOrder.items.confirmed = false;
  } else if (showOrder.items.status === "confirmed") {
      showOrder.items.delivered = false;
      showOrder.items.pending = false;
      showOrder.items.out_forDelivery = false;
      showOrder.items.shipped = false;
      showOrder.items.confirmed = true;
  } else if (showOrder.items.status === "Shipped") {
      showOrder.items.delivered = false;
      showOrder.items.pending = false;
      showOrder.items.out_forDelivery = false;
      showOrder.items.shipped = true;
      showOrder.items.confirmed = false;
  } else if (showOrder.items.status === "Out for Delivery") {
      showOrder.items.delivered = false;
      showOrder.items.pending = false;
      showOrder.items.out_forDelivery = true;
      showOrder.items.shipped = false;
      showOrder.items.confirmed = false;
  }

  res.render('admin/orderStatus', { admin: true, showOrder })
}

const update_order_status = async (req, res) => {
  let status = req.body.status;
  let order_id = req.params.id;
  let product_id = req.body.product_id;

  if (status === 'Shipped') {

      //updating status if when Item shipped
      const updateOrder = await Order.updateOne({
          _id: order_id,
          'items.product_id': product_id
      }, {
          '$set': {
              'items.$.status': status,
              'items.$.shipped_on': new Date()
          }
      });
      if (updateOrder) {
          req.flash('success', 'Product status Updated Successfully');
          
          res.redirect('/admin/orders');
      }
  } else if (status === 'Out for Delivery') {
      const updateOrder = await Order.updateOne({
          _id: order_id,
          'items.product_id': product_id
      }, {
          '$set': {
              'items.$.status': status,
              'items.$.out_for_delivery': new Date()
          }
      });
      if (updateOrder) {
          req.flash('success', 'Product status Updated Successfully');
          res.redirect('/admin/orders');
      }
  } else if (status === 'Delivered') {
      const updateOrder = await Order.updateOne({
          _id: order_id,
          'items.product_id': product_id
      }, {
          '$set': {
              'items.$.status': status,
              'items.$.delivered_on': new Date()
          }
      });
      if (updateOrder) {
          req.flash('success', 'Product status Updated Successfully');
          res.redirect('/admin/orders');
      }
  } else {
      req.flash('error', 'Product status Updated Successfully');
      res.redirect('/admin/orders');
  }
}


const getNotifications = async (req, res) => {
    const PAGE_SIZE = 8; // You can adjust the page size based on your preference
    const page = parseInt(req.query.page) || 1;
    const totalReturns = await Return.countDocuments();
    const totalPages = Math.ceil(totalReturns / PAGE_SIZE);

    try {
        const returns = await Return.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $unwind: '$user'
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'product_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            {
                $unwind: '$product'
            },
            {
                $project: {
                    _id: 1,
                    'user.name': 1,
                    'product.name': 1,
                    order_id: 1,
                    status: 1,
                    comment: 1,
                    reason: 1
                }
            },
            {
                $skip: (page - 1) * PAGE_SIZE
            },
            {
                $limit: PAGE_SIZE
            }
        ]);

        for (let request of returns) {
            request.return = request.status !== 'pending';
        }

        res.render('admin/return', { returns, page, PAGE_SIZE,totalReturns,totalPages });
    } catch (error) {
        console.error(error);
        res.send(error);
    }
};


// approve request
const aproveRequest = async (req, res) => {
  let return_id = req.params.id;
  const aprove = await Return.findByIdAndUpdate({ _id: return_id }, { $set: { status: 'aproved' } }, { new: true });
  if (aprove) {
      res.json({
          success: true
      })
  }
}

// decline request
const declineRequest = async (req, res) => {
  let return_id = req.params.id;
  const aprove = await Return.findByIdAndUpdate({ _id: return_id }, { $set: { status: 'declined' } }, { new: true });
  if (aprove) {
      res.json({
          success: true
      })
  }
}
const get_invoice = async (req, res) => {
    let product_id = new mongoose.Types.ObjectId(req.query.productId);
    let order_id = new mongoose.Types.ObjectId(req.query.orderId);
    let order = await Order.aggregate([
        {
            $match: {
                _id: order_id,
                'items.product_id': product_id
            }
        },
        {
            $project: {
                _id: 1,
                customer_id: 1,
                items: 1,
                address: 1,
                payment_method: 1,
                status: 1,
                createdAt: 1
            }
        },
        {
            $unwind: { path: '$items' }
        },
        {
            $lookup: {
                from: 'products',
                localField: 'items.product_id',
                foreignField: '_id',
                as: 'product'
            }
        },
        {
            $unwind: { path: '$product' }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'customer_id',
                foreignField: '_id',
                as: 'user'
            }
        },
        {
            $unwind: { path: '$user' }
        },
        {
            $project: {
                _id: 1,
                'user.name': 1,
                'user._id': 1,
                'user.user_email': 1,
                'user.user_mobile': 1,
                'product.name': 1,
                items: 1,
                address: 1,
                payment_method: 1,
                status: 1,
                createdAt: 1
            }
        }
    ]);
    
    order.forEach(obj => {
        if (obj?.createdAt) {
            obj.createdAt = formatDate(obj.createdAt);
        }
    });

    function formatDate(date) {
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
        return new Date(date).toLocaleDateString(undefined, options);
    }

    let productIdToFind = req.query.productId

    const showOrder = order.find(order => order.items.product_id.toString() === productIdToFind);

    function generateRandomInvoiceId() {
        let id = showOrder.items.product_id.toString().slice(3,10);
        const invoiceId = `INV-${id}`;
        return invoiceId;
    }
    const randomInvoiceId = generateRandomInvoiceId();
    showOrder.invoiceId = randomInvoiceId;
    res.render('pdf/invoice', { admin: true, showOrder, Admin: admin })
}




module.exports = {

  renderAdminLogin,
  adminLogin,
  renderDashboard,
  render_dharboard,
  getGraphDetails,
//   redirect_dash,
  logouttt,
  searchUsers,
  unblockUser,
  blockUser,
  getUsers,
  userOrderPage,
  get_orders,
  render_change_order_status,
  update_order_status,
  getNotifications,
  aproveRequest,
  declineRequest,
  get_invoice
};

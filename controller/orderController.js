
const Product = require('../models/productModel');
const Address = require('../models/addressModel')
const User = require('../models/userModel')
const Order = require('../models/orderModel')
const Swal = require('sweetalert')
const mongoose = require('mongoose');
const fs = require('fs')
const puppeteer = require('puppeteer');
const ejs = require('ejs');

const Return = require('../models/returnSchema');


const render_user_orders = async (req, res) => {

    let userId = req.session.user._id;
    let user_id = new mongoose.Types.ObjectId(userId);

    let orderDetails = await Order.aggregate([
        {
            $match: {
                customer_id: user_id,
            },
        },
        {
            $project: {
                _id: 1,
                items: 1,
                address: 1,
                payment_method: 1,
                status: 1,
                createdAt: 1,


            },
        },
    ]);
    orderDetails = orderDetails.reverse();
    const isHomePage = false
    let arr = [];
    for (let i = 1; i < orderDetails.length / 4 + 1; i++) {
        arr.push(i);
    }
    let page = parseInt(req.query.page);
    let skip = (page - 1) * 4
    if (req.query.page) {
        orderDetails = orderDetails.slice(skip, skip + 4);
    } else {
        orderDetails = orderDetails.slice(0, 4);
    }
    let last = arr[arr.length - 1];

    res.render('user/orderPage', { isHomePage, arr, last, orderDetails });
}


const render_orders = async (req, res) => {

    let userId = req.session.user._id;
    let user_id = new mongoose.Types.ObjectId(userId);

    let orderDetails = await Order.aggregate([
        {
            $match: {
                customer_id: user_id,
            },
        },
        {
            $project: {
                _id: 1,
                items: 1,
                address: 1,
                payment_method: 1,
                status: 1,
                createdAt: 1,


            },
        },
    ]);
    orderDetails = orderDetails;
    const isHomePage = false
   
    orderDetails = orderDetails.reverse();
    let arr = [];
    for (let i = 1; i < orderDetails.length / 4 + 1; i++) {
        arr.push(i);
    }
    let page = parseInt(req.query.page);
    let skip = (page - 1) * 4
    if (req.query.page) {
        orderDetails = orderDetails.slice(skip, skip + 4);
    } else {
        orderDetails = orderDetails.slice(0, 4);
    }
    let last = arr[arr.length - 1];

    res.render('user/orderPage', { isHomePage, arr, last, orderDetails });
}




const render_order_details = async (req, res) => {
    try {

        let order_id = new mongoose.Types.ObjectId(req.params.id);

        
        let orderDetails = await Order.aggregate([
            {
                $match: {
                    _id: order_id
                }
            },
            {
                $unwind: "$items"
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.product_id',
                    foreignField: '_id',
                    as: "products"
                }
            },
            {
                $unwind: "$products"
            }
        ]);

        const isHomePage = false


        // Loop through the array and format the dates
        for (const order of orderDetails) {
            switch (order.items.status) {
                case 'confirmed':
                    order.items.track = 15;
                    order.items.ordered = true;
                    order.items.delivered = false;
                    order.items.cancelled = false;
                    order.items.shipped = false;
                    order.items.outdelivery = false;
                    order.items.return = false;
                    order.items.inReturn = false;
                    order.items.needHelp = true;
                    break;
                case 'Shipped':
                    order.items.track = 38;
                    order.items.ordered = true;
                    order.items.delivered = false;
                    order.items.cancelled = false;
                    order.items.shipped = true;
                    order.items.outdelivery = false;
                    order.items.return = false;
                    order.items.inReturn = false;
                    order.items.needHelp = true;
                    break;
                case 'Out for Delivery':
                    order.items.track = 65;
                    order.items.ordered = true;
                    order.items.delivered = false;
                    order.items.cancelled = false;
                    order.items.shipped = true;
                    order.items.outdelivery = true;
                    order.items.return = false;
                    order.items.inReturn = false;
                    order.items.needHelp = true;
                    break;
                case 'Delivered':
                    order.items.track = 100;
                    order.items.ordered = false;
                    order.items.cancelled = false;
                    order.items.shipped = true;
                    order.items.delivered = true;
                    order.items.outdelivery = true;
                    order.items.return = true;
                    order.items.inReturn = false;
                    order.items.needHelp = false;
                    break;
                case 'cancelled':
                    order.items.track = 0;
                    order.items.ordered = false;
                    order.items.cancelled = true;
                    order.items.delivered = false;
                    order.items.shipped = false;
                    order.items.outdelivery = false;
                    order.items.return = false;
                    order.items.inReturn = false;
                    order.items.needHelp = true;
                    break;
                default:
                    order.items.track = 0;
                    order.items.pending = true;
                    order.items.inReturn = false;
            }
        }
        const isInReturn = await Return.findOne({ order_id: order_id });


        if (isInReturn) {
            for (const order of orderDetails) {
                const orderProductId = (order.items.product_id || '').toString();
                const returnProductId = (isInReturn.product_id || '').toString();

                console.log('orderProductId:', orderProductId);
                console.log('returnProductId:', returnProductId);

                if (orderProductId === returnProductId) {
                    order.items.inReturn = true;
                    order.items.return = false;
                    order.items.needHelp = false;
                    order.items.status = isInReturn.status;
                }
            }
        }


        res.render('user/orderdetails', { orderDetails, isHomePage });
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.redirect('/error');
    }}
    const cancel_order = async (req, res) => {
        try {
            const order_id = new mongoose.Types.ObjectId(req.params.order_id);
            const product_id = new mongoose.Types.ObjectId(req.params.product_id);

            const canceledOrder = await Order.findOneAndUpdate(
                { _id: order_id, 'items.product_id': product_id },
                {
                    $set: {
                        'items.$.status': 'cancelled',
                        status: 'cancelled', // Set the order status to 'cancelled'
                    },
                },
                { new: true }
            );

            if (!canceledOrder) {
                return res.json({ success: false, message: 'Order not found' });
            }

            for (const item of canceledOrder.items) {
                // Find the product related to the canceled item
                const product = await Product.findById(item.product_id);

                // Update the stock by adding back the quantity
                product.stock += item.quantity;

                // Save the updated product in the database
                await product.save();
            }

            const user_id = canceledOrder.customer_id; // Change this line based on your actual schema

            if (canceledOrder.payment_method === 'Online Payment' || canceledOrder.payment_method === 'wallet') {
                console.log('payme', canceledOrder.payment_method)
                const walletAmount = canceledOrder.items.reduce((total, item) => total + item.price, 0);
                console.log('dfs', walletAmount)

                // Update user's wallet
                const updatedUser = await User.findByIdAndUpdate(
                    { _id: user_id },
                    { $inc: { user_wallet: walletAmount } },
                    { new: true }
                );

                // Marking in wallet history
                const newHistoryItem = {
                    amount: walletAmount,
                    status: "Credit",
                    time: Date.now(),
                };

                // Push the new wallet history item
                await User.findByIdAndUpdate(
                    { _id: user_id },
                    { $push: { wallet_history: newHistoryItem } }
                );
            }

            // Save the updated order
            await canceledOrder.save();


            res.json({ success: true, message: 'Order cancelled successfully', order: canceledOrder });
        } catch (error) {
            console.error('Error cancelling order:', error);
            res.json({ success: false, message: 'Internal Server Error', error: error.message });
        }
    };

    const get_invoice = async (req, res) => {
        try{
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
                    'user.email': 1,
                    'user.number': 1,
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

    //     let productIdToFind = req.query.productId

    //     const showOrder = order.find(order => order.items.product_id.toString() === productIdToFind);

    //     function generateRandomInvoiceId() {
    //         let id = showOrder.items.product_id.toString().slice(3, 10);
    //         const invoiceId = `INV-${id}`;
    //         return invoiceId;
    //     }
    //     const randomInvoiceId = generateRandomInvoiceId();
    //     showOrder.invoiceId = randomInvoiceId;

    //     // download pdf

    //     const html = fs.readFileSync('./views/pdf/invoice.ejs', 'utf8');

    //     const renderedHtml = ejs.render(html, { showOrder});

    //     const options = {
    //         format: 'A4',
    //         orientation: 'portrait',
    //         border: '600mm',
    //         header: {
    //             height: '5mm',
    //             contents: '<div style="text-align: center;">INVOICE</div>',
    //         },
    //         childProcessOptions: {
    //             env: {
    //                 OPENSSL_CONF: '/dev/null',
    //             },
    //         },
    //     };


    //     const document = {
    //         html: renderedHtml,
    //         data: {
    //             showOrder: showOrder,

    //         },
    //         path: './invoice.pdf',
    //         type: '',
    //     };


    //     console.log('doc', document)

    //     pdf.create(document, options).then(() => {
    //         const pdfStream = fs.createReadStream("invoice.pdf");
    //         res.setHeader("Content-Type", "application/pdf");
    //         res.setHeader("Content-Disposition", `attachment; filename=invoice.pdf`);
    //         pdfStream.pipe(res);
    //         setTimeout(() => {
    //             fs.unlink('./invoice.pdf', (err) => {
    //                 if (err) {
    //                     throw new Error(err.message);
    //                 }
    //             });
    //         }, 5000);
    //     }).catch((error) => {
    //         res.redirect('/error');
    //     });
    // }
    let productIdToFind = req.query.productId;
    const showOrder = order.find(order => order.items.product_id.toString() === productIdToFind);

    // Function to format date
    function formatDate(date) {
      const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
      return new Date(date).toLocaleDateString(undefined, options);
    }

    // Function to generate a random invoice ID
    function generateRandomInvoiceId() {
      let id = showOrder.items.product_id.toString().slice(3, 10);
      const invoiceId = `INV-${id}`;
      return invoiceId;
    }

    const randomInvoiceId = generateRandomInvoiceId();
    showOrder.invoiceId = randomInvoiceId;
 
    const html = await ejs.renderFile('./views/pdf/invoice.ejs', { showOrder });
    // Render the EJS template
    const browser = await puppeteer.launch({
        headless: "new", // Specify the new headless mode
      });
      const page = await browser.newPage();
      await page.setContent(html);
      await page.pdf({
        path: './invoice.pdf',
        format: 'A4',
        margin: {
          top: '5mm',
          right: '0mm',
          bottom: '5mm',
          left: '0mm'
        }
      });
  
      // Close the browser
      await browser.close();

    // Stream the generated PDF as a response
    const pdfStream = fs.createReadStream('./invoice.pdf');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice.pdf`);
    pdfStream.pipe(res);

    // Cleanup: Delete the generated PDF after 5 seconds
    setTimeout(() => {
      fs.unlink('./invoice.pdf', (err) => {
        if (err) {
          console.error(err.message);
        }
      });
    }, 5000);
  } catch (error) {
    console.error(error);
    res.redirect('/error');
  }
}



    const return_order = async (req, res) => {
        let orderId = req.query.order_id;
        let product_id = req.query.product_id;
        let user_id = req.session.user._id;
        let returnDetails = {
            order_id: orderId,
            product_id: product_id,
            user_id: user_id
        }
        const isHomePage=false
        res.render('user/return', { isHomePage,user: true, User: true, returnDetails });
    }

    // retun request post
    const order_return = async (req, res) => {
        let user_id = new mongoose.Types.ObjectId(req.session.user._id);
      
        let retrn = new Return({
            order_id: req.body.order_id,
            user_id: user_id,
            product_id: req.body.product_id,
            reason: req.body.reason,
            status: "pending",
            comment: req.body.comment
        });
        retrn.save()
            .then((retrn) => {
                console.log('Return request saved:', retrn);
            });
        res.json({
            success: true
        });

    }

    module.exports = {
        render_orders,
        render_user_orders,
        render_order_details,
        cancel_order,
        get_invoice,
        return_order,
        order_return
    }
const Product = require('../models/productModel');
const User = require('../models/userModel');
const Category = require('../models/categoryModel');
const { viewProductsByCategory } = require('./productController');


const get_searchedProducts = async (req, res) => {

        console.log('hai');
        console.log('req:', req);

        // Log the query parameters specifically
        console.log('req.query:', req.query);
        let Products = await Product.aggregate([
            {
                $match: {
                    deleted: false,
                    // Add additional conditions if needed
                }
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            {
                $unwind: "$category"
            },
           
        ]);

        console.log('products', Products);
     
    

    let query = req.query.search;
    console.log('sf',query)

    if (query) {
        // searching
        Products = Products.filter((product) => {
            query = query.toLowerCase().replace(/\s/g, '');
            //checking in product name 
            const name = product.name.toLowerCase().replace(/\s/g, '');
            if (name.includes(query)) {
                return true;
            } else if (query.includes(name)) {
                return true;
            }
            console.log('prtr',Products)

            // search in categories 
            const category = product.category.name.toLowerCase().replace(/\s/g, '');
            if (category.includes(query)) {
                return true;
            } else if (query.includes(category)) {
                return true;
            }
        });
    }

    // category filtering
    let category = req.query.category;
    if (category) {
        Products = Products.filter((product) => {
            return category.includes(product.category.name);
        })
    }
    // brand filtering
    // let brand = req.query.brand;
    // if (brand) {
    //     Products = Products.filter((product) => {
    //         return brand.includes(product.brand_name);
    //     })
    // }

    // color filtering
    // let color = req.query.color;
    // if (color) {
    //     Products = Products.filter((product) => {
    //         return color.includes(product.color);
    //     })
    // }

    // price sorting 
    const sortQuery = req.query.sort;
    if (sortQuery === 'low-high') {
        Products.sort((a, b) => {
            const sellingPriceA = parseFloat(a.price);
            const sellingPriceB = parseFloat(b.price);

            if (sellingPriceA < sellingPriceB) {
                return -1;
            } else if (sellingPriceA > sellingPriceB) {
                return 1;
            } else {
                return 0;
            }
        });
    } else if (sortQuery === 'high-low') {
        Products.sort((a, b) => {
            const sellingPriceA = parseFloat(a.price);
            const sellingPriceB = parseFloat(b.price);

            if (sellingPriceA < sellingPriceB) {
                return 1;
            } else if (sellingPriceA > sellingPriceB) {
                return -1;
            } else {
                return 0;
            }
        });
    } else if (sortQuery === 'new-first') {
        Products.sort((a, b) => {
            const createdAtA = new Date(a.createdAt);
            const createdAtB = new Date(b.createdAt);

            if (createdAtA > createdAtB) {
                return -1; 
            } else if (createdAtA < createdAtB) {
                return 1; 
            }
        });
    }

    const userData = req.session.user;
    let cartCount;
    if (userData) {
        cartCount = userData.cart.length
    }
    let user_id = userData._id;
    for (const product of Products) {
        let product_id = product._id;
        let user = await User.findOne({ _id: user_id, 'wish_list.product_id': product_id });

        if (user) {
            product.wish = false;
        } else {
            product.wish = true;
        }
    }
    // finding all categories 
    const categories = await Category.find();
    console.log('car',categories)

    // finding all brands
    // const brands = await Product.find({ delete: false }, { _id: 0, brand_name: 1 });
    // const uniqueSet = new Set();
    // for (const brand of brands) {
    //     uniqueSet.add(brand.brand_name);
    // }
    // const Brands = Array.from(uniqueSet);

    // const colors = await Product.find({ delete: false }, { _id: 0, color: 1 });
    // const uniqueSet1 = new Set();
    // for (const color of colors) {
    //     uniqueSet1.add(color.color);
    // }
    // const Colors = Array.from(uniqueSet1);
    const isHomePage=false
    res.render('user/products', { isHomePage,userData,categories, cartCount, Products})
}

module.exports = {
    get_searchedProducts
}
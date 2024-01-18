const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  
  },
  price: {
    type: Number,
    required: true,
  },
  stock: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  
  productImages: [
    {
      type: String,
      required: true,
    },
  ],
  deleted: {
    type: Boolean,
    default: false,
  },
  offers: [
    {
      discount: {
        type: Number,
        
      },
      startDate: {
        type: Date,
              },

      endDate: {
        type: Date,
        
      },
      discountedPrice: {
        type: Number,
        default: 0,
      },
      
    
    },
  ],

  

  
  // You can add more fields as needed
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;


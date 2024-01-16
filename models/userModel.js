const mongoose = require('mongoose');
const Address = require('../models/addressModel');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  number: {
    type: Number,
    required: true,
    unique: true,
  },
  cart: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
      quantity: {
        type: Number,
        default: 0,
      },
    },
  ],

user_wallet: {
  type: Number,
  required: true,
  default: 0,
},
user_wallet: {
  type: Number,
  required: true,
  default: 0,
},
wallet_history: [
  {
      amount: {
          type: Number
      },
      status: {
          type: String,
          enum: ["Debit", "Credit"]
      },
      time: {
          type:Date
      }
  }
],
  password: {
    type: String,
    required: true,
  },
  
  profileImage: {
    type: String,
  },
  otp: {
    code: {
      type: Number,
      default: null,
    },
    expirationTime: {
      type: Date,
      default: null,
    },
    generationTime: {
      type: Date,
      default: null,
    },
  },
  
  blocked: {
    type: Boolean,
    default: false,
  },
});

const User = mongoose.model('User', userSchema);

module.exports = User;

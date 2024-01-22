const express = require('express');
const router = express.Router();

const {get_searchedProducts} = require('../controller/searchController')

router.get('/',get_searchedProducts);

module.exports = router;
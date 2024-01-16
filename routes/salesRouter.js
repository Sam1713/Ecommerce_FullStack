const express = require('express');
const router = express.Router();
const { isLoggedInAdmin} = require('../auth/adminauth');


const { render_sales_report,
    filter_data } = require('../controller/salesReportController')

router.get('/sales',isLoggedInAdmin, render_sales_report);

router.post('/filter',filter_data)


module.exports = router;
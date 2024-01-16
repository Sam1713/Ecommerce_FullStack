const express = require('express');
const categoryController = require('../controller/categoryController'); 
const router = express.Router();
const {isLoggedInAdmin} = require('../auth/adminauth');




router.get('/add',isLoggedInAdmin, categoryController.renderAddCategory);
router.post('/add-category', categoryController.addCategory);
router.get('/view-category',isLoggedInAdmin, categoryController.renderviewCategory); 
router.get('/edit-category/:id',isLoggedInAdmin,categoryController.rendereditCategory)
router.post('/update-category/:id', categoryController.updateCategory);
router.get('/delete-category/:id',categoryController.renderdeleteCategory)
module.exports = router;


module.exports = router;

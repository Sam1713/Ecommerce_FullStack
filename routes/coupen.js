const express = require('express');
const router = express.Router();
const {isLoggedInAdmin} = require('../auth/adminauth');

//importing functions from conroller
const { render_coupen_page,
       create_new_coupen ,
       render_new_coupen,
       edit_coupen,
       update_coupen,
       delete_coupen} = require('../controller/coupenController');

router.get('/',isLoggedInAdmin,  render_coupen_page);

router.get('/new-coupen', isLoggedInAdmin, render_new_coupen);

router.post('/create-coupen',  create_new_coupen);

router.get('/edit_coupen/:id',isLoggedInAdmin,  edit_coupen);

router.post('/edit-coupen/:id',  update_coupen);

router.get('/delete-coupen/:id',isLoggedInAdmin, delete_coupen);


module.exports = router;
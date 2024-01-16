const express = require('express');

const router = express.Router();
const multer = require('multer');
const path=require('path')
const {isLoggedInAdmin} = require('../auth/adminauth');

const storage1 = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(__dirname, '../public/banners'), (err, success) => {
        if (err) {
          throw new err
        }
      });
    },
  
    filename: function (req, file, cb) {
      const name = Date.now() + '-' + file.originalname;
      cb(null, name, (err, success) => {
        if (err)
          throw new err
      });
    }
  });
  const upload1 = multer({ storage: storage1 });  

const { render_banners_page,
    render_new_banners_page,
    create_new_banner,
    render_edit_banner,
    update_banner,
    delete_banner } = require('../controller/bannerController');

router.get('/',isLoggedInAdmin,  render_banners_page);

router.get('/new-banner',isLoggedInAdmin,  render_new_banners_page);

router.post('/create-banner', upload1.fields([{ name: "banner_image" }]), create_new_banner);

router.get('/edit_banner/:id',isLoggedInAdmin,  render_edit_banner);

router.post('/edit-banner/:id',  upload1.fields([{ name: "banner_image" }]), update_banner);

router.get('/delete-banner',isLoggedInAdmin,  delete_banner);

module.exports = router;
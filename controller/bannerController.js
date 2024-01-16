const Banner = require('../models/bannerModel');
const fs = require('fs');

const render_banners_page = async (req, res) => {
    const banners = await Banner.find();
    // let admin = res.locals.admin;
    // Render banner page
    res.render('banners/banner', {banners});
}

//render new banner page
const render_new_banners_page = async (req, res) => {
    // let admin = res.locals.admin;
    res.render('banners/new_banner');
}

//create new banner
const create_new_banner = async (req, res) => {
    try {
    console.log('hai')
    const banner = new Banner({
        banner_name: req.body.banner_name,
        reference: req.body.reference,
    
        image: {
            filename: req.files.banner_image[0].filename,
            originalname: req.files.banner_image[0].originalname,
            path: req.files.banner_image[0].path,
        }
    });
    const create_banner = banner.save();
    
    if (create_banner) {
        res.json({
            success: true
        })
    }else {
        res.json({
            success: false,
            message: "Failed to create banner."
        });
    }  } catch (error) {
        res.json({
            success: false,
            message: error.message
        });
    }

}

// render edit banner 
const render_edit_banner = async (req, res) => {
    let admin = res.locals.admin;
    const banner = await Banner.findById(req.params.id);
    res.render('banners/edit_banner', { admin: true, banner, Admin: admin });
}

//update banner
const update_banner = async (req, res) => {
    const { banner_name, reference, status, imageName } = req.body;
    let edit_banner = {
        banner_name: banner_name,
        reference: reference,
        banner_status: status === 'true' ? true : false
    }
    if (req.files) {
        edit_banner.image = {
            filename: req.files.banner_image[0].filename,
            originalname: req.files.banner_image[0].originalname,
            path: req.files.banner_image[0].path,
        }

        //deleting old image from the multer
        fs.unlink(`./public/banners/${imageName}`, (err) => {
            if (err) throw err;
        });
    }
    // update banner deatails
    const id = req.params.id
    const update_banner = await Banner.findByIdAndUpdate({ _id: id }, edit_banner, { new: true });

    if (update_banner) {
        res.json({
            success: true
        })
    }
}

// delete banner
const delete_banner = async (req, res) => {
    const id = req.query.id;
    const image = req.query.image;
    // delete banner image from file
    fs.unlink(`./public/banners/${image}`, (err) => {
        if (err) throw err;
    })

    // deleteing banner image from db
    const delete_banner = await Banner.findByIdAndDelete({ _id: id });
    if (delete_banner) {
        res.json({
            success: true
        })
    }
}

module.exports = {
    render_banners_page,
    render_new_banners_page,
    create_new_banner,
    render_edit_banner,
    update_banner,
    delete_banner
}
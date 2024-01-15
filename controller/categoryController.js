const Category = require('../models/categoryModel'); 
const flash=require('express-flash')
const categoryController = {};

categoryController.renderAddCategory = (req, res) => {
  res.render('category/add-category');
};

categoryController.addCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const newCategory = new Category({ name });
    await newCategory.save();
    
    res.redirect('/categories/view-category'); 
  }  catch (error) {
      req.flash('errorMessage', 'Category with the same name already exists.');
      res.redirect('/categories/view-category',)
    } }



categoryController.renderviewCategory=async(req,res)=>{
  const PAGE_SIZE = 4;
  const page = req.query.page || 1;
  const totalCategory = await Category.countDocuments();
  const totalPages = Math.ceil(totalCategory / PAGE_SIZE);

  const categories = await Category.find()
    .skip((page - 1) * PAGE_SIZE) 
    .limit(PAGE_SIZE); 

  res.render('category/view-category',{categories,msg:req.flash('errorMessage'),totalPages,totalCategory,PAGE_SIZE,page})
}

categoryController.rendereditCategory = async (req, res) => {
  try {
      const categoryId = req.params.id;
      const category = await Category.findById(categoryId);

      if (!category) {
          return res.send('Category not found');
      }
      res.render('category/edit-category', { category });
  } catch (error) {
      res.resirect('/error');
  }
};

categoryController.updateCategory = async (req, res) => {
  try {
      const categoryId = req.params.id;
      const { name } = req.body;

      const updatedCategory = await Category.findByIdAndUpdate(
          categoryId,
          { name },
          { new: true } 
      );

      if (!updatedCategory) {
          return res.send('Category not found');
      }
      res.redirect('/categories/view-category');
  } catch (error) {
      res.redirect('/error');
  }
};

categoryController.renderdeleteCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return res.send('Category not found');
    }

    res.redirect('/categories/view-category'); 
  } catch (error) {
    res.redirect('/error');
  }
};

module.exports = categoryController;

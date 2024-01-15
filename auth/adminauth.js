const isLoggedInAdmin = async (req, res, next) => {
    try {
      if (req.session.isAdminLoggedIn) {
        next();
      } else {
        req.flash("error", "Login required to access this page");
        res.redirect("/admin/adm-login");
      }
    } catch (error) {
      console.log(error.message);
      req.flash("error", "Server Error");
      console.log('eror')
    }
  };
  const isLoggedOut = async (req, res, next) => {
    try {
      if (req.session.isAdminLoggedIn) {
        res.redirect("/admin/admin-ho");
      } else {
        next();
      }
    } catch (error) {
      console.log(error.message);
      req.flash("error", "Server Error");
      console.log("error")
    }
  };
  module.exports = {
    isLoggedInAdmin,
    isLoggedOut,
  };
const express = require("express");
const router = express.Router();
const BlogsController = require("../Controllers/blogController");
const { upload } = require("../Middlewares/productuploadMiddleware");
const { authCheck, permissionCheck } = require("../Utils/JWTAuth");


router.post(
  "/createBlogs",
  authCheck, permissionCheck('blog'),
  upload.fields([
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]),
  BlogsController.createBlogs
);

router.get("/blogSlug/:slug", BlogsController.findBlogBySlug);

router.get("/findAllBlogs", BlogsController.findAllBlogs);

router.get("/findOneBlog/:blog_id", authCheck, permissionCheck('blog'), BlogsController.findOneBlog);

router.delete("/deleteBlog/:blog_id",authCheck, permissionCheck('blog'), BlogsController.deleteBlogsById);

router.put(
  "/updateBlog/:blog_id",
  authCheck, permissionCheck('blog'),
  upload.fields([
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]),
  BlogsController.updateBlog
);

module.exports = router;

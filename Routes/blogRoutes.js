const express = require("express");
const router = express.Router();
const BlogsController = require("../Controllers/blogController");

const { authCheck, permissionCheck } = require("../Utils/JWTAuth");
const cloudUploader = require("../Middlewares/upload/cloudUploader");


router.post(
  "/createBlogs",
  authCheck, permissionCheck('blog'),
  cloudUploader("blogs/thumbnails", "image").single("thumbnail"),
  BlogsController.createBlogs
);

router.get("/blogSlug/:slug", BlogsController.findBlogBySlug);

router.get("/findAllBlogs", BlogsController.findAllBlogs);

router.get("/findOneBlog/:blog_id", authCheck, permissionCheck('blog'), BlogsController.findOneBlog);

router.delete("/deleteBlog/:blog_id",authCheck, permissionCheck('blog'), BlogsController.deleteBlogById);

router.put(
  "/update/:blog_id",
  authCheck, permissionCheck('blog'),
  cloudUploader("blogs/thumbnails", "image").single("thumbnail"),
  BlogsController.updateBlog
);

module.exports = router;

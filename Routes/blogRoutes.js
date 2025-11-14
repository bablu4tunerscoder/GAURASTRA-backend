const express = require("express");
const router = express.Router();
const BlogsController = require("../Controllers/blogController");
const { upload } = require("../Middlewares/productuploadMiddleware");

router.post(
  "/createBlogs",
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

router.get("/findOneBlog/:blog_id", BlogsController.findOneBlog);

router.delete("/deleteBlog/:blog_id", BlogsController.deleteBlogsById);

router.put(
  "/updateBlog/:blog_id",
  upload.fields([
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]),
  BlogsController.updateBlog
);

module.exports = router;

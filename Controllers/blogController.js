const blogsModel = require("../Models/blogModel");
const { processMedia } = require("../Middlewares/productuploadMiddleware");
const path = require("path");
 
const { pagination_ } = require("../Utils/pagination_");

// Function to format the slug correctly
const formatSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};
 
// Create Blog API
const createBlogs = async (req, res) => {
  try {
    const {
      blog_title,
      blog_content,
      blog_status,
      blog_published,
      author,
      seo,
    } = req.body;
 
    if (!blog_title || !blog_content || !blog_published || !author || !seo) {
      return res
        .status(400)
        .json({ status: "0", message: "All fields are required." });
    }
    const lastBlogs = await blogsModel
      .findOne()
      .sort({ blog_id: -1 })
      .select("blog_id");
    const newBlogId = lastBlogs ? lastBlogs.blog_id + 1 : 1;
 
    // Handle Slug
    let blog_slug = formatSlug(req.body.blog_slug || blog_title);
    const existingSlug = await blogsModel.findOne({ blog_slug });
    if (existingSlug) {
      blog_slug += `-${newBlogId}`;
    }
    // Parse `seo` JSON string to object
    const parsedSeo = JSON.parse(seo);
 
    // Thumbnail Handling
    // Process Thumbnail
    const thumbnailFile = req.files["thumbnail"]?.[0];
    if (!thumbnailFile) {
      return res
        .status(400)
        .json({ status: "0", error: "Thumbnail is required" });
    }
 
    // **Convert Thumbnail to WebP**
    let webpThumbnailPath;
    try {
      webpThumbnailPath = await processMedia(thumbnailFile.path);
    } catch (error) {
      console.error("Error processing image:", error);
      return res
        .status(500)
        .json({ status: "0", message: "Image processing failed" });
    }
 
    const thumbnail = {
      public_id: thumbnailFile.filename,
      secure_url: webpThumbnailPath,
    };
 
    // Create Blog
    const newBlog = new blogsModel({
      blog_id: newBlogId,
      blog_title,
      blog_content,
      blog_status,
      blog_published,
      thumbnail,
      blog_slug,
      author,
      seo: {
        page_title: parsedSeo.page_title,
        meta_keywords: parsedSeo.meta_keywords,
        meta_description: parsedSeo.meta_description,
      },
    });
 
    await newBlog.save();
    res.status(201).json({
      status: "1",
      message: "Blog created successfully",
      blog: newBlog,
    });
  } catch (error) {
    console.error("Error creating blog:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
 
// Find blog by slug API
const findBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
 
    // Find the blog by slug
    const blog = await blogsModel.findOne({ blog_slug: slug }).lean();
 
    if (!blog) {
      return res.status(404).json({ status: "0", message: "Blog not found" });
    }
 
    res.status(200).json({
      status: "1",
      message: "Blog retrieved successfully",
      data: blog,
    });
  } catch (error) {
    console.error("Error fetching blog:", error);
    res.status(500).json({ status: "0", message: "Internal Server Error" });
  }
};
 
// Find all blogs API
const findAllBlogs = async (req, res) => {
  try {
    // Pagination extract
    const { page, limit, skip, hasPrevPage } = pagination_(req.query, {
      defaultLimit: 10,
      maxLimit: 20,
    });

    // Parallel execution
    const [blogs, totalRecords] = await Promise.all([
      blogsModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      blogsModel.countDocuments(),
    ]);

    if (blogs.length === 0) {
      return res.status(404).json({
        status: "0",
        message: "No blogs found",
      });
    }

    const totalPages = Math.ceil(totalRecords / limit);
    const hasNextPage = page < totalPages;

    res.status(200).json({
      status: "1",
      message: "Blogs retrieved successfully",

      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasPrevPage,
        hasNextPage,
      },

      data: blogs,
    });
  } catch (error) {
    res.status(500).json({
      status: "0",
      message: "Internal Server Error",
    });
  }
};



// ✅ Find One Blog by blog_id API
const findOneBlog = async (req, res) => {
  try {
    const { blog_id } = req.params; // Extract blog_id from request parameters
 
    // Validate blog_id
    if (!blog_id) {
      return res
        .status(400)
        .json({ status: "0", message: "Blog ID is required" });
    }
 
    // Find the blog by blog_id
    const blog = await blogsModel.findOne({ blog_id: parseInt(blog_id) }).lean();
 
    // If no blog found, return 404 error
    if (!blog) {
      return res.status(404).json({ status: "0", message: "Blog not found" });
    }
 
    // Return the found blog
 
    res.status(200).json({
      status: "1",
      message: "Blog retrieved successfully",
      data: blog,
    });
  } catch (error) {
    console.error("Error fetching blog by ID:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
 
// ✅ Delete Blog by blog_id API
const deleteBlogsById = async (req, res) => {
  try {
    const { blog_id } = req.params; // Extract blog_id from request parameters
 
    // Validate blog_id
    if (!blog_id) {
      return res
        .status(400)
        .json({ status: "0", message: "Blog ID is required" });
    }
 
    // Find and delete the blog by blog_id
    const deletedBlog = await blogsModel.findOneAndDelete({
      blog_id: parseInt(blog_id),
    });
 
    // If no blog found, return 404 error
    if (!deletedBlog) {
      return res.status(404).json({ status: "0", message: "Blog not found" });
    }
 
    // Return success response
    res.status(200).json({
      status: "1",
      message: "Blog deleted successfully",
      data: deletedBlog,
    });
  } catch (error) {
    console.error("Error deleting blog by ID:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
 
const updateBlog = async (req, res) => {
  try {
    const { blog_id } = req.params;
    const {
      blog_title,
      blog_content,
      blog_status,
      blog_published,
      author,
      seo,
    } = req.body;
 
    const blogToUpdate = await blogsModel.findOne({
      blog_id: parseInt(blog_id),
    });
 
    if (!blogToUpdate) {
      return res.status(404).json({ status: "0", message: "Blog not found" });
    }
 
    let blog_slug = formatSlug(req.body.blog_slug || blog_title);
 
    if (blog_slug) {
      const existingSlug = await blogsModel.findOne({
        blog_slug,
        blog_id: { $ne: blog_id },
      });
 
      if (existingSlug) {
        blog_slug += `-${blog_id}`;
      }
    }
 
    let parsedSeo;
    try {
      parsedSeo = typeof seo === "string" ? JSON.parse(seo) : seo;
    } catch (err) {
      return res
        .status(400)
        .json({ status: "0", message: "Invalid SEO format" });
    }
 
    let updatedThumbnail = blogToUpdate.thumbnail;
    if (req.files && req.files["thumbnail"]?.[0]) {
      const thumbnailFile = req.files["thumbnail"][0];
 
      // **Convert Thumbnail to WebP**
      let webpThumbnailPath;
      try {
        webpThumbnailPath = await processImage(thumbnailFile.path);
      } catch (error) {
        console.error("Error processing image:", error);
        return res
          .status(500)
          .json({ status: "0", message: "Image processing failed" });
      }
 
      updatedThumbnail = {
        public_id: thumbnailFile.filename,
        secure_url: webpThumbnailPath,
      };
    }
 
    blogToUpdate.blog_title = blog_title;
    blogToUpdate.blog_content = blog_content;
    blogToUpdate.blog_status = blog_status;
    blogToUpdate.blog_published = blog_published;
    blogToUpdate.blog_slug = blog_slug;
    blogToUpdate.thumbnail = updatedThumbnail;
    blogToUpdate.author = author;
    blogToUpdate.seo = {
      page_title: parsedSeo?.page_title || "",
      meta_keywords: parsedSeo?.meta_keywords || "",
      meta_description: parsedSeo?.meta_description || "",
    };
 
    await blogToUpdate.save();
 
    res.status(200).json({
      status: "1",
      message: "Blog updated successfully",
      blog: blogToUpdate,
    });
  } catch (error) {
    console.error("Error updating blog:", error);
    res.status(500).json({ status: "0", message: "Internal Server Error" });
  }
};
 
module.exports = {
  createBlogs,
  findBlogBySlug,
  findAllBlogs,
  findOneBlog,
  deleteBlogsById,
  updateBlog,
};
 
 
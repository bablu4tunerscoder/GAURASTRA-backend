const blogsModel = require("../Models/blogModel");
const { product_media_processor } = require("../Middlewares/productUploadMiddleware");
const path = require("path");
 
const { pagination_ } = require("../Utils/pagination_");

// Function to format the slug correctly
const formatSlug = (title) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
// Create Blog API


const createBlogs = async (req, res) => {
  try {
    const {
      title,
      content,
      status,
      publishedAt,
      seo
    } = req.body;
  const user = req.user;
    // 🔹 Required fields validation
    if (!title || !content ) {
      return res.status(400).json({
        status: "0",
        message: "Title, content and author are required",
      });
    }

    // 🔹 Slug handling
    let finalSlug = formatSlug(title);
    let slugExists = await blogsModel.findOne({ slug: finalSlug });

    if (slugExists) {
      finalSlug = `${finalSlug}-${Date.now()}`;
    }

    // 🔹 Thumbnail handling
    const thumbnailFile = req.files?.thumbnail?.[0];
    if (!thumbnailFile) {
      return res.status(400).json({
        status: "0",
        message: "Thumbnail is required",
      });
    }

    let webpThumbnailPath;
    try {
      webpThumbnailPath = await product_media_processor(thumbnailFile.path);
    } catch (err) {
      return res.status(500).json({
        status: "0",
        message: "Thumbnail processing failed",
      });
    }

    const thumbnail = {
      public_id: thumbnailFile.filename,
      secure_url: webpThumbnailPath,
    };

    // 🔹 SEO safe parsing
    let seoData = {};
    if (seo) {
      seoData = typeof seo === "string" ? JSON.parse(seo) : seo;
    }

    // 🔹 Create Blog
    const newBlog = await blogsModel.create({
      title,
      content,
      status: status || "Draft",
      publishedAt: status === "Published" ? publishedAt || new Date() : null,
      slug: finalSlug,
      thumbnail,
      author:user._id,
      authorInfo:{
        name:user.name,
        email:user.email
      },
      seo: {
        page_title: seoData.page_title,
        meta_keywords: seoData.meta_keywords || [],
        meta_description: seoData.meta_description,
      },
    });

    return res.status(201).json({
      status: "1",
      message: "Blog created successfully",
      data: newBlog,
    });
  } catch (error) {
    console.error("Create Blog Error:", error);
    return res.status(500).json({
      status: "0",
      message: "Internal Server Error",
    });
  }
};

 
// Find blog by slug API
const findBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const blog = await blogsModel
      .findOne({ slug, status: "Published" }) // ✅ model field
      .populate("author", "name email")       // optional
      .lean();

    if (!blog) {
      return res.status(404).json({
        status: "0",
        message: "Blog not found",
      });
    }

    return res.status(200).json({
      status: "1",
      message: "Blog retrieved successfully",
      data: blog,
    });
  } catch (error) {
    console.error("Error fetching blog:", error);
    return res.status(500).json({
      status: "0",
      message: "Internal Server Error",
    });
  }
};


// Find all blogs API
const findAllBlogs = async (req, res) => {
  try {
   
    const { page, limit, skip, hasPrevPage } = pagination_(req.query, {
      defaultLimit: 10,
      maxLimit: 20,
    });

    const filter = { status: "Published" };

    // 🔹 Parallel execution
    const [blogs, totalRecords] = await Promise.all([
      blogsModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("author", "name email") 
        .lean(),

      blogsModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalRecords / limit);
    const hasNextPage = page < totalPages;

    return res.status(200).json({
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

      data: blogs, // empty array is OK
    });
  } catch (error) {
    console.error("Find All Blogs Error:", error);
    return res.status(500).json({
      status: "0",
      message: "Internal Server Error",
    });
  }
};




// ✅ Find One Blog by blog_id API
const findOneBlog = async (req, res) => {
  try {
    const { blog_id:id } = req.params; 

    if (!id) {
      return res.status(400).json({
        status: "0",
        message: "Blog ID is required",
      });
    }

    const blog = await blogsModel
      .findById(id)
      .populate("author", "name email")
      .lean();

    if (!blog) {
      return res.status(404).json({
        status: "0",
        message: "Blog not found",
      });
    }

    return res.status(200).json({
      status: "1",
      message: "Blog retrieved successfully",
      data: blog,
    });
  } catch (error) {
    console.error("Find One Blog Error:", error);
    return res.status(500).json({
      status: "0",
      message: "Internal Server Error",
    });
  }
};

 
// ✅ Delete Blog by blog_id API
const deleteBlogById = async (req, res) => {
  try {
    const { blog_id:id } = req.params; // MongoDB _id

    if (!id) {
      return res.status(400).json({
        status: "0",
        message: "Blog ID is required",
      });
    }

    const deletedBlog = await blogsModel.findByIdAndDelete(id).lean();

    if (!deletedBlog) {
      return res.status(404).json({
        status: "0",
        message: "Blog not found",
      });
    }

    return res.status(200).json({
      status: "1",
      message: "Blog deleted successfully",
      data: deletedBlog,
    });
  } catch (error) {
    console.error("Delete Blog Error:", error);
    return res.status(500).json({
      status: "0",
      message: "Internal Server Error",
    });
  }
};


 
const updateBlog = async (req, res) => {
  try {
    const {blog_id:id } = req.params; 
    const { title, content, status, publishedAt, seo } = req.body;

    // 🔹 Find blog
    const blogToUpdate = await blogsModel.findById(id);

    if (!blogToUpdate) {
      return res.status(404).json({
        status: "0",
        message: "Blog not found",
      });
    }

    // 🔹 Slug handling (only if title changes)
    if (title && title !== blogToUpdate.title) {
      let newSlug = formatSlug(title);

      const slugExists = await blogsModel.findOne({
        slug: newSlug,
        _id: { $ne: id },
      });

      if (slugExists) {
        newSlug = `${newSlug}-${Date.now()}`;
      }

      blogToUpdate.slug = newSlug;
    }

    // 🔹 SEO safe parsing
    let seoData = blogToUpdate.seo;
    if (seo) {
      seoData = typeof seo === "string" ? JSON.parse(seo) : seo;
    }

    // 🔹 Thumbnail update (optional)
    if (req.files?.thumbnail?.[0]) {
      const thumbnailFile = req.files.thumbnail[0];

      let webpThumbnailPath;
      try {
        webpThumbnailPath = await product_media_processor(thumbnailFile.path);
      } catch (error) {
        return res.status(500).json({
          status: "0",
          message: "Thumbnail processing failed",
        });
      }

      blogToUpdate.thumbnail = {
        public_id: thumbnailFile.filename,
        secure_url: webpThumbnailPath,
      };
    }

    // 🔹 Update fields
    if (title) blogToUpdate.title = title;
    if (content) blogToUpdate.content = content;

    if (status) {
      blogToUpdate.status = status;
      blogToUpdate.publishedAt =
        status === "Published"
          ? publishedAt || blogToUpdate.publishedAt || new Date()
          : null;
    }

    blogToUpdate.seo = {
      page_title: seoData?.page_title || "",
      meta_keywords: seoData?.meta_keywords || [],
      meta_description: seoData?.meta_description || "",
    };

    await blogToUpdate.save();

    return res.status(200).json({
      status: "1",
      message: "Blog updated successfully",
      data: blogToUpdate,
    });
  } catch (error) {
    console.error("Update Blog Error:", error);
    return res.status(500).json({
      status: "0",
      message: "Internal Server Error",
    });
  }
};

 
module.exports = {
  createBlogs,
  findBlogBySlug,
  findAllBlogs,
  findOneBlog,
  deleteBlogById,
  updateBlog,
};
 
 
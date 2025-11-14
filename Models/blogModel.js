const mongoose = require("mongoose");
const blogSchema = new mongoose.Schema(
  {
    blog_id: {
      type: Number,
      unique: true,
    },
    blog_title: {
      type: String,
      required: true,
    },
    blog_content: {
      type: String,
      required: true,
    },
    blog_status: {
      type: String,
      enum: ["Draft", "Published"],
      default: "Draft",
      index: true,
    },
    blog_published: {
      type: String,
      required: true,
    },
    thumbnail: {
      public_id: {
        type: String,
      },
      secure_url: {
        type: String,
      },
    },
    blog_slug: {
      type: String,
      required: true,
    },
    author: {
      type: String,
      required: true,
      index: true,
    },
    seo: {
      page_title: {
        type: String,
      },
      meta_keywords: {
        type: Array,
        default: [],
      },
      meta_description: {
        type: String,
      },
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

blogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("PostBlogs", blogSchema);

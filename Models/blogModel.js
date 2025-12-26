const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, index: true },
    content: { type: String, required: true },

    status: {
      type: String,
      enum: ["Draft", "Published"],
      default: "Draft",
      index: true,
    },

    publishedAt: { type: Date },

    thumbnail: {
      public_id: String,
      secure_url: String
    },

    slug: { type: String, required: true, unique: true, index: true },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    authorInfo: {
      name: String,
      email: String
    },

    seo: {
      page_title: String,
      meta_keywords: { type: [String], default: [] },
      meta_description: String
    }
  },
  { timestamps: true }
);

// Latest blogs first
blogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("BlogPost", blogSchema);

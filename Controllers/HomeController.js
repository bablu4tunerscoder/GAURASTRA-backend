const Banner = require("../Models/bannerModel");
const Category = require("../Models/categoryModel");
const SubCategory = require("../Models/subCategoryModel");
const Product = require("../Models/ProductModel");
const BlogPost = require("../Models/blogModel");

const { enrichProductListWithVariants } = require("../utilities/enrichProductListWithVariants");

const home_get_controller = async (req, res) => {
  try {
    // 🔹 1. Fetch Banners
    const banners = await Banner.find({})
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    const categories = await Category.find({ status: "Active" }).lean();
    const subcategories = await SubCategory.find({ status: "Active" }).lean();

 
    let products = await Product.find({ status: "Active" }).lean();

   
    products = await enrichProductListWithVariants(products,{});

    // 🔹 5. Prepare sections per category
    const sections = {};
    for (const category of categories) {
      const relatedSubcategories = subcategories.filter(
        (sc) => sc.category_id.toString() === category._id.toString()
      );

      const relatedProducts = products.filter(
        (p) => p.category_id.toString() === category._id.toString()
      );

      // Find product with max discount
      let maxDiscountProduct = null;
      if (relatedProducts.length > 0) {
        maxDiscountProduct = relatedProducts.reduce((prev, curr) => {
          const prevMin = Math.min(...(prev.variants?.map(v => v.pricing?.discounted_price || 0) || [0]));
          const prevOriginal = Math.min(...(prev.variants?.map(v => v.pricing?.original_price || 0) || [0]));
          const prevDiscount = prevOriginal - prevMin;

          const currMin = Math.min(...(curr.variants?.map(v => v.pricing?.discounted_price || 0) || [0]));
          const currOriginal = Math.min(...(curr.variants?.map(v => v.pricing?.original_price || 0) || [0]));
          const currDiscount = currOriginal - currMin;

          return currDiscount > prevDiscount ? curr : prev;
        });
      }

      sections[category.category_clean_name] = {
        category,
        subcategories: relatedSubcategories,
        topDiscountProduct: maxDiscountProduct,
      };
    }

    // 🔹 6. Fetch latest blogs
    const latestBlogs = await BlogPost.find({ status: "Published" })
      .sort({ publishedAt: -1 })
      .limit(5)
      .lean();

    // 🔹 7. Prepare final JSON
    const data = {
      banners,
      sections,
      latestBlogs,
    };

    return res.status(200).json({
      status: "1",
      message: "Home data fetched successfully",
      data,
    });

  } catch (error) {
    console.error("Home API Error:", error);
    return res.status(500).json({
      status: "0",
      message: "Internal Server Error",
      error: error.message,
    });
  }
};


const home_search = async (req, res) => {
  try {
    const { search } = req.query;

    if (!search || search.trim() === "") {
      return res.status(400).json({
        status: "0",
        message: "Search keyword is required",
      });
    }

    const regex = new RegExp(search, "i");

    const categories = await Category.find({
      status: "Active",
      $or: [
        { category_name: regex },
        { category_description: regex },
      ],
    })
      .limit(10)
      .lean();

    const subcategories = await SubCategory.find({
      status: "Active",
      $or: [
        { subcategory_name: regex },
        { subcategory_description: regex },
      ],
    })
      .limit(10)
      .lean();

    let products = await Product.find({
      status: "Active",
      $or: [
        { product_name: regex },
        { brand: regex },
        { "seo.metaTitle": regex },
      ],
    })
      .limit(10)
      .lean();

    products = await enrichProductListWithVariants(products, {});

    const blogs = await BlogPost.find({
      status: "Published",
      $or: [
        { title: regex },
        { content: regex },
        { "seo.meta_keywords": regex },
        { "seo.page_title": regex },
      ],
    })
      .sort({ publishedAt: -1 })
      .limit(10)
      .lean();

    return res.status(200).json({
      status: "1",
      message: "Search results fetched successfully",
      data: {
        keyword: search,
        categories,
        subcategories,
        products,
        blogs,
      },
    });

  } catch (error) {
    console.error("Home Search API Error:", error);
    return res.status(500).json({
      status: "0",
      message: "Internal Server Error",
      error: error.message,
    });
  }
};



module.exports = { home_get_controller, home_search };

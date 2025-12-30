const Wishlist = require("../Models/wishlistModel");
const { pagination_ } = require("../utilities/pagination_");
const Category = require("../Models/categoryModel");
const SubCategory = require("../Models/subCategoryModel");
const Product = require("../Models/ProductModel");
const ProductImage = require("../Models/ProductImgModel");
const Pricing = require("../Models/ProductPricingModel");
const ProductStock = require("../Models/ProductStockModel");
const { enrichProductListWithVariants } = require("../utilities/enrichProductListWithVariants");


const addToWishlist = async (req, res) => {
  try {
    const { product_id, sku } = req.body;
    const user = req.user;

    if (!product_id) {
      return res.status(400).json({ success: false, message: "product_id is required" });
    }

    let wishlist = await Wishlist.findOne({ user_id: user._id });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        user_id: user._id,
        products: [{ product_id, sku: sku || null }]
      });

      return res.status(201).json({ success: true, message: "Product added to wishlist", wishlist });
    }

    const alreadyExists = wishlist.products.some(
      (p) => p.product_id.toString() === product_id
    );

    if (alreadyExists) {
      return res.status(200).json({ success: true, message: "Product already in wishlist" });
    }

    wishlist.products.push({ product_id, sku: sku || null });
    await wishlist.save();

    return res.status(200).json({ success: true, message: "Product added to wishlist", wishlist });

  } catch (error) {
    console.error("Add to wishlist error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};


const removeFromWishlist = async (req, res) => {
  try {
    const { product_id } = req.body;
    const user = req.user;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: "product_id is required",
      });
    }

    const wishlist = await Wishlist.findOneAndUpdate(
      { user_id: user._id },
      { $pull: { products: { product_id } } },
      { new: true }
    );

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product removed from wishlist",
      wishlist,
    });
  } catch (error) {
    console.error("Remove wishlist error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const clearWishlist = async (req, res) => {
  try {
    const user = req.user;

    await Wishlist.findOneAndUpdate(
      { user_id: user._id },
      { $set: { products: [] } }
    );

    return res.status(200).json({
      success: true,
      message: "Wishlist cleared successfully",
    });
  } catch (error) {
    console.error("Clear wishlist error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const getWishlist = async (req, res) => {
  try {
    const user = req.user;

    /* ---------- PAGINATION ---------- */
    const { page, limit, skip } = pagination_(req.query, {
      defaultLimit: 10,
      maxLimit: 20,
    });

    const wishlist = await Wishlist.findOne(
      { user_id: user._id },
      { products: 1 }
    ).lean();

    if (!wishlist || wishlist.products.length === 0) {
      return res.status(200).json({
        success: true,
        pagination: {
          page,
          limit,
          totalRecords: 0,
        },
        data: [],
      });
    }

    const totalRecords = wishlist.products.length;

    /* ---------- 2. PAGINATE PRODUCTS ---------- */
    const paginatedItems = wishlist.products
      .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
      .slice(skip, skip + limit);

    /* ---------- 3. FETCH PRODUCTS ---------- */
    const productIds = paginatedItems.map(p => p.product_id);

    const products = await Product.find({
      _id: { $in: productIds },
      status: "Active",
    }).lean();

    /* ---------- 4. MAP SKU TO PRODUCT ---------- */
    const skuMap = {};
    paginatedItems.forEach(item => {
      skuMap[item.product_id.toString()] = item.sku || null;
    });

    const productsWithSku = products.map(p => ({
      ...p,
      __selectedSku: skuMap[p._id.toString()] || null,
    }));

    const finalProducts = await enrichProductListWithVariants(
      productsWithSku
    );

    return res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        totalRecords,
      },
      data: finalProducts,
    });

  } catch (error) {
    console.error("Get wishlist error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};



module.exports = {
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  getWishlist,
};
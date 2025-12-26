
const Product = require("../Models/ProductModel");
const ProductImage = require("../Models/ProductImgModel");
const Pricing = require("../Models/ProductPricingModel");
const ProductStock = require("../Models/ProductStockModel");
const Discount = require("../Models/ProductDiscountModel");
const slugify = require("slugify").default;
const Category = require("../Models/categoryModel");
const SubCategory = require("../Models/subCategoryModel");
const { enrichProductListWithVariants } = require("../utils/enrichProductListWithVariants");
const BlogPost = require("../Models/blogModel");
const { pagination_ } = require("../Utils/pagination_");
const categoryModel = require("../Models/categoryModel");
const subCategoryModel = require("../Models/subCategoryModel");
const { enrichSingleProductWithVariants } = require("../Utils/enrichSingleProductWithVariants.js");
const Rating = require('../Models/ratingAndComment');



function generateRandomString(length = 5) {
  return Array.from({ length }, () =>
    Math.random().toString(36)[2]
  ).join("");
}

const gen_product_code = async (product_name) => {
  const namePrefix = product_name
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 12)
    .toUpperCase();

  const datePart = new Date().toISOString().split("T")[0].replace(/-/g, "");

  // 5-digit Random String
  const random5 = generateRandomString(5);

  return `${namePrefix}-${datePart}-${random5.toUpperCase()}`;
};

function generateRandomString(length = 5) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

const normalize = (val) => val ? val
  .toString()
  .trim()
  .replace(/[^a-zA-Z0-9\s]/g, "")
  .replace(/\s+/g, "-")
  .toUpperCase()
  : "NA";


// add products
const bulkUploadProducts = async (req, res) => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        status: "0",
        message: "Invalid product data"
      });
    }

    const productDocs = [];
    const pricingDocs = [];
    const stockDocs = [];
    const imageDocs = [];

    for (const productData of products) {
      const {
        product_name,
        description,
        brand,
        category_id,
        subcategory_id,
        attributes,
        variants,
        seo,
        featuredSections = ["All Products"]
      } = productData;

      /* ---------------- PRODUCT ---------------- */
      const product_sku_code = await gen_product_code(product_name);
      const randomString = generateRandomString();
      const baseSlug = slugify(product_name, { lower: true });

      const product = new Product({
        product_name,
        description,
        brand,
        category_id,
        subcategory_id,
        attributes,
        featuredSections,
        slug: `${baseSlug}-${randomString}`,
        canonicalURL: `${baseSlug}-${randomString}`,
        product_sku_code,
        seo,
        qrCode: `https://backend.gaurastra.com/productQR/${product_sku_code}`
      });

      productDocs.push(product);

      /* ---------------- VARIANTS ---------------- */
      const skuSet = new Set();

      if (Array.isArray(variants)) {
        for (const variant of variants) {

          // SKU generate
          const sku = `${product_sku_code}-${normalize(variant.attributes?.color)}-${normalize(variant.attributes?.size)}`;

          // Duplicate check
          if (skuSet.has(sku)) {
            throw new Error(`Duplicate variant detected: ${sku}`);
          }
          skuSet.add(sku);

          /* -------- PRICING -------- */
          pricingDocs.push({
            product_id: product._id,
            sku,
            variant_attributes: {
              color: variant.attributes?.color || null,
              size: variant.attributes?.size || null
            },
            original_price: variant.mrp,
            discounted_price: variant.price,

            currency: "INR"
          });

          /* -------- STOCK -------- */
          stockDocs.push({
            product_id: product._id,
            sku,
            attributes: {
              color: variant.attributes?.color || null,
              size: variant.attributes?.size || null
            },
            stock_quantity: variant.stock || 0,
            is_available: variant.stock > 0
          });

          if (Array.isArray(variant.media)) {
            variant.media.forEach((img, index) => {
              imageDocs.push({
                product_id: product._id,
                sku,
                image_url: img.url,
                is_primary: index === 0
              });
            });
          }
        }
      }

    }

    if (productDocs.length) await Product.insertMany(productDocs);
    if (pricingDocs.length) await Pricing.insertMany(pricingDocs);
    if (stockDocs.length) await ProductStock.insertMany(stockDocs);
    if (imageDocs.length) await ProductImage.insertMany(imageDocs);

    return res.status(201).json({
      status: "1",
      message: "Products uploaded successfully",
      totalProducts: productDocs.length
    });

  } catch (error) {
    console.error("Bulk upload error:", error);
    return res.status(500).json({
      status: "0",
      message: "Error uploading products",
      error: error.message
    });
  }
};


const getAllProductsWithDetails = async (req, res) => {
  const { page, limit, skip } = pagination_(req.query);

  const [products, totalRecords] = await Promise.all([
    Product.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(),
  ]);

  const finalProducts = await enrichProductListWithVariants(products);

  res.json({
    success: true,
    pagination: {
      page,
      limit,
      totalRecords,
    },
    data: finalProducts,
  });
};

// Get a single product by ID with all details
const getOneProductWithDetails = async (req, res) => {
  try {
    const { product_id: id } = req.params;

    /* ---------------- PRODUCT ---------------- */
    const product = await Product.findById(id).lean();
    if (!product) {
      return res.status(404).json({
        status: "0",
        success: false,
        message: "Product not found",
      });
    }


    const enrichedProduct = await enrichSingleProductWithVariants(product, {});


    return res.status(200).json({
      status: "1",
      success: true,
      data: enrichedProduct,
    });
  } catch (error) {
    console.error("Get single product error:", error);
    return res.status(500).json({
      status: "0",
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};


// update product with product_id
const updateSingleProduct = async (req, res) => {
  try {
    const { product_id } = req.params;
    const {
      product_name,
      description,
      brand,
      category_id,
      subcategory_id,
      attributes,
      variants,
      seo,
      featuredSections,
    } = req.body;

    /* ---------------- FIND PRODUCT ---------------- */
    const product = await Product.findById(product_id);
    if (!product) {
      return res.status(404).json({
        status: "0",
        message: "Product not found",
      });
    }

    /* ---------------- UPDATE PRODUCT BASIC ---------------- */
    if (product_name) product.product_name = product_name;
    if (description) product.description = description;
    if (brand) product.brand = brand;
    if (category_id) product.category_id = category_id;
    if (subcategory_id) product.subcategory_id = subcategory_id;
    if (attributes) product.attributes = attributes;
    if (featuredSections) product.featuredSections = featuredSections;
    if (seo) product.seo = seo;

    await product.save();

    /* ---------------- RESET VARIANT DATA ---------------- */
    await Promise.all([
      Pricing.deleteMany({ product_id: product._id }),
      ProductStock.deleteMany({ product_id: product._id }),
      ProductImage.deleteMany({ product_id: product._id }),
    ]);

    /* ---------------- REINSERT VARIANTS ---------------- */
    if (Array.isArray(variants)) {
      const pricingDocs = [];
      const stockDocs = [];
      const imageDocs = [];

      const skuSet = new Set();

      for (const variant of variants) {
        const sku = `${product.product_sku_code}-${normalize(
          variant.attributes?.color
        )}-${normalize(variant.attributes?.size)}`;

        if (skuSet.has(sku)) {
          throw new Error(`Duplicate variant SKU: ${sku}`);
        }
        skuSet.add(sku);

        /* ---- PRICING ---- */
        pricingDocs.push({
          product_id: product._id,
          sku,
          currency: "INR",
          original_price: variant.mrp,
          discounted_price: variant.price,
          discount_percent: variant.mrp
            ? Math.round(((variant.mrp - variant.price) / variant.mrp) * 100)
            : 0,
        });

        /* ---- STOCK ---- */
        stockDocs.push({
          product_id: product._id,
          sku,
          attributes: {
            color: variant.attributes?.color || null,
            size: variant.attributes?.size || null,
          },
          stock_quantity: variant.stock || 0,
          is_available: variant.stock > 0,
        });

        /* ---- IMAGES ---- */
        if (Array.isArray(variant.media)) {
          variant.media.forEach((img, index) => {
            imageDocs.push({
              product_id: product._id,
              sku,
              image_url: img.url,
              is_primary: index === 0, // first image primary
            });
          });
        }
      }

      if (pricingDocs.length) await Pricing.insertMany(pricingDocs);
      if (stockDocs.length) await ProductStock.insertMany(stockDocs);
      if (imageDocs.length) await ProductImage.insertMany(imageDocs);
    }

    return res.status(200).json({
      status: "1",
      message: "Product updated successfully",
    });

  } catch (error) {
    console.error("Update product error:", error);
    return res.status(500).json({
      status: "0",
      message: "Error updating product",
      error: error.message,
    });
  }
};

const deleteProductsByID = async (req, res) => {
  try {
    const { product_id } = req.params;

    if (!product_id) {
      return res.status(400).json({
        status: "0",
        message: "Product ID is required",
      });
    }

    /* ---------------- DELETE PRODUCT ---------------- */
    const deletedProduct = await Product.findByIdAndDelete(product_id);

    if (!deletedProduct) {
      return res.status(404).json({
        status: "0",
        message: "Product not found",
      });
    }

    /* ---------------- DELETE RELATED DATA ---------------- */
    await Promise.all([
      Pricing.deleteMany({ product_id }),
      ProductStock.deleteMany({ product_id }),
      ProductImage.deleteMany({ product_id }),
      Discount.deleteMany({ product_id }),
    ]);

    return res.status(200).json({
      status: "1",
      message: "Product and all related data deleted successfully",
    });

  } catch (error) {
    console.error("Delete product error:", error);
    return res.status(500).json({
      status: "0",
      message: "Error deleting product",
      error: error.message,
    });
  }
};


// update canonicalurls api
const updateCanonicalURL = async (req, res) => {
  try {
    const { product_id } = req.params;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    // 🔹 Fetch minimal data
    const product = await Product.findById(
      product_id,
      { product_name: 1 }
    ).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // 🔹 Generate slug & canonical
    const baseSlug = slugify(product.product_name, {
      lower: true,
      strict: true,
    });

    const randomString = generateRandomString();


    const slug = `${baseSlug}-${randomString}`;

    const canonicalURL = `${baseSlug}-${randomString}`;



    // 🔹 Atomic update (single update call)
    await Product.updateOne(
      { _id: product_id },
      {
        $set: {
          canonicalURL,
          slug,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Canonical URL updated successfully",
      canonicalURL,
    });
  } catch (error) {
    console.error("🔥 updateCanonicalURL error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get full product data by canonicalURL
const getOneProductWithDetailsBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const { variant } = req.query;

    if (!slug) {
      return res.status(400).json({
        status: "0",
        success: false,
        message: "Product slug is required",
      });
    }

    /* ---------------- PRODUCT ---------------- */
    const product = await Product.findOne({
      slug,
      status: "Active",
    }).lean();

    if (!product) {
      return res.status(404).json({
        status: "0",
        success: false,
        message: "Product not found",
      });
    }

    const enrichedProduct = await enrichSingleProductWithVariants(product, { selectedSku: variant });

    const relatedProductsRaw = await Product.find({
      _id: { $ne: product._id },
      status: "Active",
      $or: [
        { category_id: product.category_id },
        { subcategory_id: product.subcategory_id },
      ],
    })
      .limit(8)
      .lean();

    // Attach variants for related products
    const relatedProducts = await enrichProductListWithVariants(relatedProductsRaw);

    const latestBlogs = await BlogPost.find({ status: "Published" })
      .sort({ publishedAt: -1 })
      .limit(5)
      .lean();


    const filter = {
      product_id: product._id,
      is_published: true,
    };

    const ratings = await Rating.find(filter)
      .populate("user_id", "name email image")
      .sort({ created_at: -1 })
      .limit(50)
      .lean()

    return res.status(200).json({
      status: "1",
      success: true,
      data: {
        details: enrichedProduct,
        related_products: relatedProducts,
        blogs: latestBlogs,
        ratings: ratings,
      },
    });
  } catch (error) {
    console.error("Get product by slug error:", error);
    return res.status(500).json({
      status: "0",
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// Suggestion products API
const getProductSuggestions = async (req, res) => {
  try {
    const { canonicalURL } = req.params;

    if (!canonicalURL) {
      return res.status(400).json({
        success: false,
        message: "canonicalURL is required",
      });
    }

    // 1️⃣ Find main product
    const mainProduct = await Product.findOne({ canonicalURL }).lean();

    if (!mainProduct) {
      return res.status(404).json({
        success: false,
        message: "Main product not found",
      });
    }

    const { _id, subcategory_id, brand, attributes = {} } = mainProduct;

    // 2️⃣ Fetch similar products (same subcategory, exclude self)
    const similarProducts = await Product.find({
      subcategory_id,
      _id: { $ne: _id },
      status: "Active",
    })
      .limit(50) // Increased limit for better suggestions
      .lean();

    if (!similarProducts.length) {
      return res.status(200).json({ success: true, suggestions: [] });
    }

    const productIds = similarProducts.map((p) => p._id);

    // 3️⃣ Fetch related data in parallel
    const [images, pricingList, stockList] = await Promise.all([
      ProductImage.find({ product_id: { $in: productIds } }).lean(),
      Pricing.find({ product_id: { $in: productIds }, is_active: true })
        .sort({ createdAt: -1 })
        .lean(),
      ProductStock.find({ product_id: { $in: productIds } }).lean(),
    ]);

    // 4️⃣ Build lookup maps
    const imageMap = {};
    images.forEach((img) => {
      if (!imageMap[img.product_id]) imageMap[img.product_id] = [];
      imageMap[img.product_id].push(img);
    });

    const pricingMap = {};
    pricingList.forEach((p) => {
      if (!pricingMap[p.product_id]) pricingMap[p.product_id] = [];
      pricingMap[p.product_id].push(p);
    });

    const stockMap = {};
    stockList.forEach((s) => {
      if (!stockMap[s.product_id]) stockMap[s.product_id] = [];
      stockMap[s.product_id].push(s);
    });

    // 5️⃣ Match score calculation
    const getMatchScore = (targetAttributes, targetBrand) => {
      let score = 0;
      for (const key in attributes) {
        if (
          targetAttributes?.[key] &&
          JSON.stringify(targetAttributes[key]) === JSON.stringify(attributes[key])
        ) {
          score += 2; // weight for exact attribute match
        }
      }
      if (targetBrand === brand) score += 1; // weight for brand match
      return score;
    };

    // 6️⃣ Build final suggestions
    const suggestions = similarProducts.map((product) => {
      // Multiple pricing variants support
      const productPricingList = pricingMap[product._id] || [];

      // Pick default / best discounted variant
      const pricing = productPricingList.length
        ? productPricingList.reduce((prev, curr) => {
          const prevDiscount =
            prev.original_price - (prev.discounted_price ?? prev.original_price);
          const currDiscount =
            curr.original_price - (curr.discounted_price ?? curr.original_price);
          return currDiscount > prevDiscount ? curr : prev;
        })
        : null;

      return {
        _id: product._id,
        product_name: product.product_name,
        slug: product.slug,
        canonicalURL: product.canonicalURL,
        brand: product.brand,
        attributes: product.attributes,
        status: product.status,
        createdAt: product.createdAt,
        pricing: pricing
          ? {
            sku: pricing.sku,
            variant: pricing.variant_attributes,
            original_price: pricing.original_price,
            discounted_price:
              pricing.discounted_price ??
              pricing.original_price -
              (pricing.original_price * (pricing.discount_percent || 0)) / 100,
            discount_percent: pricing.discount_percent || 0,
            currency: pricing.currency,
          }
          : null,
        stock_details: stockMap[product._id] || [],
        images: imageMap[product._id] || [],
        match_score: getMatchScore(product.attributes, product.brand),
      };
    });

    // 7️⃣ Sort suggestions by relevance
    suggestions.sort((a, b) => b.match_score - a.match_score);

    return res.status(200).json({
      success: true,
      suggestions,
    });
  } catch (error) {
    console.error("🔥 Error in getProductSuggestions:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};


const getDataWithSkuCode = async (req, res) => {
  try {
    const { product_sku_code } = req.params;

    if (!product_sku_code) {
      return res.status(400).json({
        success: false,
        message: "product_sku_code is required",
      });
    }

    // 1️⃣ Find main product
    const product = await Product.findOne({
      product_sku_code,
      status: "Active",
    }).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const enrichedProduct = await enrichSingleProductWithVariants(product, {});


    return res.status(200).json({
      status: "1",
      success: true,
      data: enrichedProduct,
    });


  } catch (error) {
    console.error("🔥 Error in getDataWithSkuCode:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// ---------------- filter 

const productPageSideBars = async (req, res) => {
  try {
    /* ---------------- CATEGORIES ---------------- */
    const categories = await categoryModel
      .find({ status: "Active" })
      .select("_id category_name category_clean_name")
      .lean();

    const categoryIds = categories.map(c => c._id);

    /* ---------------- SUBCATEGORIES ---------------- */
    const subcategories = await subCategoryModel
      .find({
        status: "Active",
        category_id: { $in: categoryIds },
      })
      .select("_id subcategory_name category_id subcategory_clean_name")
      .lean();

    const subcategoryMap = subcategories.reduce((acc, sub) => {
      const key = sub.category_id.toString();
      if (!acc[key]) acc[key] = [];
      acc[key].push({
        subcategory_id: sub._id,
        subcategory_name: sub.subcategory_name,
      });
      return acc;
    }, {});

    const categoryData = categories.map(cat => ({
      category_id: cat._id,
      category_name: cat.category_name,
      subcategories: subcategoryMap[cat._id.toString()] || [],
    }));

    /* ---------------- VARIANTS (COLOR & SIZE) ---------------- */
    const pricingVariants = await Pricing.find(
      { is_active: true },
      { "variant_attributes.color": 1, "variant_attributes.size": 1 }
    ).lean();

    const stocks = await ProductStock.find(
      {},
      { "attributes.size": 1, stock_quantity: 1 }
    ).lean();

    const sizeQtyMap = {};

    stocks.forEach(s => {
      const size = s.attributes?.size;
      if (!size) return;

      if (!sizeQtyMap[size]) sizeQtyMap[size] = 0;
      sizeQtyMap[size] += s.stock_quantity || 0;
    });

    const colorSet = new Set();
    const sizeSet = new Set();

    pricingVariants.forEach(v => {
      if (v.variant_attributes?.color) {
        colorSet.add(v.variant_attributes.color);
      }
      if (v.variant_attributes?.size) {
        sizeSet.add(v.variant_attributes.size);
      }
    });

    return res.status(200).json({
      status: "1",
      success: true,
      data: {
        categories: categoryData,
        filters: {
          colors: Array.from(colorSet),
          sizes: Array.from(sizeSet).map(size => ({
            size,
            quantity: sizeQtyMap[size] || 0,
          })),
        },
      },
    });

  } catch (error) {
    console.error("Product Page Sidebar Error:", error);
    return res.status(500).json({
      status: "0",
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};


const filterProductDetails = async (req, res) => {
  try {
    const {
      category,
      subcategory,
      min_price,
      max_price,
      color,
      size,
      sort,
      search,
      discount: on_sale,
    } = req.body;

    const { page, limit, skip, hasPrevPage } = pagination_(req.query, {
      defaultLimit: 10,
      maxLimit: 20,
    });

    /* ---------------- PRODUCT FILTER ---------------- */
    const filter = { status: "Active" };

    // CATEGORY CLEAN NAME -> ID
    if (category) {
      const cat = await categoryModel
        .findOne({ category_clean_name: category })
        .select("_id")
        .lean();

      if (!cat) {
        return res.status(200).json({
          status: "1",
          success: true,
          pagination: { page, limit, totalRecords: 0 },
          data: [],
        });
      }

      filter.category_id = cat._id;
    }

    // SUBCATEGORY CLEAN NAME -> ID
    if (subcategory) {
      const sub = await subCategoryModel
        .findOne({ subcategory_clean_name: subcategory })
        .select("_id")
        .lean();

      if (!sub) {
        return res.status(200).json({
          status: "1",
          success: true,
          pagination: { page, limit, totalRecords: 0 },
          data: [],
        });
      }

      filter.subcategory_id = sub._id;
    }

    // SEARCH
    if (search) {
      filter.$or = [
        { product_name: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
      ];
    }

    /* ---------------- FETCH PRODUCTS ---------------- */
    const products = await Product.find(filter).lean();
    if (!products.length) {
      return res.status(200).json({
        status: "1",
        success: true,
        pagination: { page, limit, totalRecords: 0 },
        data: [],
      });
    }

    const productIds = products.map(p => p._id);

    /* ---------------- FETCH RELATED DATA ---------------- */
    const [
      pricingList,
      stockList,
      imageList,
      discountList,
      categories,
      subcategories,
    ] = await Promise.all([
      Pricing.find({ product_id: { $in: productIds }, is_active: true }).lean(),
      ProductStock.find({ product_id: { $in: productIds } }).lean(),
      ProductImage.find({ product_id: { $in: productIds } }).lean(),
      Discount.find({
        product_id: { $in: productIds },
        is_active: true,
        start_date: { $lte: new Date() },
        end_date: { $gte: new Date() },
      }).lean(),
      Category.find({}).lean(),
      SubCategory.find({}).lean(),
    ]);

    /* ---------------- MAPS ---------------- */
    const pricingMap = {};
    pricingList.forEach(p => {
      if (!pricingMap[p.product_id]) pricingMap[p.product_id] = [];
      pricingMap[p.product_id].push(p);
    });

    const stockMap = {};
    stockList.forEach(s => {
      if (!stockMap[s.product_id]) stockMap[s.product_id] = [];
      stockMap[s.product_id].push(s);
    });

    const imageMap = {};
    imageList.forEach(img => {
      if (!imageMap[img.product_id]) imageMap[img.product_id] = [];
      imageMap[img.product_id].push({
        image_url: img.image_url,
        is_primary: img.is_primary,
        sku: img.sku,
      });
    });

    const discountMap = {};
    discountList.forEach(d => (discountMap[d.product_id] = d));

    const categoryMap = Object.fromEntries(
      categories.map(c => [c._id.toString(), c])
    );
    const subcategoryMap = Object.fromEntries(
      subcategories.map(s => [s._id.toString(), s])
    );

    /* ---------------- BUILD FINAL PRODUCTS ---------------- */
    let finalProducts = products
      .map(product => {
        const variants = (pricingMap[product._id] || [])
          .map(pricing => {
            const stock = (stockMap[product._id] || []).find(
              s => s.sku === pricing.sku
            );
            const images = (imageMap[product._id] || []).filter(
              i => i.sku === pricing.sku
            );

            // VARIANT FILTER
            if (color && stock?.attributes?.color !== color) return null;
            if (size && stock?.attributes?.size !== size) return null;

            // FINAL PRICE
            let finalPrice = pricing.original_price;
            const discount = discountMap[product._id];

            if (discount) {
              if (discount.discount_type === "percentage") {
                finalPrice -= (pricing.original_price * discount.value) / 100;
              } else if (discount.discount_type === "flat") {
                finalPrice -= discount.value;
              }
            } else if (pricing.discount_percent) {
              finalPrice -=
                (pricing.original_price * pricing.discount_percent) / 100;
            }

            // PRICE RANGE
            if (
              (min_price && finalPrice < Number(min_price)) ||
              (max_price && finalPrice > Number(max_price))
            ) {
              return null;
            }

            return {
              sku: pricing.sku,
              attributes: stock?.attributes || {},
              pricing: {
                currency: pricing.currency,
                original_price: pricing.original_price,
                discounted_price: finalPrice,
                discount_percent: pricing.discount_percent,
              },
              stock: stock
                ? {
                  stock_quantity: stock.stock_quantity,
                  is_available: stock.is_available,
                }
                : null,
              images,
            };
          })
          .filter(Boolean);

        if (!variants.length) return null;
        if (on_sale && !discountMap[product._id]) return null;

        return {
          ...product,
          category: categoryMap[product.category_id] || null,
          subcategory: subcategoryMap[product.subcategory_id] || null,
          discount: discountMap[product._id] || null,
          variants,
        };
      })
      .filter(Boolean);

    /* ---------------- SORT ---------------- */
    if (sort === "price_low_to_high") {
      finalProducts.sort(
        (a, b) =>
          Math.min(...a.variants.map(v => v.pricing.discounted_price)) -
          Math.min(...b.variants.map(v => v.pricing.discounted_price))
      );
    } else if (sort === "price_high_to_low") {
      finalProducts.sort(
        (a, b) =>
          Math.max(...b.variants.map(v => v.pricing.discounted_price)) -
          Math.max(...a.variants.map(v => v.pricing.discounted_price))
      );
    } else if (sort === "A_to_Z") {
      finalProducts.sort((a, b) =>
        a.product_name.localeCompare(b.product_name)
      );
    } else if (sort === "Z_to_A") {
      finalProducts.sort((a, b) =>
        b.product_name.localeCompare(a.product_name)
      );
    } else if (sort === "new_arrivals") {
      finalProducts.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    }

    /* ---------------- PAGINATION (SAFE) ---------------- */
    const totalRecords = finalProducts.length;
    const paginatedData = finalProducts.slice(skip, skip + limit);
    const totalPages = Math.ceil(totalRecords / limit);
    const hasNextPage = page < totalPages;

    return res.status(200).json({
      status: "1",
      success: true,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasPrevPage,
        hasNextPage,
      },
      data: paginatedData,
    });
  } catch (error) {
    console.error("Filter products error:", error);
    return res.status(500).json({
      status: "0",
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};


module.exports = {
  bulkUploadProducts,
  getAllProductsWithDetails,
  filterProductDetails,
  getOneProductWithDetails,
  productPageSideBars,
  updateSingleProduct,
  deleteProductsByID,
  updateCanonicalURL,
  getOneProductWithDetailsBySlug,
  getProductSuggestions,
  getDataWithSkuCode,
};

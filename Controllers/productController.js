const { v4: uuidv4 } = require("uuid");
const Product = require("../Models/ProductModel");
const ProductImage = require("../Models/ProductImgModel");
const Pricing = require("../Models/ProductPricingModel");
const ProductStock = require("../Models/ProductStockModel");
const Discount = require("../Models/ProductDiscountModel");
const slugify = require("slugify");
const Category = require("../Models/categoryModel");
const Subcategory = require("../Models/subCategoryModel");
const QRCode = require("qrcode"); // ✅ ADD THIS
const {cleanString} = require('../Utils/helpers')


const generateProductUniqueId = async (
  Subcategory_id,
  category_id,
  product_id
) => {
  const subcategory = await Subcategory.findOne({ Subcategory_id }).select(
    "Subcategory_name"
  );
  const category = await Category.findOne({ category_id }).select(
    "category_name"
  );

  if (!subcategory || !category) return null;

  const subPrefix = subcategory.Subcategory_name.substring(0, 2).toUpperCase();
  const catPrefix = category.category_name.substring(0, 2).toUpperCase();
  const datePart = new Date()
    .toISOString()
    .split("T")[0]
    .split("-")
    .reverse()
    .join("");

  return `${subPrefix}${catPrefix}-${datePart}-${product_id}`;
};

// add products
const bulkUploadProducts = async (req, res) => {
  try {
    const { products } = req.body;
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res
        .status(400)
        .json({ status: "0", message: "Invalid product data" });
    }

    let savedProducts = [];
    let pricingDataArray = [];
    let stockDataArray = [];
    let imageDataArray = [];

    for (const productData of products) {
      const {
        pricing,
        attributes,
        images,
        videos,
        seo,
        category_id,
        Subcategory_id,
        stock,
        mediaUrls,
        cover_image,
        featuredSection = "All Products",
        ...productDetails
      } = productData;

      const productId = uuidv4();
      const slug =
        seo?.slug || slugify(productDetails.product_name, { lower: true });
      const canonicalURL = `${slug}-${productId}`;

      const productUniqueId = await generateProductUniqueId(
        Subcategory_id,
        category_id,
        productId
      );

      const frontendURL = `https://backend.gaurastra.com/productQR/${productUniqueId}`;
      // const qrCodeData = await QRCode.toDataURL(frontendURL);
      const qrCodeData = frontendURL; // ✅ Store the URL, not Base64 image

      const newProduct = new Product({
        ...productDetails,
        product_id: productId,
        productUniqueId,
        category_id,
        Subcategory_id,
        featuredSection,
        attributes,
        seo: {
          slug,
          metaTitle: seo?.metaTitle,
          metaDescription: seo?.metaDescription,
          keywords: seo?.keywords,
          canonicalURL,
        },
        qrCode: qrCodeData, // ✅ Storing QR code image
      });

      savedProducts.push(newProduct);

      if (pricing) {
        pricingDataArray.push({
          price_id: uuidv4(),
          product_id: productId,
          currency: pricing.currency || "INR",
          sku: pricing.sku,
          price_detail: [
            {
              original_price: pricing.original_price,
              discount_percent: pricing.discount_percent,
              is_active: true,
              created_at: new Date(),
            },
          ],
        });

        // ✅ Stock Entry for Each Size
        if (attributes?.size && Array.isArray(attributes.size)) {
          attributes.size.forEach(({ name, quantity }) => {
            stockDataArray.push({
              stock_id: uuidv4(),
              product_id: productId,
              size: name, // ✅ Size store kar rahe hain
              stock_quantity: quantity, // ✅ Us size ki quantity
              is_available: quantity > 0,
            });
          });
        }
      }

      if (mediaUrls && Array.isArray(mediaUrls)) {
        const imagesSet = new Set(mediaUrls);

        // ✅ Add cover image manually if it's not part of mediaUrls
        if (cover_image && !imagesSet.has(cover_image)) {
          imageDataArray.push({
            image_id: uuidv4(),
            product_id: productId,
            image_url: cover_image,
            is_primary: true, // ✅ Mark it as primary
          });
        }

        mediaUrls.forEach((mediaUrl) => {
          imageDataArray.push({
            image_id: uuidv4(),
            product_id: productId,
            image_url: mediaUrl,
            is_primary: mediaUrl === cover_image,
          });
        });

        // ✅ If no image marked as primary, mark the first one
        const hasPrimary = imageDataArray.some(
          (img) => img.product_id === productId && img.is_primary
        );

        if (!hasPrimary) {
          const firstImg = imageDataArray.find(
            (img) => img.product_id === productId
          );
          if (firstImg) firstImg.is_primary = true;
        }
      }
    }

    if (savedProducts.length > 0) await Product.insertMany(savedProducts);
    if (pricingDataArray.length > 0) await Pricing.insertMany(pricingDataArray);
    if (stockDataArray.length > 0)
      await ProductStock.insertMany(stockDataArray);
    if (imageDataArray.length > 0)
      await ProductImage.insertMany(imageDataArray);

    res.status(201).json({
      status: "1",
      message: "Products uploaded successfully",
      products: savedProducts,
    });
  } catch (error) {
    console.error("Error uploading products:", error);
    res.status(500).json({
      status: "0",
      message: "Error uploading products",
      error: error.message,
    });
  }
};

// get all products
const getAllProductsWithDetails = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 }).lean();

    const finalProducts = await Promise.all(
      products.map(async (product) => {
        const category = await Category.findOne({
          category_id: product.category_id,
        });
        const subcategory = await Subcategory.findOne({
          Subcategory_id: product.Subcategory_id,
        });

        // ✅ Fetch all pricing history for the product
        const pricingRecords = await Pricing.find({
          product_id: product.product_id,
        });

        // ✅ Fetch stock details for the product
        const stockRecords = await ProductStock.find({
          product_id: product.product_id,
        });

        // ✅ Fetch product images
        const images = await ProductImage.find({
          product_id: product.product_id,
        });

        // ✅ Extract latest pricing (only active price)
        const activePricing = pricingRecords.find((pricing) =>
          pricing.price_detail.some((price) => price.is_active === true)
        );

        let latestPricing = null;
        if (activePricing) {
          const activePriceDetail = activePricing.price_detail.find(
            (price) => price.is_active === true
          );
          latestPricing = {
            _id: activePricing._id,
            price_id: activePricing.price_id,
            product_id: activePricing.product_id,
            currency: activePricing.currency,
            sku: activePricing.sku,
            price_detail: {
              original_price: activePriceDetail.original_price,
              discount_percent: activePriceDetail.discount_percent,
              discounted_price:
                activePriceDetail.original_price -
                (activePriceDetail.original_price *
                  activePriceDetail.discount_percent) /
                100,
              is_active: activePriceDetail.is_active,
              created_at: activePriceDetail.created_at,
              _id: activePriceDetail._id,
            },
            __v: activePricing.__v,
            createdAt: activePricing.createdAt,
            updatedAt: activePricing.updatedAt,
          };
        }

        return {
          product_id: product.product_id,
          productUniqueId: product.productUniqueId,
          product_name: product.product_name,
          description: product.description,
          brand: product.brand,
          category_id: product.category_id,
          subcategory_id: product.Subcategory_id,
          status: product.status,
          featuredSection: product.featuredSection,
          attributes: product.attributes,
          seo: product.seo,
          qrCode: product.qrCode ?? null, // ✅ Safe fallback to null
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          category: category
            ? {
              category_id: category.category_id,
              category_name: category.category_name,
              category_description: category.category_description,
              category_status: category.status,
              createdAt: category.createdAt,
              updatedAt: category.updatedAt,
            }
            : null,

          subcategory: subcategory
            ? {
              Subcategory_id: subcategory.Subcategory_id,
              Subcategory_name: subcategory.Subcategory_name,
              Subcategory_description: subcategory.Subcategory_description,
              Subcategory_status: subcategory.status,
              createdAt: subcategory.createdAt,
              updatedAt: subcategory.updatedAt,
            }
            : null,

          // ✅ Updated Latest Pricing
          latest_pricing: latestPricing,

          // ✅ Pricing History (All Records)
          pricing_history: pricingRecords.map((pricing) => ({
            price_id: pricing.price_id,
            currency: pricing.currency,
            sku: pricing.sku,
            price_detail: pricing.price_detail.map((price) => ({
              original_price: price.original_price,
              discount_percent: price.discount_percent,
              discounted_price:
                price.original_price -
                (price.original_price * price.discount_percent) / 100,
              is_active: price.is_active,
              created_at: price.created_at,
              _id: price._id,
            })),
          })),

          // ✅ Stock Details (All Vendors)
          stock_details: stockRecords.map((stock) => ({
            stock_id: stock.stock_id,
            size: stock.size,
            stock_quantity: stock.stock_quantity,
            is_available: stock.is_available,
            last_updated: stock.last_updated,
          })),

          images: images,
        };
      })
    );

    res.status(200).json({ status: "1", success: true, data: finalProducts });
  } catch (error) {
    res.status(500).json({
      status: "0",
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// Get a single product by ID with all details
const getOneProductWithDetails = async (req, res) => {
  try {
    const { product_id } = req.params;

    // Find the product
    const product = await Product.findOne({ product_id });
    if (!product) {
      return res
        .status(404)
        .json({ status: "0", success: false, message: "Product not found" });
    }

    // Fetch category and subcategory
    const category = await Category.findOne({
      category_id: product.category_id,
    });
    const subcategory = await Subcategory.findOne({
      Subcategory_id: product.Subcategory_id,
    });

    // Fetch pricing records
    const pricingRecords = await Pricing.find({
      product_id: product.product_id,
    });

    // ✅ Extract latest pricing (only active price)
    const activePricing = pricingRecords.find((pricing) =>
      pricing.price_detail.some((price) => price.is_active === true)
    );

    let latestPricing = null;
    if (activePricing) {
      const activePriceDetail = activePricing.price_detail.find(
        (price) => price.is_active === true
      );
      latestPricing = {
        _id: activePricing._id,
        price_id: activePricing.price_id,
        product_id: activePricing.product_id,
        currency: activePricing.currency,
        sku: activePricing.sku,
        price_detail: {
          original_price: activePriceDetail.original_price,
          discount_percent: activePriceDetail.discount_percent,
          discounted_price:
            activePriceDetail.original_price -
            (activePriceDetail.original_price *
              activePriceDetail.discount_percent) /
            100,
          is_active: activePriceDetail.is_active,
          created_at: activePriceDetail.created_at,
          _id: activePriceDetail._id,
        },
        __v: activePricing.__v,
        createdAt: activePricing.createdAt,
        updatedAt: activePricing.updatedAt,
      };
    }

    // Fetch stock records
    const stockRecords = await ProductStock.find({
      product_id: product.product_id,
    });
    const historyPrising = pricingRecords.map((pricing) => ({
      price_id: pricing.price_id,
      currency: pricing.currency,
      sku: pricing.sku,
      price_detail: pricing.price_detail.map((price) => ({
        original_price: price.original_price,
        discount_percent: price.discount_percent,
        discounted_price:
          price.original_price -
          (price.original_price * price.discount_percent) / 100,
        is_active: price.is_active,
        created_at: price.created_at,
        _id: price._id,
      })),
    }));

    // Fetch product images
    const images = await ProductImage.find({ product_id: product.product_id });

    // Prepare response
    const productDetails = {
      product_id: product.product_id,
      productUniqueId: product.productUniqueId,
      product_name: product.product_name,
      description: product.description,
      brand: product.brand,
      category_id: product.category_id,
      subcategory_id: product.Subcategory_id,
      status: product.status,
      featuredSection: product.featuredSection,
      attributes: product.attributes,
      seo: product.seo,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      category,
      subcategory,
      latest_pricing: latestPricing,
      pricing_history: historyPrising,
      stock_details: stockRecords,
      images,
    };

    return res
      .status(200)
      .json({ status: "1", success: true, data: productDetails });
  } catch (error) {
    console.error("Error fetching product details:", error);
    return res.status(500).json({
      status: "0",
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// update product with product_id
const updateProducts = async (req, res) => {
  try {
    const { product_id } = req.params;
    const {
      product_name,
      description,
      brand,
      category_id,
      Subcategory_id,
      featuredSection,
      attributes,
      pricing,
      stock,
      mediaUrls = [],
      cover_image,
      seo,
    } = req.body;

    // Check if product exists
    const existingProduct = await Product.findOne({ product_id });
    if (!existingProduct) {
      return res
        .status(404)
        .json({ status: "0", message: "Product not found" });
    }

    // Update product fields
    existingProduct.product_name = product_name || existingProduct.product_name;
    existingProduct.description = description || existingProduct.description;
    existingProduct.brand = brand || existingProduct.brand;
    existingProduct.category_id = category_id || existingProduct.category_id;
    existingProduct.Subcategory_id =
      Subcategory_id || existingProduct.Subcategory_id;
    existingProduct.attributes = attributes || existingProduct.attributes;
    existingProduct.featuredSection =
      featuredSection || existingProduct.featuredSection;

    // Handle SEO and QR code regeneration if needed
    if (seo) {
      const updatedSlug = seo.slug || existingProduct.seo.slug;
      const updatedCanonical = `${updatedSlug}-${product_id}`;

      existingProduct.seo = {
        slug: updatedSlug,
        metaTitle: seo.metaTitle || existingProduct.seo.metaTitle,
        metaDescription:
          seo.metaDescription || existingProduct.seo.metaDescription,
        keywords: seo.keywords || existingProduct.seo.keywords,
        canonicalURL: updatedCanonical,
      };

      // ✅ Only generate QR code if it doesn't exist
      if (!existingProduct.qrCode) {
        const frontendURL = `https://backend.gaurastra.com/productQR/${existingProduct.productUniqueId}`;
        // const qrCodeData = await QRCode.toDataURL(frontendURL);
        const qrCodeData = frontendURL; // ✅ Store the URL, not Base64 image

        existingProduct.qrCode = qrCodeData;
      }
    }

    // Save updated product
    await existingProduct.save();

    // Update pricing if provided
    if (pricing) {
      const existingPricing = await Pricing.findOne({ product_id });
      if (existingPricing) {
        existingPricing.sku = pricing.sku || existingPricing.sku;
        existingPricing.currency = pricing.currency || existingPricing.currency;

        existingPricing.price_detail.forEach(
          (price) => (price.is_active = false)
        );

        if (pricing.original_price || pricing.discount_percent) {
          existingPricing.price_detail.push({
            original_price:
              pricing.original_price || existingPricing.original_price,
            discount_percent:
              pricing.discount_percent || existingPricing.discount_percent,
            is_active: true,
            created_at: new Date(),
          });
        }

        await existingPricing.save();
      }
    }

    // Update stock if provided
    if (stock) {
      const existingStock = await ProductStock.findOne({ product_id });
      if (existingStock) {
        existingStock.stock_quantity = stock.quantity;
        existingStock.is_available = stock.quantity > 0;
        await existingStock.save();
      }
    }

    // Handle images
    if (cover_image) {
      const existingImages = await ProductImage.find({ product_id });

      await ProductImage.updateMany(
        { product_id },
        { $set: { is_primary: false } }
      );

      let coverImageRecord = existingImages.find(
        (img) => img.image_url === cover_image
      );

      if (coverImageRecord) {
        await ProductImage.updateOne(
          { image_id: coverImageRecord.image_id },
          { $set: { is_primary: true } }
        );
      } else {
        coverImageRecord = new ProductImage({
          image_id: uuidv4(),
          product_id,
          image_url: cover_image,
          is_primary: true,
        });
        await coverImageRecord.save();
      }

      if (mediaUrls.length > 0) {
        for (const url of mediaUrls) {
          if (url !== cover_image) {
            const exists = existingImages.some((img) => img.image_url === url);
            if (!exists) {
              const newImage = new ProductImage({
                image_id: uuidv4(),
                product_id,
                image_url: url,
                is_primary: false,
              });
              await newImage.save();
            }
          }
        }
      }
    }

    return res.status(200).json({
      status: "1",
      message: "Product updated successfully",
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return res.status(500).json({
      status: "0",
      message: "Error updating product",
      error: error.message,
    });
  }
};

// product delete api with product schema, price schema, image schema, Discount schema
const deleteProductsByID = async (req, res) => {
  try {
    const { product_id } = req.params;

    // Validate product_id
    if (!product_id) {
      return res
        .status(400)
        .json({ status: "0", message: "Product ID is required" });
    }

    // Check if the product exists
    const existingProduct = await Product.findOne({ product_id });
    if (!existingProduct) {
      return res
        .status(404)
        .json({ status: "0", message: "Product not found" });
    }

    // Delete product from all schemas
    await Promise.all([
      Product.deleteOne({ product_id }),
      Pricing.deleteMany({ product_id }),
      ProductImage.deleteMany({ product_id }),
      ProductStock.deleteMany({ product_id }),
      Discount.deleteMany({ product_id }),
    ]);

    return res.status(200).json({
      status: "1",
      message: "Product and related records deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    return res.status(500).json({
      status: "0",
      message: "Error deleting product",
      error: error.message,
    });
  }
};

// advanse filter api
const filterProductDetails = async (req, res) => {
  try {
    const {
      category_name,
      subcategory_name,
      min_price,
      max_price,
      sort,
      search,
      on_sale,
    } = req.body;


    // console.log('apii calll...')

    let filter = {};


    // -------------------------------
    // ✅ CATEGORY NAME → category_id
    // -------------------------------
    
    if (category_name) {
      let cleanCate = cleanString(category_name);

      // console.log(cleanCate)
      
      const category = await Category.findOne({
        category_name: cleanCate
      }).select("category_id");
      if (category) filter.category_id = category.category_id;
    }

    // ------------------------------------
    // ✅ SUBCATEGORY NAME → Subcategory_id
    // ------------------------------------

   

    if (subcategory_name) {
      let cleanSubCate = cleanString(subcategory_name);
      const subcategory = await Subcategory.findOne({
        Subcategory_name: cleanSubCate
      }).select("Subcategory_id");
      if (subcategory) filter.Subcategory_id = subcategory.Subcategory_id;
    }


    // ------------------------------------
    // ✅ SEARCH FILTER (Product Name, Brand, Description, SEO, Attributes)
    // ------------------------------------
    if (search) {
      filter.$or = [
        { product_name: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { "seo.metaTitle": { $regex: search, $options: "i" } },
        { "seo.metaDescription": { $regex: search, $options: "i" } },
        { "seo.keywords": { $regex: search, $options: "i" } },
        { attributes: { $regex: search, $options: "i" } } // dynamic attributes search
      ];
    }

    // -------------------------------
    // ✅ GET PRODUCTS
    // -------------------------------


    // console.log('filter',filter)
    const products = await Product.find(filter);

    const filteredProducts = await Promise.all(
      products.map(async (product) => {
        const [
          category,
          subcategory,
          pricingRecords,
          stockRecords,
          images,
          discount,
        ] = await Promise.all([
          Category.findOne({ category_id: product.category_id }),
          Subcategory.findOne({ Subcategory_id: product.Subcategory_id }),
          Pricing.find({ product_id: product.product_id }),
          ProductStock.find({ product_id: product.product_id }),
          ProductImage.find({ product_id: product.product_id }),
          Discount.findOne({
            product_id: product.product_id,
            is_active: true,
            start_date: { $lte: new Date() },
            end_date: { $gte: new Date() },
          }),
        ]);

        // -------------------------------
        // ✅ ON SALE FILTER
        // -------------------------------
        if (on_sale && !discount) return null;

        // -------------------------------
        // ✅ PRICE RANGE FILTER
        // -------------------------------
        if (min_price || max_price) {
          const inPriceRange = pricingRecords.some((pricing) => {
            return pricing.price_detail.some((price) => {
              const discountedPrice =
                price.original_price -
                (price.original_price * price.discount_percent) / 100;

              return (
                (!min_price || discountedPrice >= min_price) &&
                (!max_price || discountedPrice <= max_price)
              );
            });
          });
          if (!inPriceRange) return null;
        }

        // ---------------------------------------
        // ✅ Extract latest active pricing
        // ---------------------------------------
        const activePricing = pricingRecords.find((pricing) =>
          pricing.price_detail.some((price) => price.is_active === true)
        );

        let latestPricing = null;
        if (activePricing) {
          const activePriceDetail = activePricing.price_detail.find(
            (price) => price.is_active === true
          );

          latestPricing = {
            _id: activePricing._id,
            price_id: activePricing.price_id,
            product_id: activePricing.product_id,
            currency: activePricing.currency,
            sku: activePricing.sku,
            price_detail: {
              original_price: activePriceDetail.original_price,
              discount_percent: activePriceDetail.discount_percent,
              discounted_price:
                activePriceDetail.original_price -
                (activePriceDetail.original_price * activePriceDetail.discount_percent) / 100,
              is_active: activePriceDetail.is_active,
              created_at: activePriceDetail.created_at,
              _id: activePriceDetail._id,
            },
          };
        }

        // ---------------------------------------
        // RETURN PRODUCT DETAILS
        // ---------------------------------------
        return {
          product_id: product.product_id,
          productUniqueId: product.productUniqueId,
          product_name: product.product_name,
          description: product.description,
          brand: product.brand,
          category_id: product.category_id,
          subcategory_id: product.Subcategory_id,
          status: product.status,
          featuredSection: product.featuredSection,
          attributes: product.attributes,
          seo: product.seo,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,

          category: category || null,
          subcategory: subcategory || null,

          latest_pricing: latestPricing,

          pricing_history: pricingRecords.map((pricing) => ({
            price_id: pricing.price_id,
            currency: pricing.currency,
            sku: pricing.sku,
            price_detail: pricing.price_detail.map((price) => ({
              original_price: price.original_price,
              discount_percent: price.discount_percent,
              discounted_price:
                price.original_price -
                (price.original_price * price.discount_percent) / 100,
              is_active: price.is_active,
              created_at: price.created_at,
            })),
          })),

          stock_details: stockRecords.map((stock) => ({
            stock_id: stock.stock_id,
            size: stock.size,
            stock_quantity: stock.stock_quantity,
            is_available: stock.is_available,
            last_updated: stock.last_updated,
          })),

          discount: discount
            ? {
              discount_id: discount.discount_id,
              discount_type: discount.discount_type,
              value: discount.value,
              start_date: discount.start_date,
              end_date: discount.end_date,
              is_active: discount.is_active,
            }
            : null,

          images: images,
        };
      })
    );

    let finalProducts = filteredProducts.filter((p) => p !== null);

    // -------------------------------
    // ✅ SORTING
    // -------------------------------
    if (sort) {
      switch (sort) {
        case "price_low_to_high":
          finalProducts.sort(
            (a, b) =>
              (a.latest_pricing?.price_detail.discounted_price || Infinity) -
              (b.latest_pricing?.price_detail.discounted_price || Infinity)
          );
          break;

        case "price_high_to_low":
          finalProducts.sort(
            (a, b) =>
              (b.latest_pricing?.price_detail.discounted_price || 0) -
              (a.latest_pricing?.price_detail.discounted_price || 0)
          );
          break;

        case "A_to_Z":
          finalProducts.sort((a, b) => a.product_name.localeCompare(b.product_name));
          break;

        case "Z_to_A":
          finalProducts.sort((a, b) => b.product_name.localeCompare(a.product_name));
          break;

        case "new_arrivals":
          finalProducts.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          );
          break;
      }
    }

    res.status(200).json({ status: "1", success: true, data: finalProducts });

  } catch (error) {
    res.status(500).json({
      status: "0",
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};


// advanced filter side bar category and sub category
const sideBarsProduct = async (req, res) => {
  try {
    // Fetch all categories
    const categories = await Category.find({ status: "Active" });

    if (!categories.length) {
      return res.status(404).json({
        success: false,
        message: "No categories found",
      });
    }

    // Fetch all subcategories
    const subcategories = await Subcategory.find({ status: "Active" });

    // Merge categories with their respective subcategories
    const mergedData = categories.map((category) => {
      const relatedSubcategories = subcategories.filter(
        (sub) => sub.category_id === category.category_id
      );

      const formattedSubcategories = relatedSubcategories.map((sub) => {
        const baseData = {
          Subcategory_id: sub.Subcategory_id,
          Subcategory_name: sub.Subcategory_name,
          Subcategory_description: sub.Subcategory_description,
          Subcategory_status: sub.status,
          createdAt: sub.createdAt,
          updatedAt: sub.updatedAt,
        };

        // Add gender field only if category name is "Ethnic Wear"
        if (category.category_name === "Ethnic Wear") {
          return {
            ...baseData,
            gender: sub.gender || null, // if gender not defined, return null
          };
        }

        return baseData;
      });

      return {
        category_id: category.category_id,
        category_name: category.category_name,
        category_description: category.category_description,
        category_status: category.status,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,

        subcategories: formattedSubcategories,
      };
    });

    res.status(200).json({
      success: true,
      data: mergedData,
    });
  } catch (error) {
    console.error(
      "Error fetching sidebar categories and subcategories:",
      error
    );
    res.status(500).json({
      success: false,
      message: "Server Error",
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
        message: "Product ID is required in params",
      });
    }

    // Step 1: Find product
    const product = await Product.findOne({ product_id });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Step 2: Generate new slug and canonicalURL
    const product_name = product.product_name;
    const slug = slugify(product_name, { lower: true });
    const canonicalURL = `${slug}-${product_id}`;

    // Step 3: Update only canonicalURL inside seo
    product.seo.canonicalURL = canonicalURL;
    await product.save();

    // Step 4: Return updated data
    return res.status(200).json({
      success: true,
      message: "Canonical URL updated successfully",
      updatedCanonicalURL: product.seo.canonicalURL,
    });
  } catch (error) {
    console.error("🔥 Error updating canonicalURL:", error.message);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating canonicalURL",
      error: error.message,
    });
  }
};

// Get full product data by canonicalURL
const getDataWithCanonicalurls = async (req, res) => {
  try {
    const { canonicalURL } = req.params;

    if (!canonicalURL) {
      return res.status(400).json({
        status: "0",
        success: false,
        message: "Canonical URL is required",
      });
    }

    // Step 1: Find the product by canonicalURL
    const product = await Product.findOne({
      "seo.canonicalURL": `${canonicalURL}`,
    });
    if (!product) {
      return res.status(404).json({
        status: "0",
        success: false,
        message: "Product not found",
      });
    }

    // Step 2: Fetch category and subcategory
    const category = await Category.findOne({
      category_id: product.category_id,
    });
    const subcategory = await Subcategory.findOne({
      Subcategory_id: product.Subcategory_id,
    });

    // Step 3: Fetch pricing records
    const pricingRecords = await Pricing.find({
      product_id: product.product_id,
    });

    // ✅ Extract latest pricing (only active price)
    const activePricing = pricingRecords.find((pricing) =>
      pricing.price_detail.some((price) => price.is_active === true)
    );

    let latestPricing = null;
    if (activePricing) {
      const activePriceDetail = activePricing.price_detail.find(
        (price) => price.is_active === true
      );
      latestPricing = {
        _id: activePricing._id,
        price_id: activePricing.price_id,
        product_id: activePricing.product_id,
        currency: activePricing.currency,
        sku: activePricing.sku,
        price_detail: {
          original_price: activePriceDetail.original_price,
          discount_percent: activePriceDetail.discount_percent,
          discounted_price:
            activePriceDetail.original_price -
            (activePriceDetail.original_price *
              activePriceDetail.discount_percent) /
            100,
          is_active: activePriceDetail.is_active,
          created_at: activePriceDetail.created_at,
          _id: activePriceDetail._id,
        },
        __v: activePricing.__v,
        createdAt: activePricing.createdAt,
        updatedAt: activePricing.updatedAt,
      };
    }

    // Step 4: Fetch stock records
    const stockRecords = await ProductStock.find({
      product_id: product.product_id,
    });

    // Step 5: Pricing history
    const historyPrising = pricingRecords.map((pricing) => ({
      price_id: pricing.price_id,
      currency: pricing.currency,
      sku: pricing.sku,
      price_detail: pricing.price_detail.map((price) => ({
        original_price: price.original_price,
        discount_percent: price.discount_percent,
        discounted_price:
          price.original_price -
          (price.original_price * price.discount_percent) / 100,
        is_active: price.is_active,
        created_at: price.created_at,
        _id: price._id,
      })),
    }));

    // Step 6: Product images
    const images = await ProductImage.find({ product_id: product.product_id });

    // Step 7: Prepare response
    const productDetails = {
      product_id: product.product_id,
      productUniqueId: product.productUniqueId,
      product_name: product.product_name,
      description: product.description,
      brand: product.brand,
      category_id: product.category_id,
      subcategory_id: product.Subcategory_id,
      status: product.status,
      featuredSection: product.featuredSection,
      attributes: product.attributes,
      seo: product.seo,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      category,
      subcategory,
      latest_pricing: latestPricing,
      pricing_history: historyPrising,
      stock_details: stockRecords,
      images,
    };

    return res.status(200).json({
      status: "1",
      success: true,
      data: productDetails,
    });
  } catch (error) {
    console.error("❌ Error fetching product with canonicalURL:", error);
    return res.status(500).json({
      status: "0",
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Suggestion products API
const getProductSuggestions = async (req, res) => {
  try {
    const { canonicalURL } = req.params;

    if (!canonicalURL) {
      return res
        .status(400)
        .json({ success: false, message: "canonicalURL is required" });
    }

    // 1. Find Main Product
    const mainProduct = await Product.findOne({
      "seo.canonicalURL": canonicalURL,
    }).lean();

    if (!mainProduct) {
      return res
        .status(404)
        .json({ success: false, message: "Main product not found" });
    }

    const { Subcategory_id, brand, product_id, attributes = {} } = mainProduct;

    // 2. Find Similar Products
    const similarProducts = await Product.find({
      Subcategory_id,
      product_id: { $ne: product_id },
    })
      .limit(20)
      .lean();

    const productIds = similarProducts.map((p) => p.product_id);
    const categoryIds = similarProducts.map((p) => p.category_id);
    const subcategoryIds = similarProducts.map((p) => p.Subcategory_id);

    // 3. Prefetch related collections
    const [categories, subcategories, images, pricing, stock] =
      await Promise.all([
        Category.find({ category_id: { $in: categoryIds } }).lean(),
        Subcategory.find({ Subcategory_id: { $in: subcategoryIds } }).lean(),
        ProductImage.find({ product_id: { $in: productIds } }).lean(),
        Pricing.find({ product_id: { $in: productIds } }).lean(),
        ProductStock.find({ product_id: { $in: productIds } }).lean(),
      ]);

    // 4. Indexing maps
    const categoryMap = Object.fromEntries(
      categories.map((c) => [c.category_id, c])
    );
    const subcategoryMap = Object.fromEntries(
      subcategories.map((s) => [s.Subcategory_id, s])
    );
    const imageMap = productIds.reduce((acc, id) => {
      acc[id] = images.filter((img) => img.product_id === id);
      return acc;
    }, {});

    const pricingMap = Object.fromEntries(
      pricing.map((p) => [p.product_id, p])
    );

    const stockMap = stock.reduce((acc, s) => {
      if (!acc[s.product_id]) {
        acc[s.product_id] = [];
      }
      acc[s.product_id].push(s);
      return acc;
    }, {});

    // 5. Matching logic
    const getMatchScore = (targetAttr, targetBrand) => {
      let score = 0;
      for (let key in attributes) {
        if (
          targetAttr[key] &&
          JSON.stringify(targetAttr[key]) === JSON.stringify(attributes[key])
        ) {
          score++;
        }
      }
      if (targetBrand === brand) score += 1;
      return score;
    };

    // 6. Final structure like full detail API
    const suggestions = similarProducts.map((product) => {
      const productPricing = pricingMap[product.product_id] || {};
      const productStock = stockMap[product.product_id] || [];

      // Transform pricing data to match desired structure
      const pricing_history = productPricing.price_id
        ? [
          {
            price_id: productPricing.price_id,
            currency: productPricing.currency || "INR",
            sku: productPricing.sku,
            price_detail:
              productPricing.price_detail?.map((detail) => ({
                original_price: detail.original_price,
                discount_percent: detail.discount_percent,
                discounted_price: detail.discounted_price,
                is_active: detail.is_active,
                created_at: detail.created_at,
                _id: detail._id,
              })) || [],
          },
        ]
        : [];

      // Transform stock data to match desired structure
      const stock_details = productStock.map((stockItem) => ({
        _id: stockItem._id,
        stock_id: stockItem.stock_id,
        product_id: stockItem.product_id,
        size: stockItem.size,
        stock_quantity: stockItem.stock_quantity,
        is_available: stockItem.is_available,
        last_updated: stockItem.last_updated,
        __v: stockItem.__v,
        createdAt: stockItem.createdAt,
        updatedAt: stockItem.updatedAt,
      }));

      return {
        product_id: product.product_id,
        productUniqueId: product.productUniqueId,
        product_name: product.product_name,
        description: product.description,
        brand: product.brand,
        attributes: product.attributes,
        status: product.status,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        seo: product.seo || {},
        category: categoryMap[product.category_id] || null,
        subcategory: subcategoryMap[product.Subcategory_id] || null,
        pricing_history,
        stock_details,
        images: imageMap[product.product_id] || [],
        match_score: getMatchScore(product.attributes, product.brand),
      };
    });

    // 7. Sort by best match
    suggestions.sort((a, b) => b.match_score - a.match_score);

    return res.status(200).json({
      success: true,
      suggestions,
    });
  } catch (err) {
    console.error("🔥 Error in getProductSuggestions:", err.message);
    return res
      .status(500)
      .json({ success: false, message: "Server Error", error: err.message });
  }
};

const getDataWithUniqueId = async (req, res) => {
  try {
    const { productUniqueId } = req.params;

    if (!productUniqueId) {
      return res.status(400).json({
        status: "0",
        success: false,
        message: "Product Unique ID is required",
      });
    }

    // Step 1: Find product by productUniqueId
    const product = await Product.findOne({ productUniqueId: productUniqueId });
    if (!product) {
      return res.status(404).json({
        status: "0",
        success: false,
        message: "Product not found",
      });
    }

    // Step 2: Get category and subcategory
    const category = await Category.findOne({
      category_id: product.category_id,
    });
    const subcategory = await Subcategory.findOne({
      Subcategory_id: product.Subcategory_id,
    });

    // Step 3: Get all pricing records
    const pricingRecords = await Pricing.find({
      product_id: product.product_id,
    });

    // ✅ Step 3.1: Find active pricing
    const activePricing = pricingRecords.find((pricing) =>
      pricing.price_detail.some((price) => price.is_active === true)
    );

    let latestPricing = null;
    if (activePricing) {
      const activePriceDetail = activePricing.price_detail.find(
        (price) => price.is_active === true
      );

      latestPricing = {
        _id: activePricing._id,
        price_id: activePricing.price_id,
        product_id: activePricing.product_id,
        currency: activePricing.currency,
        sku: activePricing.sku,
        price_detail: {
          original_price: activePriceDetail.original_price,
          discount_percent: activePriceDetail.discount_percent,
          discounted_price:
            activePriceDetail.original_price -
            (activePriceDetail.original_price *
              activePriceDetail.discount_percent) /
            100,
          is_active: activePriceDetail.is_active,
          created_at: activePriceDetail.created_at,
          _id: activePriceDetail._id,
        },
        __v: activePricing.__v,
        createdAt: activePricing.createdAt,
        updatedAt: activePricing.updatedAt,
      };
    }

    // Step 4: Get stock info
    const stockRecords = await ProductStock.find({
      product_id: product.product_id,
    });

    // Step 5: Price history
    const historyPrising = pricingRecords.map((pricing) => ({
      price_id: pricing.price_id,
      currency: pricing.currency,
      sku: pricing.sku,
      price_detail: pricing.price_detail.map((price) => ({
        original_price: price.original_price,
        discount_percent: price.discount_percent,
        discounted_price:
          price.original_price -
          (price.original_price * price.discount_percent) / 100,
        is_active: price.is_active,
        created_at: price.created_at,
        _id: price._id,
      })),
    }));

    // Step 6: Product images
    const images = await ProductImage.find({ product_id: product.product_id });

    // Step 7: Prepare response
    const productDetails = {
      product_id: product.product_id,
      productUniqueId: product.productUniqueId,
      product_name: product.product_name,
      description: product.description,
      brand: product.brand,
      category_id: product.category_id,
      subcategory_id: product.Subcategory_id,
      status: product.status,
      featuredSection: product.featuredSection,
      attributes: product.attributes,
      seo: product.seo,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      category,
      subcategory,
      latest_pricing: latestPricing,
      pricing_history: historyPrising,
      stock_details: stockRecords,
      images,
    };

    return res.status(200).json({
      status: "1",
      success: true,
      data: productDetails,
    });
  } catch (error) {
    console.error("❌ Error fetching product with productUniqueId:", error);
    return res.status(500).json({
      status: "0",
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  bulkUploadProducts,
  getAllProductsWithDetails,
  filterProductDetails,
  getOneProductWithDetails,
  sideBarsProduct,
  updateProducts,
  deleteProductsByID,
  updateCanonicalURL,
  getDataWithCanonicalurls,
  getProductSuggestions,
  getDataWithUniqueId,
};

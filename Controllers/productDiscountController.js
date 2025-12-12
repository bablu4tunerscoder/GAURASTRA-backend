const { v4: uuidv4 } = require("uuid");
const Product = require("../Models/ProductModel");
const Discount = require("../Models/ProductDiscountModel");
const Pricing = require("../Models/ProductPricingModel");
const ProductStock = require("../Models/ProductStockModel");
const { pagination_ } = require("../Utils/pagination_");
// 1.==> For percentage, value is the discount percentage (e.g., 20 for 20% off).
// {
//     "discount_type": "percentage",
//     "value": 20  // 20% discount
//   }

// 2.==> For flat, value is the exact amount (e.g., 500 for ₹500 off).
// {
//     "discount_type": "flat",
//     "value": 500  // ₹500 discount
//   }

// 3.==> For bogo, value is how many free items you give (e.g., 1 for Buy 1 Get 1 Free).
// {
//     "discount_type": "bogo",
//     "value": 1  // Buy 1, Get 1 Free
//   }

// create dicounts
const createDiscount = async (req, res) => {
  try {
    const {
      product_id,
      discount_type,
      value,
      start_date,
      end_date,
      is_active,
    } = req.body;

    // Check if product exists
    const product = await Product.findOne({ product_id });
    if (!product) {
      return res.status(404).json({
        status: "0",
        success: false,
        message: "Product not found",
      });
    }

    // Validate discount type
    if (!["percentage", "flat", "bogo"].includes(discount_type)) {
      return res.status(400).json({
        status: "0",
        success: false,
        message: "Invalid discount type",
      });
    }

    // Create a new discount
    const newDiscount = new Discount({
      discount_id: uuidv4(),
      product_id,
      discount_type,
      value,
      start_date,
      end_date,
      is_active: is_active ?? true, // Default to true if not provided
    });

    await newDiscount.save();

    res.status(201).json({
      status: "1",
      success: true,
      message: "Discount created successfully",
      data: newDiscount,
    });
  } catch (error) {
    res.status(500).json({
      status: "0",
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// find all discount with product_id
const findAllWithProductId = async (req, res) => {
  try {
    const { product_id } = req.params;

    if (!product_id) {
      return res
        .status(400)
        .json({ success: false, message: "Product ID is required" });
    }

    // Extract Pagination
    const { page, limit, skip, hasPrevPage } = pagination_(req.query, {
      defaultLimit: 10,
      maxLimit: 20,
    });

    // Discounts + total count in parallel
    const [discounts, totalRecords] = await Promise.all([
      Discount.find({ product_id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Discount.countDocuments({ product_id }),
    ]);

    if (totalRecords === 0) {
      return res.status(404).json({
        success: false,
        message: "No discounts found for this product",
      });
    }

    // Fetch product details
    const product = await Product.findOne({ product_id });
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Fetch pricing + stock info
    const [pricingRecords, stockRecords] = await Promise.all([
      Pricing.find({ product_id }),
      ProductStock.find({ product_id }),
    ]);

    const response = {
      product_details: {
        product_id: product.product_id,
        product_name: product.product_name,
        description: product.description,
        brand: product.brand,
        category_id: product.category_id,
        Subcategory_id: product.Subcategory_id,
        status: product.status,
        attributes: product.attributes,
        seo: product.seo,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      },

      // Paginated Discounts
      discounts: discounts.map((discount) => ({
        discount_id: discount.discount_id,
        discount_type: discount.discount_type,
        value: discount.value,
        start_date: discount.start_date,
        end_date: discount.end_date,
        is_active: discount.is_active,
        createdAt: discount.createdAt,
        updatedAt: discount.updatedAt,
      })),

      // Pricing History
      pricing: pricingRecords.map((pricing) => ({
        price_id: pricing.price_id,
        currency: pricing.currency,
        sku: pricing.sku,
        price_history: pricing.price_detail.map((price) => ({
          original_price: price.original_price,
          discount_percent: price.discount_percent,
          discounted_price:
            price.original_price -
            (price.original_price * price.discount_percent) / 100,
          is_active: price.is_active,
          created_at: price.created_at,
        })),
      })),

      // Stock Details
      stock_details: stockRecords.map((stock) => ({
        stock_id: stock.stock_id,
        stock_quantity: stock.stock_quantity,
        is_available: stock.is_available,
        last_updated: stock.last_updated,
      })),
    };

    const totalPages = Math.ceil(totalRecords / limit);
    const hasNextPage = page < totalPages;

    return res.status(200).json({
      success: true,

      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasPrevPage,
        hasNextPage,
      },

      data: response,
    });
  } catch (error) {
    console.error("Error fetching product details with discount:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};


// find all discounts
const findAllWithDiscounts = async (req, res) => {
  try {
    // Fetch all products with discounts
    const discounts = await Discount.find({});

    if (discounts.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No discounts found.",
      });
    }

    // Collect all product_ids from the discounts
    const productIds = discounts.map((discount) => discount.product_id);

    // Fetch all related products
    const products = await Product.find({ product_id: { $in: productIds } });

    // Fetch all related pricing records
    const pricingRecords = await Pricing.find({
      product_id: { $in: productIds },
    });

    // Fetch all related stock records
    const stockRecords = await ProductStock.find({
      product_id: { $in: productIds },
    });

    // Map products with their corresponding discounts, pricing, and stock details
    const response = products.map((product) => {
      const productDiscounts = discounts.filter(
        (discount) => discount.product_id === product.product_id
      );

      const productPricing = pricingRecords.filter(
        (pricing) => pricing.product_id === product.product_id
      );

      const productStock = stockRecords.filter(
        (stock) => stock.product_id === product.product_id
      );

      return {
        product_details: {
          product_id: product.product_id,
          product_name: product.product_name,
          description: product.description,
          brand: product.brand,
          category_id: product.category_id,
          Subcategory_id: product.Subcategory_id,
          status: product.status,
          attributes: product.attributes,
          seo: product.seo,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        },

        discounts: productDiscounts.map((discount) => ({
          discount_id: discount.discount_id,
          discount_type: discount.discount_type,
          value: discount.value,
          start_date: discount.start_date,
          end_date: discount.end_date,
          is_active: discount.is_active,
          createdAt: discount.createdAt,
          updatedAt: discount.updatedAt,
        })),

        pricing: productPricing.map((pricing) => ({
          price_id: pricing.price_id,
          currency: pricing.currency,
          sku: pricing.sku,
          price_history: pricing.price_detail.map((price) => ({
            original_price: price.original_price,
            discount_percent: price.discount_percent,
            discounted_price:
              price.original_price -
              (price.original_price * price.discount_percent) / 100,
            is_active: price.is_active,
            created_at: price.created_at,
          })),
        })),

        stock_details: productStock.map((stock) => ({
          stock_id: stock.stock_id,
          stock_quantity: stock.stock_quantity,
          is_available: stock.is_available,
          last_updated: stock.last_updated,
        })),
      };
    });

    res.status(200).json({ success: true, data: response });
  } catch (error) {
    console.error("Error fetching all products with discounts:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

module.exports = {
  createDiscount,
  findAllWithProductId,
  findAllWithDiscounts,
};

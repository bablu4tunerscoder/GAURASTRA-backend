const Product = require("../Models/ProductModel");
const Discount = require("../Models/ProductDiscountModel");
const Pricing = require("../Models/ProductPricingModel");
const ProductStock = require("../Models/ProductStockModel");
const { pagination_ } = require("../utilities/pagination_");


const createDiscount = async (req, res) => {
  try {
    const {
      product_id,
      sku,
      discount_type,
      value,
      bogo,
      start_date,
      end_date,
      is_active
    } = req.body;

    // 1️⃣ Product validation
    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: "product_id is required"
      });
    }

    const product = await Product.findById(product_id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    // 2️⃣ Discount type validation
    if (!["percentage", "flat", "bogo"].includes(discount_type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid discount type"
      });
    }

    // 3️⃣ Type based validation
    if (discount_type === "percentage") {
      if (value <= 0 || value > 100) {
        return res.status(400).json({
          success: false,
          message: "Percentage discount must be between 1 and 100"
        });
      }
    }

    if (discount_type === "flat") {
      if (value <= 0) {
        return res.status(400).json({
          success: false,
          message: "Flat discount must be greater than 0"
        });
      }
    }

    if (discount_type === "bogo") {
      if (!bogo || !bogo.buy || !bogo.get) {
        return res.status(400).json({
          success: false,
          message: "BOGO requires buy & get values"
        });
      }
    }

    // 4️⃣ Create Discount
    const discount = await Discount.create({
      product_id,
      sku,
      discount_type,
      value: discount_type === "bogo" ? undefined : value,
      bogo: discount_type === "bogo" ? bogo : undefined,
      start_date,
      end_date,
      is_active: is_active ?? true
    });

    return res.status(201).json({
      success: true,
      message: "Discount created successfully",
      data: discount
    });

  } catch (error) {
    console.error("Create Discount Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
};


const findAllWithProductId = async (req, res) => {
  try {
    const { product_id } = req.params;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: "product_id is required"
      });
    }

    const { page, limit, skip, hasPrevPage } = pagination_(req.query, {
      defaultLimit: 10,
      maxLimit: 20
    });

    const [discounts, totalRecords] = await Promise.all([
      Discount.find({ product_id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Discount.countDocuments({ product_id })
    ]);

    if (totalRecords === 0) {
      return res.status(404).json({
        success: false,
        message: "No discounts found for this product"
      });
    }

    const product = await Product.findById(product_id).lean();

    const [pricingRecords, stockRecords] = await Promise.all([
      Pricing.find({ product_id }).lean(),
      ProductStock.find({ product_id }).lean()
    ]);

    const totalPages = Math.ceil(totalRecords / limit);

    return res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasPrevPage,
        hasNextPage: page < totalPages
      },
      data: {
        product_details: product,

        discounts: discounts.map(d => ({
          _id: d._id,
          sku: d.sku,
          discount_type: d.discount_type,
          value: d.value,
          bogo: d.bogo,
          start_date: d.start_date,
          end_date: d.end_date,
          is_active: d.is_active,
          createdAt: d.createdAt
        })),

        pricing: pricingRecords,
        stock_details: stockRecords
      }
    });

  } catch (error) {
    console.error("Find Discount By Product Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
};


const findAllWithDiscounts = async (req, res) => {
  try {
    const discounts = await Discount.find({}).lean();

    if (!discounts.length) {
      return res.status(404).json({
        success: false,
        message: "No discounts found"
      });
    }

    const productIds = discounts.map(d => d.product_id);

    const [products, pricingRecords, stockRecords] = await Promise.all([
      Product.find({ _id: { $in: productIds } }).lean(),
      Pricing.find({ product_id: { $in: productIds } }).lean(),
      ProductStock.find({ product_id: { $in: productIds } }).lean()
    ]);

    const response = products.map(product => {
      const productDiscounts = discounts.filter(
        d => d.product_id.toString() === product._id.toString()
      );

      return {
        product_details: product,
        discounts: productDiscounts,
        pricing: pricingRecords.filter(
          p => p.product_id.toString() === product._id.toString()
        ),
        stock_details: stockRecords.filter(
          s => s.product_id.toString() === product._id.toString()
        )
      };
    });

    res.status(200).json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error("Find All Discounts Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
};

module.exports = {
  createDiscount,
  findAllWithProductId,
  findAllWithDiscounts
};

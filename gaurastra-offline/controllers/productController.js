const Product = require("../models/product");
const Joi = require("joi");
const slugify = require("slugify");
const { v4: uuidv4 } = require("uuid");
const { upload_qr_image } = require("../utils/uploadImage");
const QRCode = require("qrcode");
const { validateToken } = require("../utils/jwt");

const variantSchema = Joi.object({
  color: Joi.string().required(),
  size: Joi.string().required(),
  stock: Joi.number().min(0).default(0),

  actual_price: Joi.number().min(0).required(),
  offer: Joi.number().min(0).default(0),
  offer_type: Joi.string().valid("percentage", "flat", "none").default("none"),
});

const productValidationSchema = Joi.object({
  title: Joi.string().min(2).required(),
  details: Joi.string().allow(""),
  images: Joi.array().items(Joi.string()).default([]),
  active: Joi.boolean().default(true),

  variants: Joi.array().items(variantSchema).min(1).required(),
});

const randString = Math.random().toString(36).substring(2, 8);

exports.createProduct = async (req, res) => {
  console.log("API RUN SUCCESS");

  try {
    // 1. Validate body
    const { error, value } = productValidationSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        error: error.details[0].message,
      });
    }

    // 2. Generate Product Unique ID
    const product_unique_id = uuidv4();
    value.unique_id = product_unique_id;

    // 3. Create slug
    const generatedSlug = slugify(value.title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
    });

    value.slug = `${generatedSlug}-${randString}`;


    // 🚀 4. Add unique ID  QR for each variant
    if (value.variants && value.variants.length > 0) {

      for (let variant of value.variants) {

        variant.variant_unique_id = uuidv4();

        const qrPayload = {
          product_id: product_unique_id,
          variant_id: variant.variant_unique_id,
        };

        const qrString = JSON.stringify(qrPayload);

        const qrDataUrl = await QRCode.toDataURL(qrString);

        const qrUpload = await upload_qr_image(qrDataUrl);

        variant.qrcode_url = qrUpload.url;
      }
    }

    // 5. Create final product
    const product = new Product(value);
    await product.save();

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// GET ALL
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET SINGLE product varient
exports.getProductByUniqIdVariantId = async (req, res) => {
  try {

    const { productId, variantId } = req.params;

    const prodData = await Product.findOne({ unique_id: productId });
     if (!prodData) {
      return res.status(404).json({
        success: false,
        essage: "Product not found",
      });
    }

    const variant = prodData.variants.find(
      (v) => v.variant_unique_id === variantId
    );

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Variant not found",
      });
    }

    // Filter variant fields
    const variantData = {
      variant_unique_id: variant.variant_unique_id,
      color: variant.color,
      size: variant.size,
      stock: variant.stock,
      actual_price: variant.actual_price,
      offer_price: variant.offer_price,
      discounted_price: variant.discounted_price,
      offer_type: variant.offer_type,
      qrcode_url: variant.qrcode_url,
    };

    return res.json({
      success: true,
      product_title: prodData.title,
      product_uniq_id: prodData.unique_id,
      variant: variantData,
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};



// GET SINGLE
exports.getProductByUniqId = async (req, res) => {
  try {
    const product = await Product.findOne({ unique_id: req.params.id });

    if (!product)
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });

    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findOne({ unique_id: productId });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const value = req.body;

    // --------------------------------
    // 1. Update Product Basic Fields
    // --------------------------------

    if (value.title) {
      product.title = value.title;

      const generatedSlug = slugify(value.title, {
        lower: true,
        strict: true,
        remove: /[*+~.()'"!:@]/g,
      });

      product.slug = `${generatedSlug}-${randString}`;
    }

    if (value.details) product.details = value.details;
    if (value.images) product.images = value.images;
    if (value.active !== undefined) product.active = value.active;

    // --------------------------------
    // 2. Update Variants
    // --------------------------------

    if (value.variants && Array.isArray(value.variants)) {
      const updatedVariants = [];

      for (let variantData of value.variants) {

        // Find existing variant
        let existingVariant = product.variants.find(
          (v) => v.variant_unique_id === variantData.variant_unique_id
        );

        // -------------------------
        // 🟢 UPDATE EXISTING VARIANT
        // -------------------------
        if (existingVariant) {
          existingVariant.color = variantData.color ?? existingVariant.color;
          existingVariant.size = variantData.size ?? existingVariant.size;

          existingVariant.stock = variantData.stock ?? existingVariant.stock;
          existingVariant.actual_price = variantData.actual_price ?? existingVariant.actual_price;
          existingVariant.offer_price = variantData.offer_price ?? existingVariant.offer_price;
          existingVariant.offer_type = variantData.offer_type ?? existingVariant.offer_type;

          updatedVariants.push(existingVariant);
          continue;
        }

        // -------------------------
        // ➕ ADD NEW VARIANT
        // -------------------------
        const newVariantId = uuidv4();

        const qrPayload = {
          product_id: product.unique_id,
          variant_id: newVariantId,
        };

        const qrString = JSON.stringify(qrPayload);

        const qrDataUrl = await QRCode.toDataURL(qrString);
        const qrUpload = await upload_qr_image(qrDataUrl);

        updatedVariants.push({
          variant_unique_id: newVariantId,
          color: variantData.color,
          size: variantData.size,
          stock: variantData.stock || 0,
          actual_price: variantData.actual_price,
          offer_price: variantData.offer_price || 0,
          offer_type: variantData.offer_type || "none",
          qrcode_url: qrUpload.url,
        });
      }

      product.variants = updatedVariants;
    }

    // --------------------------------
    // 3. Save Updated Product
    // --------------------------------
    await product.save();

    return res.json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// DELETE
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      message: "Deleted successfully",
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};






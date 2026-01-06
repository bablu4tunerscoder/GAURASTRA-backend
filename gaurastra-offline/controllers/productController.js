const Product = require("../models/product");
const Joi = require("joi");
const slugify = require("slugify").default;
const { v4: uuidv4 } = require("uuid");
const { upload_qr_image } = require("../offline_utils/uploadImage");
const { generateQRCode } = require("../offline_utils/generateBarcod");
const { pagination_ } = require("../../utilities/pagination_");
const mongoose = require("mongoose");


const variantSchema = Joi.object({
  color: Joi.string().required(),
  fabric: Joi.string(),
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

const generateStyleCode = (title) => {
  const clean = title
    .replace(/[^a-zA-Z]/g, "")
    .substring(0, 4)
    .toUpperCase();

  const rand = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");

  return `${clean}${rand}`;
};

const random3Digit = () =>
  Math.floor(Math.random() * 1000).toString().padStart(3, "0");


exports.createProduct = async (req, res) => {
  try {
    const { error, value } = productValidationSchema.validate(req.body);

   

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        error: error.details[0].message,
      });
    }

     

    // 🔹 Product unique id
    const product_unique_id = uuidv4();
    value.unique_id = product_unique_id;

    // 🔹 Product style code (AUTO)
    const styleCode = generateStyleCode(value.title);
    value.p_style_code = styleCode;

    // 🔹 Slug
    const generatedSlug = slugify(value.title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
    });

    value.slug = `${generatedSlug}-${randString}`;

    // 🔹 Variants
    if (value.variants && value.variants.length > 0) {
      for (let variant of value.variants) {

        // 🆔 Variant unique id
        variant.variant_unique_id = uuidv4();

      let VstyleCode = `${styleCode}/${variant.size.toUpperCase()}-${random3Digit()}`;
       variant.v_style_code = VstyleCode;
    
        // 📦 QR code
        const qrPayload = {
          product_id: product_unique_id,
          variant_id: variant.variant_unique_id,
          v_style_code: variant.v_style_code,
        };

        const qrString = JSON.stringify(qrPayload);
        const qrDataUrl = await generateQRCode(qrString);
        const qrUpload = await upload_qr_image(qrDataUrl);

        variant.qrcode_url = qrUpload.url;
      }
    }

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
    const { search } = req.query;

    const { page, limit, skip } = pagination_(req.query, {
      defaultLimit: 10,
      maxLimit: 20,
    });

    let filter = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
      
        // 🔹 Variant level search
        { "variants.size": { $regex: search, $options: "i" } },
      ];
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        total,
      },
      data: products,
    });
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
      offer: variant.offer,
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
    const productId = req.params.id;

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


    if (value.variants && Array.isArray(value.variants)) {
      const updatedVariants = [];

      for (let variantData of value.variants) {
        // 🔍 Find existing variant
        let existingVariant = product.variants.find(
          (v) => v.variant_unique_id === variantData.variant_unique_id
        );

        // -------------------------
        // 🟢 UPDATE EXISTING VARIANT
        // -------------------------
        if (existingVariant) {
          existingVariant.color = variantData.color ?? existingVariant.color;
          existingVariant.fabric = variantData.fabric ?? existingVariant.fabric;
          existingVariant.size = variantData.size ?? existingVariant.size;
          existingVariant.stock = variantData.stock ?? existingVariant.stock;
          existingVariant.actual_price =
            variantData.actual_price ?? existingVariant.actual_price;
          existingVariant.offer = variantData.offer ?? existingVariant.offer;
          existingVariant.offer_type =
            variantData.offer_type ?? existingVariant.offer_type;

          // ❌ v_style_code change nahi hoga
          updatedVariants.push(existingVariant);
          continue;
        }

        // -------------------------
        // ➕ ADD NEW VARIANT
        // -------------------------
        const newVariantId = uuidv4();

        const vStyleCode = `${product.p_style_code}/${variantData.size.toUpperCase()}-${random3Digit()}`;

        const qrPayload = {
          product_id: product.unique_id,
          variant_id: newVariantId,
        };

        const qrString = JSON.stringify(qrPayload);
        const qrDataUrl = await generateQRCode(qrString);
        const qrUpload = await upload_qr_image(qrDataUrl);

        updatedVariants.push({
          variant_unique_id: newVariantId,
          color: variantData.color,
          size: variantData.size,
          fabric: variantData.fabric,
          stock: variantData.stock || 0,
          actual_price: variantData.actual_price,
          offer: variantData.offer || 0,
          offer_type: variantData.offer_type || "none",
          v_style_code: vStyleCode,
          qrcode_url: qrUpload.url,
        });
      }

      product.variants = updatedVariants;
    }

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


exports.updateSingleVariant = async (req, res) => {
  try {
    const productId = req.params.productId;
    const variantId = req.params.variantId;

    const product = await Product.findOne({ unique_id: productId });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const variant = product.variants.find(
      (v) => v.variant_unique_id === variantId
    );

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Variant not found",
      });
    }

    const data = req.body;

    if (data.color !== undefined) variant.color = data.color;
    if (data.size !== undefined) variant.size = data.size;
    if (data.stock !== undefined) variant.stock = data.stock;
    if (data.fabric !== undefined) variant.fabric = data.fabric;
    if (data.actual_price !== undefined)
      variant.actual_price = data.actual_price;
    if (data.offer !== undefined) variant.offer = data.offer;
    if (data.offer_type !== undefined)
      variant.offer_type = data.offer_type;

    // ❌ v_style_code & QR regenerate nahi hoga

    await product.save();

    return res.json({
      success: true,
      message: "Variant updated successfully",
      data: variant,
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

exports.printDone = async (req, res) => {
  try {
    const { id } = req.params;

    // 🔐 ObjectId validation
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id",
      });
    }

    const product = await Product.findByIdAndUpdate(
      id,
      {
        print: true,
      },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      message: "Print marked as done",
      data: {
        productId: product._id,
        print: product.print,
      },
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};










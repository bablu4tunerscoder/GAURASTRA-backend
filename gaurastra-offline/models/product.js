const mongoose = require("mongoose");


// Variant Schema (each variant must have its own QR)
const VariantSchema = new mongoose.Schema({
  variant_unique_id: {
    type: String,
    unique: true,
    index: true
  },

  color: { type: String, required: true },
  size: { type: String, required: true },
  fabric: { type: String, default: "" },

  stock: { type: Number, default: 0, min: 0 },

  actual_price: { type: Number, required: true, min: 0 },
  offer: { type: Number, default: 0, min: 0 },
  discounted_price: { type: Number, default: 0 },

  v_style_code: { type: String, required: true },

  offer_type: {
    type: String,
    enum: ["percentage", "flat", "none"],
    default: "none",
  },

  qrcode_url: { type: String, default: "" },
});

// Auto discount calculation
VariantSchema.pre("save", function (next) {
  if (this.offer_type === "percentage") {
    const discount = (this.actual_price * this.offer) / 100;
    this.discounted_price = Math.max(0, this.actual_price - discount);
  } 
  else if (this.offer_type === "flat") {
    this.discounted_price = Math.max(0, this.actual_price - this.offer);
  } 
  else {
    this.discounted_price = this.actual_price;
  }

  next();
});


const ProductSchema = new mongoose.Schema(
  {
    unique_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    p_style_code:{
      type: String,
      required: true,
      unique: true,
      index: true
    },

    title: { type: String, required: true },

    slug: {
      type: String,
      unique: true,
      index: true,
    },

    details: { type: String, default: "" },
    print:{
      type: Boolean,
      default: false
    },

    images: { type: [String], default: [] },

    active: { type: Boolean, default: true },

    variants: [VariantSchema],
  },
  { timestamps: true }
);

// Product total stock virtual
ProductSchema.virtual("total_stock").get(function () {
  return this.variants.reduce((sum, v) => sum + v.stock, 0);
});

module.exports = mongoose.model("OfflineProduct", ProductSchema);

const ProductImage = require("../Models/ProductImgModel");
const Pricing = require("../Models/ProductPricingModel");
const ProductStock = require("../Models/ProductStockModel");
const Category = require("../Models/categoryModel");
const SubCategory = require("../Models/subCategoryModel");
const Discount = require("../Models/ProductDiscountModel");
const ProductVisibility = require("../Models/ProductVisibilityModel");

async function enrichSingleProductWithVariants(product, options = {}) {
  if (!product) return null;

  const { selectedSku } = options;

  const [
    category,
    subcategory,
    pricingList,
    stocks,
    images,
    discount,
    visibility,
  ] = await Promise.all([
    Category.findById(product.category_id).lean(),
    SubCategory.findById(product.subcategory_id).lean(),

    Pricing.find({
      product_id: product._id,
      is_active: true,
    }).lean(),

    ProductStock.find({
      product_id: product._id,
    }).lean(),

    ProductImage.find({
      product_id: product._id,
    })
      .sort({ is_primary: -1 })
      .lean(),

    Discount.findOne({
      product_id: product._id,
      is_active: true,
    }).lean(),

    ProductVisibility.findOne({
      product_id: product._id,
    }).lean(),
  ]);

  /* ---------------- GROUP BY SKU ---------------- */
  const variantMap = {};
  // variantMap[sku] = { pricing, stock, images[] }

  pricingList.forEach(p => {
    if (!variantMap[p.sku]) variantMap[p.sku] = {};
    variantMap[p.sku].pricing = p;
  });

  stocks.forEach(s => {
    if (!variantMap[s.sku]) variantMap[s.sku] = {};
    variantMap[s.sku].stock = s;
  });

  images.forEach(img => {
    if (!variantMap[img.sku]) variantMap[img.sku] = {};
    if (!variantMap[img.sku].images) {
      variantMap[img.sku].images = [];
    }
    variantMap[img.sku].images.push({
      _id: img._id,
      image_url: img.image_url,
      is_primary: img.is_primary,
    });
  });

  /* ---------------- BUILD VARIANTS ---------------- */
  let variants = Object.entries(variantMap).map(([sku, v]) => ({
    sku,

    attributes: v.stock?.attributes || {},

    pricing: v.pricing
      ? {
          currency: v.pricing.currency,
          original_price: v.pricing.original_price,
          discounted_price: v.pricing.discounted_price,
          discount_percent: v.pricing.discount_percent,
        }
      : null,

    stock: v.stock
      ? {
          stock_quantity: v.stock.stock_quantity,
          is_available: v.stock.is_available,
          last_updated: v.stock.last_updated,
        }
      : null,

    images: v.images || [],
  }));

  /* ---------------- SKU PRIORITY (0th INDEX) ---------------- */
  let selectedVariant = null;

  if (selectedSku) {
    const index = variants.findIndex(v => v.sku === selectedSku);
    if (index > -1) {
      selectedVariant = variants[index];
      variants = [
        selectedVariant,
        ...variants.filter((_, i) => i !== index),
      ];
    }
  }

  if (!selectedVariant && variants.length) {
    selectedVariant = variants[0];
  }

  /* ---------------- FINAL OBJECT ---------------- */
  return {
    _id: product._id,
    product_name: product.product_name,
    product_sku_code: product.product_sku_code,
    slug: product.slug,
    canonicalURL: product.canonicalURL,
    description: product.description,
    brand: product.brand,
    status: product.status,
    featuredSections: product.featuredSections,
    attributes: product.attributes,
    seo: product.seo,
    qrCode: product.qrCode,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,

    category: category || null,
    subcategory: subcategory || null,

    variants,
    selected_variant: selectedVariant,

    discount: discount
      ? {
          discount_type: discount.discount_type,
          value: discount.value,
          bogo: discount.bogo,
          start_date: discount.start_date,
          end_date: discount.end_date,
        }
      : null,

    visibility: visibility
      ? {
          is_visible: visibility.is_visible,
          schedule: visibility.schedule,
        }
      : null,
  };
}

module.exports = { enrichSingleProductWithVariants };

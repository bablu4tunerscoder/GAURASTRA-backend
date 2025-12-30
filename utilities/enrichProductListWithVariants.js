const ProductImage = require("../Models/ProductImgModel");
const Pricing = require("../Models/ProductPricingModel");
const ProductStock = require("../Models/ProductStockModel");
const Category = require("../Models/categoryModel");
const SubCategory = require("../Models/subCategoryModel");

async function enrichProductListWithVariants(
  products = [],
  { selectedVariants = {} } = {}
) {
  if (!products.length) return [];

  const productIds = products.map(p => p._id);

  /* ---------------- FETCH DATA ---------------- */
  const [
    categories,
    subcategories,
    pricingList,
    stocks,
    images,
  ] = await Promise.all([
    Category.find({ _id: { $in: products.map(p => p.category_id) } }).lean(),
    SubCategory.find({ _id: { $in: products.map(p => p.subcategory_id) } }).lean(),
    Pricing.find({ product_id: { $in: productIds }, is_active: true }).lean(),
    ProductStock.find({ product_id: { $in: productIds } }).lean(),
    ProductImage.find({ product_id: { $in: productIds } })
      .sort({ is_primary: -1 })
      .lean(),
  ]);

  /* ---------------- MAPS ---------------- */
  const categoryMap = Object.fromEntries(
    categories.map(c => [c._id.toString(), c])
  );

  const subcategoryMap = Object.fromEntries(
    subcategories.map(s => [s._id.toString(), s])
  );

  /* ---------------- VARIANT MAP ---------------- */
  const variantMap = {};
  // variantMap[productId][sku]

  pricingList.forEach(p => {
    const pid = p.product_id.toString();
    variantMap[pid] ??= {};
    variantMap[pid][p.sku] ??= {};
    variantMap[pid][p.sku].pricing = p;
  });

  stocks.forEach(s => {
    const pid = s.product_id.toString();
    variantMap[pid] ??= {};
    variantMap[pid][s.sku] ??= {};
    variantMap[pid][s.sku].stock = s;
  });

  images.forEach(img => {
    const pid = img.product_id.toString();
    variantMap[pid] ??= {};
    variantMap[pid][img.sku] ??= {};
    variantMap[pid][img.sku].images ??= [];
    variantMap[pid][img.sku].images.push({
      _id: img._id,
      image_url: img.image_url,
      is_primary: img.is_primary,
    });
  });

  /* ---------------- FINAL ---------------- */
  return products.map(product => {
    const pid = product._id.toString();
    let variants = Object.entries(variantMap[pid] || {}).map(([sku, v]) => ({
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
          }
        : null,
      images: v.images || [],
    }));

    /* -------- PRODUCT-WISE VARIANT PRIORITY -------- */
    const selectedSku = selectedVariants[pid];

    if (selectedSku) {
      const index = variants.findIndex(v => v.sku === selectedSku);
      if (index > -1) {
        const selected = variants[index];
        variants = [
          selected,
          ...variants.filter((_, i) => i !== index),
        ];
      }
    }

    return {
      ...product,
      category: categoryMap[product.category_id?.toString()] || null,
      subcategory: subcategoryMap[product.subcategory_id?.toString()] || null,
      variants,                 
      selected_variant: variants[0] || null, 
    };
  });
}


module.exports = { enrichProductListWithVariants };

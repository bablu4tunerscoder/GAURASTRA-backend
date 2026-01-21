// helpers/buildCartItems.js

const Product = require("../Models/ProductModel");
const Pricing = require("../Models/ProductPricingModel");
const ProductImage = require("../Models/ProductImgModel");

/**
 * Build cart/checkout items with full product details
 * @param {Array} items - cart items [{ product_id, sku, quantity, attributes }]
 * @returns {Object} { cartItems, cartSummary }
 */
const buildCartItems = async (items) => {
  if (!items?.length) {
    return {
      cartItems: [],
      cartSummary: {
        total_items: 0,
        total_quantity: 0,
        subtotal: 0,
        total_discount: 0,
        total_amount: 0,
      },
    };
  }

  const productIds = items.map(i => i.product_id);

  const [products, pricingList, images] = await Promise.all([
    Product.find({ _id: { $in: productIds } }).lean(),
    Pricing.find({ product_id: { $in: productIds }, is_active: true }).lean(),
    ProductImage.find({ product_id: { $in: productIds } })
      .sort({ is_primary: -1 })
      .lean(),
  ]);

  // MAPS
  const productMap = Object.fromEntries(products.map(p => [p._id.toString(), p]));

  const pricingMap = {};
  pricingList.forEach(p => {
    const pid = p.product_id.toString();
    pricingMap[pid] ??= {};
    pricingMap[pid][p.sku] = p;
  });

  const imageMap = {};
  images.forEach(img => {
    const pid = img.product_id.toString();
    imageMap[pid] ??= {};
    imageMap[pid][img.sku] ??= [];
    imageMap[pid][img.sku].push({
      _id: img._id,
      image_url: img.image_url,
      is_primary: img.is_primary,
    });
  });

  // BUILD ITEMS & TOTALS
  let subtotal = 0, totalDiscount = 0, totalQuantity = 0;

  const cartItems = items.map(item => {
    const pid = item.product_id.toString();
    const product = productMap[pid];
    if (!product) return null;

    const pricing = pricingMap[pid]?.[item.sku] || null;
    if (!pricing) return null;

    const originalPrice = pricing.original_price;
    const discountedPrice =
      pricing.discounted_price ??
      originalPrice - (originalPrice * (pricing.discount_percent || 0)) / 100;

    const itemSubtotal = discountedPrice * item.quantity;
    const itemDiscount = (originalPrice - discountedPrice) * item.quantity;

    subtotal += itemSubtotal;
    totalDiscount += itemDiscount;
    totalQuantity += item.quantity;

    const attributes = {
      color: item.attributes?.color || pricing.color || null,
      size: item.attributes?.size || pricing.size || null,
    };

    return {
      product_id: product._id,
      sku: item.sku,
      quantity: item.quantity,
      attributes,
      product_name: product.product_name,
      slug: product.slug,
      brand: product.brand,
      price: {
        original_price: originalPrice,
        discounted_price: discountedPrice,
        discount_percent: pricing.discount_percent || 0,
      },
      item_total: itemSubtotal,
      images: imageMap[pid]?.[item.sku] || [],
    };
  }).filter(Boolean);

  return {
    cartItems,
    cartSummary: {
      total_items: cartItems.length,
      total_quantity: totalQuantity,
      subtotal,
      total_discount: totalDiscount,
      total_amount: subtotal,
    },
  };
};

module.exports = buildCartItems;

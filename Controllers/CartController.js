
const Product = require("../Models/ProductModel");
const ProductImage = require("../Models/ProductImgModel");
const Pricing = require("../Models/ProductPricingModel");
const ProductStock = require("../Models/ProductStockModel");
const CartModel = require("../Models/CartModel");


const addToCart = async (req, res) => {
  try {
    const user = req.user;
    const { product_id, sku } = req.body;



    if (!product_id || !sku) {
      return res.status(400).json({
        success: false,
        message: "product_id and sku are required",
      });
    }

    // optional product check
    const productExists = await Product.exists({ _id: product_id });
    if (!productExists) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // 🔥 Try increment first
    let cart = await CartModel.findOneAndUpdate(
      {
        user_id: user.userid,
        "items.product_id": product_id,
        "items.sku": sku,
      },
      { $inc: { "items.$.quantity": 1 } },
      { new: true }
    );

    // 🟢 If not found → push new item
    if (!cart) {
      cart = await CartModel.findOneAndUpdate(
        { user_id: user.userid },
        {
          $push: {
            items: { product_id, sku, quantity: 1 },
          },
        },
        { upsert: true, new: true }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Cart updated",
      cart,
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const increaseCartItem = async (req, res) => {
  try {
    const user = req.user;
    const { product_id, sku } = req.body;

    const cart = await CartModel.findOneAndUpdate(
      {
        user_id: user.userid,
        "items.product_id": product_id,
        "items.sku": sku,
      },
      {
        $inc: { "items.$.quantity": 1 },
      },
      { new: true }
    );

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Quantity increased",
      cart,
    });
  } catch (error) {
    console.error("Increase cart error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const decreaseCartItem = async (req, res) => {
  try {
    const user = req.user;
    const { product_id, sku } = req.body;

    // 🔽 decrease if quantity > 1
    let cart = await CartModel.findOneAndUpdate(
      {
        user_id: user.userid,
        "items.product_id": product_id,
        "items.sku": sku,
        "items.quantity": { $gt: 1 },
      },
      { $inc: { "items.$.quantity": -1 } },
      { new: true }
    );

   
    if (!cart) {
      cart = await CartModel.findOneAndUpdate(
        { user_id: user.userid },
        { $pull: { items: { product_id, sku } } },
        { new: true }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Cart updated",
      cart,
    });
  } catch (error) {
    console.error("Decrease cart error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const clearCart = async (req, res) => {
  try {
    const user = req.user;

    await CartModel.findOneAndUpdate(
      { user_id: user.userid },
      { $set: { items: [] } }
    );

    res.status(200).json({
      success: true,
      message: "Cart cleared",
    });
  } catch (error) {
    console.error("Clear cart error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getCart = async (req, res) => {
  try {
    const user = req.user;

    const cart = await CartModel.findOne({ user_id: user.userid }).lean();

    if (!cart || !cart.items?.length) {
      return res.status(200).json({
        success: true,
        data: [],
        cart_summary: {
          total_items: 0,
          total_quantity: 0,
          subtotal: 0,
          total_discount: 0,
          total_amount: 0,
        },
      });
    }


    const productIds = cart.items.map(i => i.product_id);

    const [products, pricingList, stocks, images] = await Promise.all([
      Product.find({ _id: { $in: productIds } }).lean(),

      Pricing.find({
        product_id: { $in: productIds },
        is_active: true,
      }).lean(),

      ProductStock.find({ product_id: { $in: productIds } }).lean(),

      ProductImage.find({ product_id: { $in: productIds } })
        .sort({ is_primary: -1 })
        .lean(),
    ]);

    /* ---------- MAPS ---------- */
    const productMap = Object.fromEntries(
      products.map(p => [p._id.toString(), p])
    );

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

    /* ---------- TOTALS ---------- */
    let subtotal = 0;
    let totalDiscount = 0;
    let totalQuantity = 0;

    /* ---------- BUILD CART ITEMS ---------- */
    const cartItems = cart.items.map(item => {
      const pid = item.product_id.toString();
      const product = productMap[pid];
      if (!product) return null;

      const pricing = pricingMap[pid]?.[item.sku] || null;

      if (!pricing) {
        // SKU mismatch safety
        return null;
      }

      const originalPrice = pricing.original_price;
      const discountedPrice =
        pricing.discounted_price ??
        originalPrice -
          (originalPrice * (pricing.discount_percent || 0)) / 100;

      const itemSubtotal = discountedPrice * item.quantity;
      const itemDiscount =
        (originalPrice - discountedPrice) * item.quantity;

      subtotal += itemSubtotal;
      totalDiscount += itemDiscount;
      totalQuantity += item.quantity;

      return {
        product_id: product._id,
        sku: item.sku,
        quantity: item.quantity,

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

    /* ---------- RESPONSE ---------- */
    return res.status(200).json({
      success: true,
      data: cartItems,
      cart_summary: {
        total_items: cartItems.length,
        total_quantity: totalQuantity,
        subtotal,
        total_discount: totalDiscount,
        total_amount: subtotal,
      },
    });
  } catch (error) {
    console.error("Get cart error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};


module.exports = {
  addToCart,
  increaseCartItem,
  decreaseCartItem,
  clearCart,
  getCart
};
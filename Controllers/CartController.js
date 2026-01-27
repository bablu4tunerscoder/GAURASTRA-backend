
const Product = require("../Models/ProductModel");
const ProductImage = require("../Models/ProductImgModel");
const Pricing = require("../Models/ProductPricingModel");
const ProductStock = require("../Models/ProductStockModel");
const CartModel = require("../Models/CartModel");
const buildCartItems = require("../utilities/buildCartItems");


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


    const items = cart?.items || [];
    const { cartItems, cartSummary } = await buildCartItems(items);
  
    return res.status(200).json({
      success: true,
      data: cartItems,
      cart_summary: cartSummary
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


const addBulkCartItems = async(req, res) => {
  try {
    const user = req.user;
    const { items } = req.body;

    // 🔹 Validation
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Items array is required",
      });
    }

    // 🔹 Ensure cart exists
    let cart = await CartModel.findOne({ user_id: user.userid });
    if (!cart) {
      cart = await CartModel.create({
        user_id: user.userid,
        items: [],
      });
    }

    const updatedItems = [];

    // 🔥 Process each item
    for (const item of items) {
      const { product_id, sku, quantity = 1 } = item;

      if (!product_id || !sku || quantity <= 0) continue;

      // Optional product check
      const productExists = await Product.exists({ _id: product_id });
      if (!productExists) continue;

      // 🔍 Check if item exists in cart
      const existingItem = cart.items.find(
        (ci) =>
          ci.product_id.toString() === product_id &&
          ci.sku === sku
      );

      if (existingItem) {
        // ➕ Increase quantity
        existingItem.quantity += quantity;
        updatedItems.push(existingItem);
      } else {
        // 🆕 Add new item
        const newItem = {
          product_id,
          sku,
          quantity,
        };
        cart.items.push(newItem);
        updatedItems.push(newItem);
      }
    }

    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Cart updated successfully",
      items: updatedItems,   // ✅ array of updated objects
      cart_id: cart._id,
    });
  } catch (error) {
    console.error("Bulk cart update error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};


module.exports = {
  addToCart,
  increaseCartItem,
  decreaseCartItem,
  clearCart,
  getCart,
  addBulkCartItems
};
const CartModel = require("../Models/CartModel");
const checkoutModel = require("../Models/checkoutModel");
const ProductPricingModel = require("../Models/ProductPricingModel");
const UserAddress = require("../Models/userAddressModel");


const createOrUpdateCheckout = async (req, res) => {
  try {
    const user_id = req.user.userid;
    const { coupon } = req.body;

   
 const defaultAddress = await UserAddress.findOne({ user_id })
  .sort({ updatedAt: -1 })
  .select("_id")
  .lean();

    /* ===============================
       1️⃣ FETCH CART
    =============================== */
    const cart = await CartModel.findOne({ user_id }).lean();

    if (!cart || !cart.items?.length) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const productIds = cart.items.map(i => i.product_id);

    /* ===============================
       2️⃣ FETCH PRICING
    =============================== */
    const pricingList = await ProductPricingModel.find({
      product_id: { $in: productIds },
      is_active: true,
    }).lean();

    const pricingMap = {};
    pricingList.forEach(p => {
      const pid = p.product_id.toString();
      pricingMap[pid] ??= {};
      pricingMap[pid][p.sku] = p;
    });

    let subtotal = 0;

    const cart_items = cart.items
      .map(item => {
        const pricing =
          pricingMap[item.product_id.toString()]?.[item.sku];
        if (!pricing) return null;

        const price =
          pricing.discounted_price ??
          pricing.original_price -
            (pricing.original_price *
              (pricing.discount_percent || 0)) / 100;

        const item_total = price * item.quantity;
        subtotal += item_total;

        return {
          product_id: item.product_id,
          sku: item.sku,
          quantity: item.quantity,
          price: {
            original_price: pricing.original_price,
            discounted_price: price,
          },
          item_total,
        };
      })
      .filter(Boolean);

    /* ===============================
       3️⃣ PRICE DETAILS
    =============================== */
    const discount = coupon?.discountAmount || 0;

    const price_details = {
      subtotal,
      discount,
      delivery_charge: 0,
      total_amount: subtotal - discount,
    };

    /* ===============================
       4️⃣ UPSERT CHECKOUT
    =============================== */
    const checkout = await checkoutModel.findOneAndUpdate(
      { user_id, status: "ACTIVE" },
      {
        user_id,
        cart_items,
        price_details,
        coupon,
        address_id: defaultAddress?._id || null,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      success: true,
      message: "Checkout created / updated",
      data: checkout,
    });
  } catch (err) {
    console.error("Checkout create error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const updateCheckoutAddress = async (req, res) => {
  try {
    const user_id = req.user.userid;
    const { address_id } = req.body;

  const address = await UserAddress.findOne({
      _id: address_id,
      user_id,
    }).lean();

    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    const checkout = await checkoutModel.findOneAndUpdate(
      { user_id, status: "ACTIVE" },
      { address_id },
      { new: true },
    );

    res.status(200).json({
      success: true,
      message: "Address updated",
      data: checkout,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const updateCheckoutPaymentMethod = async (req, res) => {
  try {
    const user_id = req.user.userid;
    const { payment_method } = req.body;

    if (!["COD", "ONLINE"].includes(payment_method)) {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    const checkout = await checkoutModel.findOneAndUpdate(
      { user_id, status: "ACTIVE" },
      { payment_method },
      { new: true },
    );

    res.status(200).json({
      success: true,
      message: "Payment method updated",
      data: checkout,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const getActiveCheckout = async (req, res) => {
  try {
    const user_id = req.user.userid;

    const checkout = await checkoutModel.findOne({
      user_id,
      status: "ACTIVE",
    }).lean();

    if (!checkout) {
      return res.status(404).json({ message: "No active checkout" });
    }

    const addresses = await UserAddress.find({ user_id })
      .sort({ createdAt: -1 })
      .lean();

    const selectedAddressId = checkout.address_id
      ? checkout.address_id.toString()
      : null;

    const addressesWithSelection = addresses.map((addr) => ({
      ...addr,
      is_selected: selectedAddressId === addr._id.toString(),
    }));

    res.status(200).json({
      success: true,
      data: {
        checkout,
        addresses: addressesWithSelection,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createOrUpdateCheckout,
  updateCheckoutAddress,
  updateCheckoutPaymentMethod,
  getActiveCheckout,
};

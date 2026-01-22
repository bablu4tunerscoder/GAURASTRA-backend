const CartModel = require("../Models/CartModel");
const checkoutModel = require("../Models/checkoutModel");
const ProductPricingModel = require("../Models/ProductPricingModel");
const UserAddress = require("../Models/userAddressModel");
const UserCoupon = require("../Models/couponModelUser");
const PublicCoupon = require("../Models/couponModelPublic");
const buildCartItems = require("../utilities/buildCartItems");

const createOrUpdateCheckout = async (req, res) => {
  try {
    const user_id = req.user.userid;
    const user = req.user;
    const { coupon } = req.body;


  

    /* ===============================
       0️⃣ DEFAULT ADDRESS
    =============================== */
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

    const productIds = cart.items.map((i) => i.product_id);

    /* ===============================
       2️⃣ FETCH PRICING
    =============================== */
    const pricingList = await ProductPricingModel.find({
      product_id: { $in: productIds },
      is_active: true,
    }).lean();

    const pricingMap = {};
    pricingList.forEach((p) => {
      const pid = p.product_id.toString();
      pricingMap[pid] ??= {};
      pricingMap[pid][p.sku] = p;
    });

    let subtotal = 0;

    const cart_items = cart.items
      .map((item) => {
        const pricing = pricingMap[item.product_id.toString()]?.[item.sku];
        if (!pricing) return null;

        const price =
          pricing.discounted_price ??
          pricing.original_price -
            (pricing.original_price * (pricing.discount_percent || 0)) / 100;

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
       3️⃣ COUPON RE-VALIDATION (BACKEND)
    =============================== */
    let discount = 0;
    let appliedCoupon = null;

    if (coupon) {
      const code = coupon;

      /* ---- TRY USER COUPON ---- */
      const userCoupon = await UserCoupon.findOne({
        code,
        mobileNumber: user.phone,
        status: "Active",
      });

      if (userCoupon) {
        if (userCoupon.expiresAt && userCoupon.expiresAt < new Date()) {
          return res.status(400).json({ message: "Coupon expired" });
        }

        if (subtotal < userCoupon.minCartAmount) {
          return res.status(400).json({
            message: `Minimum cart ₹${userCoupon.minCartAmount} required`,
          });
        }

        discount =
          userCoupon.discountType === "percentage"
            ? Math.min((subtotal * userCoupon.discountValue) / 100, subtotal)
            : Math.min(userCoupon.discountValue, subtotal);

        appliedCoupon = {
          code,
          couponType: "USER_COUPON",
          discountAmount: discount,
        };
      } else {
        /* ---- TRY PUBLIC COUPON ---- */
        const publicCoupon = await PublicCoupon.findOne({
          code,
          status: "Active",
        });

        if (!publicCoupon) {
          return res.status(400).json({ message: "Invalid coupon code" });
        }

        if (publicCoupon.expiresAt && publicCoupon.expiresAt < new Date()) {
          return res.status(400).json({ message: "Coupon expired" });
        }

        if (
          publicCoupon.usageLimit &&
          publicCoupon.usageCount >= publicCoupon.usageLimit
        ) {
          return res.status(400).json({
            message: "Coupon usage limit reached",
          });
        }

        const userUsageCount = publicCoupon.usedBy.filter(
          (u) => u.user.toString() === user_id,
        ).length;

        if (
          publicCoupon.perUserLimit &&
          userUsageCount >= publicCoupon.perUserLimit
        ) {
          return res.status(400).json({
            message: "You already used this coupon",
          });
        }

        if (subtotal < publicCoupon.minCartAmount) {
          return res.status(400).json({
            message: `Minimum cart ₹${publicCoupon.minCartAmount} required`,
          });
        }

        discount =
          publicCoupon.discountType === "percentage"
            ? Math.min((subtotal * publicCoupon.discountValue) / 100, subtotal)
            : Math.min(publicCoupon.discountValue, subtotal);

        appliedCoupon = {
          code,
          couponType: "PUBLIC_COUPON",
          discountAmount: discount,
        };
      }
    }

    /* ===============================
       4️⃣ PRICE DETAILS
    =============================== */
    const price_details = {
      subtotal,
      discount,
      delivery_charge: 0,
      total_amount: subtotal - discount,
    };

    /* ===============================
       5️⃣ UPSERT CHECKOUT
    =============================== */
    const checkout = await checkoutModel.create({
      user: user_id,
      cart_items,
      price_details,
      coupon: appliedCoupon || null,
      status: "ACTIVE",
      address_id: defaultAddress?._id || null,
    });

    return res.status(200).json({
      success: true,
      message: "Checkout created",
      data: checkout._id,
    });
  } catch (err) {
    console.error("Checkout create error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const updateCheckoutAddress = async (req, res) => {
  try {
    const user_id = req.user.userid;
    const { address_id, checkout_id } = req.body;

    const address = await UserAddress.findOne({
      _id: address_id,
      user_id,
    }).lean();

    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    const checkout = await checkoutModel.findOneAndUpdate(
      { _id: checkout_id, status: "ACTIVE" },
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
    const { payment_method, checkout_id } = req.body;

    if (!["COD", "ONLINE"].includes(payment_method)) {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    const checkout = await checkoutModel.findOneAndUpdate(
      { _id: checkout_id, status: "ACTIVE" },
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
    const checkoutId = req.params.checkoutId;

    const TWO_HOUR = 120 * 60 * 1000;
    const expiryTime = new Date(Date.now() - TWO_HOUR);

    const checkout = await checkoutModel
      .findOne({
        _id: checkoutId,
        status: "ACTIVE",
        createdAt: { $gte: expiryTime },
      })
      .lean();

    if (!checkout) {
      await checkoutModel.updateOne(
        { _id: checkoutId, status: "ACTIVE" },
        { $set: { status: "EXPIRED" } },
      );

      return res.status(404).json({
        success: false,
        message: "Checkout expired or not found",
      });
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

    const { cartItems, cartSummary } = await buildCartItems(
      checkout.cart_items || [],
    );

    res.status(200).json({
      success: true,
      data: {
        checkout,
        addresses: addressesWithSelection,
        cart_items: cartItems,
        // cart_summary: cartSummary,
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

const OfflineBilling = require("../Models/billing");
const OfflineProduct = require("../Models/product");


exports.calculateBilling = async (req, res) => {
  try {
    const { items } = req.body;

    console.log(items)

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Billing items are required",
      });
    }

    let subtotal = 0;
    let calculatedItems = [];

    for (const item of items) {
      // 1. Find product using product_uniq_id
      const product = await OfflineProduct.findOne({
        unique_id: item.product_id
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.product_id}`,
        });
      }

      // 2. Find variant
      const variant = product.variants.find(
        (v) => v.variant_unique_id === item.variant_id
      );

      if (!variant) {
        return res.status(404).json({
          success: false,
          message: `Variant not found for: ${item.variant_id}`,
        });
      }

      // 3. STOCK check
      if (variant.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.title} (${variant.color}, ${variant.size})`,
        });
      }

      const price = variant.discounted_price;

      calculatedItems.push({
        product_id: product.unique_id,
        variant_id: variant.variant_unique_id,
        title: `${product.title} (${variant.color}, ${variant.size})`,
        price,
        quantity: item.quantity,
        line_total: price * item.quantity,
      });

      subtotal += price * item.quantity;
    }

    const tax = 0;
    const total_amount = subtotal + tax;

    res.status(200).json({
      success: true,
      message: "Billing calculated successfully",
      preview: {
        items: calculatedItems,
        subtotal,
        tax,
        total_amount,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};



// ---------------------------
// CREATE BILLING
// ---------------------------
exports.createBilling = async (req, res) => {
  try {
    const { items, payment_method, user_info, address } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Billing items are required",
      });
    }

    let subtotal = 0;
    let finalItems = [];
    let warnings = [];

    // PROCESS ITEMS
    for (const item of items) {
      const product = await OfflineProduct.findOne({
        unique_id: item.product_id,
      });

      if (!product) {
        warnings.push({
          product_id: item.product_id,
          message: "Product not found",
        });
        continue;
      }

      const variant = product.variants.find(
        (v) => v.variant_unique_id === item.variant_id
      );

      if (!variant) {
        warnings.push({
          product: product.title,
          message: "Variant not found",
        });
        continue;
      }

      // OUT OF STOCK → SKIP
      if (variant.stock <= 0) {
        warnings.push({
          product: product.title,
          variant: `${variant.color}, ${variant.size}`,
          message: "Out of stock",
        });
        continue;
      }

      // PARTIAL STOCK OR FULL
      const requestedQty = item.quantity;
      const availableStock = variant.stock;

      let sellQty = Math.min(requestedQty, availableStock);

      if (sellQty < requestedQty) {
        warnings.push({
          product: product.title,
          variant: `${variant.color}, ${variant.size}`,
          requested_qty: requestedQty,
          available_stock: availableStock,
          sold_qty: sellQty,
          message: "Partial stock available — selling available quantity",
        });
      }

      const price = variant.discounted_price;

      finalItems.push({
        product_id: product.unique_id,
        variant_id: variant.variant_unique_id,
        title: `${product.title} (${variant.color}, ${variant.size})`,
        price,
        quantity: sellQty,
        line_total: price * sellQty,
      });

      subtotal += price * sellQty;
    }

    // IF NOTHING SOLD
    if (finalItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No items available for sale",
        warnings,
      });
    }

    const tax = 0;
    const total_amount = subtotal + tax;

    // SAVE BILLING
    const billing = await OfflineBilling.create({
      items: finalItems,
      subtotal,
      tax,
      total_amount,
      payment_method,
      user_info,
      address,
    });

    // REDUCE STOCK ONLY FOR SOLD QUANTITY
    for (const sold of finalItems) {
      await OfflineProduct.updateOne(
        {
          unique_id: sold.product_id,
          "variants.variant_unique_id": sold.variant_id,
        },
        {
          $inc: { "variants.$.stock": -sold.quantity },
        }
      );
    }

    // RESPONSE
    res.status(201).json({
      success: true,
      message: "Billing created successfully",
      data: billing,
      warnings, // send warnings for frontend display
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


// ---------------------------
// GET ALL BILLINGS
// ---------------------------
exports.getAllBilling = async (req, res) => {
  try {
    const bills = await OfflineBilling.find().sort({ createdAt: -1 });
    res.json({ success: true, data: bills });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ---------------------------
// GET SINGLE BILLING
// ---------------------------
exports.getBillingById = async (req, res) => {
  try {
    const bill = await OfflineBilling.findById(req.params.id);

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Billing not found",
      });
    }

    res.json({ success: true, data: bill });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ---------------------------
// UPDATE BILLING (rare)
// ---------------------------
exports.updateBilling = async (req, res) => {
  try {
    const updated = await OfflineBilling.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Billing not found",
      });
    }

    res.json({
      success: true,
      message: "Billing updated successfully",
      data: updated,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ---------------------------
// DELETE BILLING
// ---------------------------
exports.deleteBilling = async (req, res) => {
  try {
    const deleted = await OfflineBilling.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Billing not found",
      });
    }

    res.json({
      success: true,
      message: "Billing deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

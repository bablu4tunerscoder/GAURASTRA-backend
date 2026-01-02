const BillingReturn = require("../models/billingReturn");
const OfflineBilling = require("../models/billing");
const OfflineProduct = require("../models/product");
const { pagination_ } = require("../../utilities/pagination_");


const isReturnAllowed = (billDate) => {
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - new Date(billDate).getTime() <= SEVEN_DAYS;
};

exports.fullBillReturn = async (req, res) => {
  try {
    const { reason } = req.body;
    const { billingId } = req.params;

    // 🔍 Find billing
    const bill = await OfflineBilling.findOne({billing_id: billingId});
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Billing not found",
      });
    }

     

    // ❌ Already returned
    if (bill.return_status === "FULL") {
      return res.status(400).json({
        success: false,
        message: "Bill already fully returned",
      });
    }

    if (!isReturnAllowed(bill.createdAt)) {
      return res.status(400).json({
        success: false,
        message: "Return period expired (7 days)",
      });
    }

    // 📦 Prepare return items
    const returnItems = bill.items.map((item) => ({
      product_id: item.product_id,
      variant_id: item.variant_id,
      title: item.title,
      price: item.price,
      quantity: item.quantity,
      refund_amount: item.line_total,
    }));

    const totalRefund = bill.total_amount;

    // 💾 Save return entry
    const returnEntry = await BillingReturn.create({
      billing_id: bill.billing_id,
      return_type: "FULL",
      items: returnItems,
      total_refund: totalRefund,
      reason,
      payment_method: bill.payment_method,
      returned_by: bill.user_info,
    });

    // 🔄 Restore stock
    for (const item of bill.items) {
      await OfflineProduct.updateOne(
        {
          unique_id: item.product_id,
          "variants.variant_unique_id": item.variant_id,
        },
        {
          $inc: { "variants.$.stock": item.quantity },
        }
      );
    }

    // 🔁 Update billing status
    bill.return_status = "FULL";
    await bill.save();

    res.status(200).json({
      success: true,
      message: "Full bill returned successfully",
      data: returnEntry,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.partialBillReturn = async (req, res) => {
  try {
    const { billingId } = req.params;
    const { items, reason } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Return items required",
      });
    }

    const bill = await OfflineBilling.findOne({billing_id: billingId});
    if (!bill) {
      return res.status(404).json({ success: false, message: "Billing not found" });
    }

    if (!isReturnAllowed(bill.createdAt)) {
      return res.status(400).json({
        success: false,
        message: "Return period expired (7 days)",
      });
    }

    if (bill.return_status === "FULL") {
      return res.status(400).json({
        success: false,
        message: "Bill already fully returned",
      });
    }

    let refundItems = [];
    let totalRefund = 0;

    for (const rItem of items) {
      if (!rItem.quantity || rItem.quantity <= 0) continue;

      const billItem = bill.items.find(
        (i) => i.variant_id === rItem.variant_id
      );
      if (!billItem) continue;

      const returnQty = Math.min(rItem.quantity, billItem.quantity);
      const refundAmount = billItem.price * returnQty;

      refundItems.push({
        product_id: billItem.product_id,
        variant_id: billItem.variant_id,
        title: billItem.title,
        price: billItem.price,
        quantity: returnQty,
        refund_amount: refundAmount,
      });

      totalRefund += refundAmount;

      // 🔄 restore stock
      await OfflineProduct.updateOne(
        {
          unique_id: billItem.product_id,
          "variants.variant_unique_id": billItem.variant_id,
        },
        { $inc: { "variants.$.stock": returnQty } }
      );
    }

    if (!refundItems.length) {
      return res.status(400).json({
        success: false,
        message: "No valid return items",
      });
    }

    const returnEntry = await BillingReturn.create({
      billing_id: bill.billing_id,
      return_type: "PARTIAL",
      items: refundItems,
      total_refund: totalRefund,
      reason,
      payment_method: bill.payment_method,
      returned_by: bill.user_info,
    });

    bill.return_status = "PARTIAL";
    await bill.save();

    res.json({
      success: true,
      message: "Partial return successful",
      data: returnEntry,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.getAllBillingReturns = async (req, res) => {
  try {
    const { search, return_type } = req.query;

    const { page, limit, skip } = pagination_(req.query, {
      defaultLimit: 10,
      maxLimit: 20,
    });

    let filter = {};

    if (search) {
      filter.$or = [
        { return_id: { $regex: search, $options: "i" } },
        { billing_id: { $regex: search, $options: "i" } },
        { "returned_by.name": { $regex: search, $options: "i" } },
        { "returned_by.phone": { $regex: search, $options: "i" } },
        { "items.title": { $regex: search, $options: "i" } },
        { return_type: { $regex: search, $options: "i" } },
      ];
    }

    if (return_type) {
      filter.return_type = return_type;
    }

    const [returns, total] = await Promise.all([
      BillingReturn.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      BillingReturn.countDocuments(filter),
    ]);

    res.json({
      success: true,
      pagination: { page, limit, total },
      data: returns,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.getBillingReturnById = async (req, res) => {
  try {
    const data = await BillingReturn.findById(req.params.id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Return record not found",
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const OfflineBilling = require("../models/billing");


const getMonthRange = (month, year) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
};


exports.downloadBillingCSV = async (req, res) => {
  try {
    const { month, year } = req.query;

    let filter = {};
    if (month && year) {
      const { start, end } = getMonthRange(month, year);
      filter.createdAt = { $gte: start, $lt: end };
    }

    const bills = await OfflineBilling.find(filter).sort({ createdAt: -1 });

    if (!bills.length) {
      return res.status(404).json({ success: false, message: "No billing data found" });
    }

    let csv =
      "Billing ID,Full Name,Phone,Payment Method,Subtotal,Tax,Total Amount," +
      "Product ID,Variant ID,Product Title,Price,Quantity,Line Total," +
      "Pincode,Address Line1,Address Line2,City,State,Created At\n";

    bills.forEach((bill) => {
      bill.items.forEach((item) => {
        csv +=
          `"${bill.billing_id}",` +
          `"${bill.user_info?.full_name || ""}",` +
          `"${bill.user_info?.phone || ""}",` +
          `"${bill.payment_method}",` +
          `"${bill.subtotal}",` +
          `"${bill.tax}",` +
          `"${bill.total_amount}",` +
          `"${item.product_id}",` +
          `"${item.variant_id}",` +
          `"${item.title || ""}",` +
          `"${item.price}",` +
          `"${item.quantity}",` +
          `"${item.line_total}",` +
          `"${bill.address?.pincode || ""}",` +
          `"${bill.address?.address_line1 || ""}",` +
          `"${bill.address?.address_line2 || ""}",` +
          `"${bill.address?.city || ""}",` +
          `"${bill.address?.state || ""}",` +
          `"${bill.createdAt.toISOString()}"\n`;
      });
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=billing-data.csv");

    res.status(200).send(csv);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};



exports.downloadUserCSV = async (req, res) => {
  try {
    const { month, year } = req.query;

    let filter = {};
    if (month && year) {
      const { start, end } = getMonthRange(month, year);
      filter.createdAt = { $gte: start, $lt: end };
    }

    const bills = await OfflineBilling.find(filter);

    if (!bills.length) {
      return res.status(404).json({ success: false, message: "No users found" });
    }

    const userMap = new Map();

    bills.forEach((bill) => {
      const phone = bill.user_info?.phone;
      if (phone) {
        userMap.set(phone, {
          full_name: bill.user_info?.full_name || "",
          phone,
        });
      }
    });

    let csv = "Full Name,Phone\n";
    userMap.forEach((user) => {
      csv += `"${user.full_name}","${user.phone}"\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=users.csv");

    res.status(200).send(csv);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

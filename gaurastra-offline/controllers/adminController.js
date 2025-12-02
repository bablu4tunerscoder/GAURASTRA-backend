const OfflineBilling = require("../models/billing");
const OfflineProduct = require("../models/product");
const moment = require("moment");

exports.getRealTimeSales = async (req, res) => {
  try {
    const today = moment().startOf("day").toDate();

    const salesToday = await OfflineBilling.find({
      createdAt: { $gte: today },
    }).sort({ createdAt: -1 });

    const totalAmount = salesToday.reduce((a, b) => a + b.total_amount, 0);

    res.json({
      success: true,
      total_orders: salesToday.length,
      total_sales: totalAmount,
      orders: salesToday,
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};



exports.getInventoryStatus = async (req, res) => {
  try {
    const products = await OfflineProduct.find();

    let lowStock = [];
    let outOfStock = [];

    products.forEach((product) => {
      product.variants.forEach((v) => {
        if (v.stock === 0) {
          outOfStock.push({
            product: product.title,
            variant: `${v.color} - ${v.size}`,
            stock: 0,
          });
        } else if (v.stock <= 5) {
          lowStock.push({
            product: product.title,
            variant: `${v.color} - ${v.size}`,
            stock: v.stock,
          });
        }
      });
    });

    res.json({
      success: true,
      lowStock,
      outOfStock,
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.getDailySummary = async (req, res) => {
  try {
    const today = moment().startOf("day").toDate();
    const now = moment().endOf("day").toDate();

    const bills = await OfflineBilling.find({
      createdAt: { $gte: today, $lte: now },
    });

    const totalSales = bills.reduce((a, b) => a + b.total_amount, 0);
    const totalTax = bills.reduce((a, b) => a + b.tax, 0);

    let totalItemsSold = 0;
    let productCount = {};

    bills.forEach((bill) => {
      bill.items.forEach((i) => {
        totalItemsSold += i.quantity;

        if (!productCount[i.title]) productCount[i.title] = 0;
        productCount[i.title] += i.quantity;
      });
    });

    const topSelling = Object.entries(productCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([title, qty]) => ({ title, qty }));

    res.json({
      success: true,
      totalSales,
      totalTax,
      totalItemsSold,
      topSelling,
      bills,
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.getGSTReport = async (req, res) => {
  try {
    const { month, year } = req.query;

    const start = moment(`${year}-${month}-01`).startOf("month").toDate();
    const end = moment(`${year}-${month}-01`).endOf("month").toDate();

    const bills = await OfflineBilling.find({
      createdAt: { $gte: start, $lte: end },
    });

    const totalSales = bills.reduce((a, b) => a + b.subtotal, 0);
    const totalGST = bills.reduce((a, b) => a + b.tax, 0);

    res.json({
      success: true,
      month,
      year,
      totalSales,
      totalGST,
      totalBills: bills.length,
      bills,
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.getStorePerformance = async (req, res) => {
  try {
    const last30 = moment().subtract(30, "days").toDate();

    const bills = await OfflineBilling.find({
      createdAt: { $gte: last30 },
    });

    const revenue = bills.reduce((a, b) => a + b.total_amount, 0);
    const avgOrderValue = bills.length === 0 ? 0 : revenue / bills.length;

    let customerCount = {};
    bills.forEach((b) => {
      if (b.user_info?.phone) {
        customerCount[b.user_info.phone] =
          (customerCount[b.user_info.phone] || 0) + 1;
      }
    });

    const repeatCustomers = Object.values(customerCount).filter((c) => c > 1)
      .length;

    res.json({
      success: true,
      last30_days_orders: bills.length,
      revenue,
      avgOrderValue,
      repeatCustomers,
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};



exports.getAdminDashboard = async (req, res) => {
  try {
    /* ---------------------------------------------------
     1. REAL-TIME SALES (TODAY)
    --------------------------------------------------- */
    const today = moment().startOf("day").toDate();
    const salesToday = await OfflineBilling.find({
      createdAt: { $gte: today },
    }).sort({ createdAt: -1 });

    const totalSalesToday = salesToday.reduce((a, b) => a + b.total_amount, 0);


    /* ---------------------------------------------------
     2. INVENTORY STATUS (LOW STOCK & OUT OF STOCK)
    --------------------------------------------------- */
    const products = await OfflineProduct.find();

    let lowStock = [];
    let outOfStock = [];

    products.forEach((p) => {
      p.variants.forEach((v) => {
        if (v.stock === 0) {
          outOfStock.push({
            product: p.title,
            variant: `${v.color} - ${v.size}`,
            stock: 0,
          });
        } else if (v.stock <= 5) {
          lowStock.push({
            product: p.title,
            variant: `${v.color} - ${v.size}`,
            stock: v.stock,
          });
        }
      });
    });


    /* ---------------------------------------------------
     3. DAILY SUMMARY
    --------------------------------------------------- */
    const startOfDay = moment().startOf("day").toDate();
    const endOfDay = moment().endOf("day").toDate();

    const todaysBills = await OfflineBilling.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const dayTotalSales = todaysBills.reduce((a, b) => a + b.total_amount, 0);
    const dayTotalTax = todaysBills.reduce((a, b) => a + b.tax, 0);

    let totalItemsSoldToday = 0;
    let productCount = {};

    todaysBills.forEach((bill) => {
      bill.items.forEach((i) => {
        totalItemsSoldToday += i.quantity;

        if (!productCount[i.title]) productCount[i.title] = 0;
        productCount[i.title] += i.quantity;
      });
    });

    const topSellingToday = Object.entries(productCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([title, qty]) => ({ title, qty }));


    /* ---------------------------------------------------
     4. GST REPORT (CURRENT MONTH)
    --------------------------------------------------- */
    const month = moment().format("MM");
    const year = moment().format("YYYY");

    const monthStart = moment().startOf("month").toDate();
    const monthEnd = moment().endOf("month").toDate();

    const monthBills = await OfflineBilling.find({
      createdAt: { $gte: monthStart, $lte: monthEnd },
    });

    const monthlySales = monthBills.reduce((a, b) => a + b.subtotal, 0);
    const monthlyGST = monthBills.reduce((a, b) => a + b.tax, 0);


    /* ---------------------------------------------------
     5. STORE PERFORMANCE (LAST 30 DAYS)
    --------------------------------------------------- */
    const last30 = moment().subtract(30, "days").toDate();

    const last30Bills = await OfflineBilling.find({
      createdAt: { $gte: last30 },
    });

    const revenue30 = last30Bills.reduce((a, b) => a + b.total_amount, 0);
    const avgOrderValue = last30Bills.length === 0 ? 0 : revenue30 / last30Bills.length;

    let customerCount = {};
    last30Bills.forEach((b) => {
      if (b.user_info?.phone) {
        customerCount[b.user_info.phone] =
          (customerCount[b.user_info.phone] || 0) + 1;
      }
    });

    const repeatCustomers = Object.values(customerCount).filter((c) => c > 1).length;


    /* ---------------------------------------------------
     FINAL RESPONSE → EVERYTHING IN ONE API
    --------------------------------------------------- */
    res.json({
      success: true,

      real_time_sales: {
        orders_today: salesToday.length,
        total_sales_today: totalSalesToday,
        salesToday,
      },

      inventory_status: {
        lowStock,
        outOfStock,
      },

      daily_summary: {
        totalSales: dayTotalSales,
        totalTax: dayTotalTax,
        totalItemsSold: totalItemsSoldToday,
        topSellingToday,
      },

      gst_report: {
        month,
        year,
        monthlySales,
        monthlyGST,
        bills: monthBills.length,
      },

      store_performance: {
        last30_days_orders: last30Bills.length,
        revenue30,
        avgOrderValue,
        repeatCustomers,
      },
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

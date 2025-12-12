const { BetaAnalyticsDataClient } = require("@google-analytics/data");
const path = require("path");

// GA4 property ID
const GA_PROPERTY_ID = "YOUR_GA_PROPERTY_ID";

const analyticsDataClient = new BetaAnalyticsDataClient({
  keyFilename: path.join(__dirname, "../Config/ga-service-account.json"),
});


exports.getGAOverview = async (req, res) => {
  try {
    const [report] = await analyticsDataClient.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      dateRanges: [
        {
          startDate: "7daysAgo",
          endDate: "today",
        },
      ],
      metrics: [
        { name: "activeUsers" },
        { name: "eventCount" },
        { name: "screenPageViews" },
      ],
    });

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


exports.getGAEvents = async (req, res) => {
  try {
    const [report] = await analyticsDataClient.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }],
    });

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.getUserActivity = async (req, res) => {
  try {
    const { userId } = req.params;

    const [report] = await analyticsDataClient.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      dimensions: [
        { name: "eventName" },
        { name: "date" },
        { name: "userId" },
      ],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        filter: {
          fieldName: "userId",
          stringFilter: {
            value: userId,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

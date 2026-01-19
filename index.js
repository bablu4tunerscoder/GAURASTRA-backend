

const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./Config/DB");
const path = require("path");

// Routes imported
const authRoutes = require("./Routes/authRouter");
const userRoutes = require("./Routes/userRouter");
const categoryRoutes = require("./Routes/categoryRouter");
const subcategoryRoutes = require("./Routes/subCategoryRouter");
const ProductRouter = require("./Routes/productRouter");
const orderRouter = require("./Routes/orderRouter");
const paymentRouter = require("./Routes/paymentRoutes");
const blogRoutes = require("./Routes/blogRoutes");
const landingRoutes = require("./Routes/landingRoutes");
const userActivityRoutes = require("./Routes/UserActivityRouter");
const facebookEventsRoutes = require("./Routes/facebookEventsRoute");
const couponRouterPublic = require("./Routes/couponRoutesPublic");
const couponRouterUser = require("./Routes/couponRoutesUser");
const couponRouterMain = require("./Routes/couponRoutesMain");
const bannerRoutes = require("./Routes/bannerRoutes");
const leadRoutes = require('./Routes/leadRoutes');
const ratingRoutes = require('./Routes/ratingRoutes');
const assignRoutes = require('./Routes/assignRoutes');
const googleAnalyticsRoutes = require('./Routes/GoogleAnalyticsRoutes');
const cartRouter = require('./Routes/cartRoutes');
const wishlistRoutes = require('./Routes/wishlistRoutes');
const newsletterRoutes = require('./Routes/newsletterR');
const contactRoutes = require('./Routes/contactusR');
const homeRoutes = require('./Routes/homeRoutes');
const userAddressRouter = require('./Routes/userAddressRouter');
const checkoutRoutes = require('./Routes/checkoutRoutes');

const RootRoutesOffline = require('./gaurastra-offline/routes/root');


dotenv.config();
connectDB();

const app = express();

// ✅ CORS Configuration
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://www.gaurastra.com",
  "https://www.pilot9522.gaurastra.com",
  "https://test.gaurastra.com",
  "https://testpanel.gaurastra.com",
  "http://192.168.1.10:3000",
];

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self' https:; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://mercury.phonepe.com https://mercurystatic.phonepe.com https://dgq88cldibal5.cloudfront.net https://linchpin.phonepe.com blob:; " +
      "connect-src 'self' https://api.phonepe.com https://mercury.phonepe.com https://sentry.phonepe.com; " +
      "img-src 'self' data: https:; " +
      "style-src 'self' 'unsafe-inline' https:; " +
      "frame-src 'self' https://mercury.phonepe.com; " +
      "worker-src 'self' blob: https://mercury.phonepe.com; " +
      "child-src 'self' blob: https://mercury.phonepe.com;"
  );

  next();
});

// CORS configuration
app.use(
  cors({
    origin: allowedOrigins,
    methods: "GET,POST,PUT,DELETE,PATCH,OPTIONS",
    credentials: true,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-CSRF-Token",
    ],
    exposedHeaders: ["X-Request-ID", "Content-Security-Policy"],
    maxAge: 86400, // 24 hours
  })
);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static folder
app.use(
  "/Uploads",
  express.static(path.join(__dirname, "Uploads"), {
    setHeaders: (res) => {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.set("Referrer-Policy", "no-referrer");
      res.set("Content-Security-Policy", "default-src 'self'");
    },
  })
);

// Routes

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/subcategories", subcategoryRoutes);
app.use("/api/Productes", ProductRouter);
app.use("/api/orders", orderRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/blogs", blogRoutes);
app.use("/api/landing", landingRoutes);
app.use("/api/activity", userActivityRoutes);
app.use("/api/facebook", facebookEventsRoutes);
app.use("/api/coupons-user", couponRouterUser);
app.use("/api/coupons-public", couponRouterPublic);
app.use("/api/coupons", couponRouterMain);
app.use("/api/banner", bannerRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/rating', ratingRoutes);
app.use("/api/assign/",assignRoutes );
app.use("/api/ga/", googleAnalyticsRoutes);
app.use("/api", homeRoutes);
app.use("/api/cart", cartRouter);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api/user-address", userAddressRouter);
app.use("/api/checkout", checkoutRoutes);



app.use("/api/offline", RootRoutesOffline);


// Main test route
app.get("/", (req, res) => res.send("API Running..."));

// Start server
const PORT = process.env.PORT || 9090;
// app.listen(PORT,"0.0.0.0", () => console.log(`Server running on port ${PORT}`));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

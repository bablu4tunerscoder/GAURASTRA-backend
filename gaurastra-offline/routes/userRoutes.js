const express = require("express");
const router = express.Router();
const UserCtrl = require("../controllers/userController");

router.post("/register", UserCtrl.registerUser);
router.get("/userdetails/:email", UserCtrl.getUserDetailsByEmail);
router.put("/updatename/:id", UserCtrl.updateName);
router.put("/updatepassword/:id", UserCtrl.updatePassword);
router.delete("/deleteuser/:id", UserCtrl.deleteUser);
router.get("/allusers", UserCtrl.getAllUsers);


router.post("/login", UserCtrl.loginUser);


module.exports = router;

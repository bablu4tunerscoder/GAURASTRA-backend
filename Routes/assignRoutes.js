const express = require("express");
const router = express.Router();

const { authCheck, adminCheck } = require("../Utils/JWTAuth");
const { assignRole, assignPermissions } = require("../Controllers/assignRoleController");


router.post("/role", authCheck, adminCheck, assignRole);
router.post("/permissions", authCheck, adminCheck, assignPermissions);


module.exports = router;


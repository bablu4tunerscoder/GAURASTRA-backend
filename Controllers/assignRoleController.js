
const User = require("../Models/userModel");


const allowedRoles = ["Customer", "Employee", "Admin"];

exports.assignRole = async (req, res) => {
  try {
    const { user_id, role } = req.body;

    if (!user_id || !role) {
      return res.status(400).json({ message: "user_id and role required" });
    }

    
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const user = await User.findById(user_id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update role
    user.role = role;

    // Auto-set default permissions based on role
    if (role === "Admin") {
      user.permissions = ["*"];      
    } 
    else if (role === "Customer") {
      user.permissions = [];         
    } 
    else if (role === "Employee") {
      user.permissions =  []
    }

    await user.save();

    return res.status(200).json({
      message: "Role updated successfully",
      user
    });

  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};


exports.assignPermissions = async (req, res) => {
  try {
    const { user_id, permissions } = req.body;

    if (!user_id || !permissions) {
      return res.status(400).json({ message: "user_id and permissions required" });
    }

    const user = await User.findById(user_id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

   
    if (user.role !== "Employee") {
      return res.status(400).json({
        message: "Only Employee role can have permissions"
      });
    }

    // permissions must be an array
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ message: "Permissions must be an array" });
    }

    const valid = permissions.every(p => typeof p === "string" && p.trim() !== "");

    if (!valid) {
      return res.status(400).json({ message: "Invalid permission format" });
    }

    // Update permissions
    user.permissions = permissions;

    await user.save();

    return res.status(200).json({
      message: "Permissions updated successfully",
      user
    });

  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

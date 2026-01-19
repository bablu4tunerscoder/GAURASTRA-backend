const UserAddress = require("../Models/userAddressModel");


const addAddress = async (req, res) => {
  try {
    const user_id = req.user.userid;

    const {
      name,
      phone,
      alternate_phone,
      address_line1,
      address_line2,
      landmark,
      city,
      state,
      country,
      pincode,
      address_type
    } = req.body;

    if (!name || !phone || !address_line1 || !city || !state || !pincode) {
      return res.status(400).json({
        status: "0",
        message: "Required fields missing",
      });
    }


   

    const address = await UserAddress.create({
      user_id,
      name,
      phone,
      alternate_phone,
      address_line1,
      address_line2,
      landmark,
      city,
      state,
      country,
      pincode,
      address_type,
    });

    res.status(201).json({
      status: "1",
      message: "Address added successfully",
      data: address,
    });
  } catch (error) {
    console.error("Add address error:", error);
    res.status(500).json({
      status: "0",
      message: "Server error",
      error: error.message,
    });
  }
};


const getMyAddresses = async (req, res) => {
  try {
    const user_id = req.user.userid;

    const addresses = await UserAddress.find({ user_id })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      status: "1",
      message: "Addresses fetched successfully",
      count: addresses.length,
      data: addresses,
    });
  } catch (error) {
    console.error("Get addresses error:", error);
    res.status(500).json({
      status: "0",
      message: "Server error",
      error: error.message,
    });
  }
};


const updateAddress = async (req, res) => {
  try {
    const user_id = req.user.userid;
    const { address_id } = req.params;

    const updateData = req.body;

    const updatedAddress = await UserAddress.findOneAndUpdate(
      { _id: address_id, user_id },
      updateData,
      { new: true }
    ).lean();

    if (!updatedAddress) {
      return res.status(404).json({
        status: "0",
        message: "Address not found",
      });
    }

    res.status(200).json({
      status: "1",
      message: "Address updated successfully",
      data: updatedAddress,
    });
  } catch (error) {
    console.error("Update address error:", error);
    res.status(500).json({
      status: "0",
      message: "Server error",
      error: error.message,
    });
  }
};


const deleteAddress = async (req, res) => {
  try {
    const user_id = req.user.userid;
    const { address_id } = req.params;

    const deleted = await UserAddress.findOneAndDelete({
      _id: address_id,
      user_id,
    });

    if (!deleted) {
      return res.status(404).json({
        status: "0",
        message: "Address not found",
      });
    }

    res.status(200).json({
      status: "1",
      message: "Address deleted successfully",
    });
  } catch (error) {
    console.error("Delete address error:", error);
    res.status(500).json({
      status: "0",
      message: "Server error",
      error: error.message,
    });
  }
};




module.exports = {
  addAddress,
  getMyAddresses,
  updateAddress,
  deleteAddress,
 
};

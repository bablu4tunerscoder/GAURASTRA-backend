const ContactUs = require("../Models/contactusM");
const { pagination_ } = require("../utilities/pagination_");

// ✅ Create Contact (User side)
const createContact = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // 🔹 Validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        status: "0",
        message: "All fields are required",
      });
    }

    const contact = await ContactUs.create({
      name,
      email,
      subject,
      message,
      status: "pending",
    });

    return res.status(201).json({
      status: "1",
      message: "Contact request submitted successfully",
      data: contact,
    });

  } catch (error) {
    console.error("Create Contact Error:", error);
    return res.status(500).json({
      status: "0",
      message: "Internal Server Error",
    });
  }
};



// ✅ Get All Contacts (Admin)
const getAllContacts = async (req, res) => {
  try {
    // 🔹 Pagination
    const { page, limit, skip, hasPrevPage } = pagination_(req.query, {
      defaultLimit: 10,
      maxLimit: 20,
    });

    // 🔹 Filter by status (optional)
    const filter = req.query.status
      ? { status: req.query.status }
      : {};

    const [contacts, totalRecords] = await Promise.all([
      ContactUs.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      ContactUs.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalRecords / limit);
    const hasNextPage = page < totalPages;

    return res.status(200).json({
      status: "1",
      message: "Contacts fetched successfully",

      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasPrevPage,
        hasNextPage,
      },

      data: contacts,
    });

  } catch (error) {
    console.error("Get Contacts Error:", error);
    return res.status(500).json({
      status: "0",
      message: "Internal Server Error",
    });
  }
};



// ✅ Get Contact By ID
const getContactById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: "0",
        message: "Contact ID is required",
      });
    }

    const contact = await ContactUs.findById(id).lean();

    if (!contact) {
      return res.status(404).json({
        status: "0",
        message: "Contact not found",
      });
    }

    return res.status(200).json({
      status: "1",
      message: "Contact fetched successfully",
      data: contact,
    });

  } catch (error) {
    console.error("Get Contact By ID Error:", error);
    return res.status(500).json({
      status: "0",
      message: "Internal Server Error",
    });
  }
};



// ✅ Update Contact Status (Admin)
const updateContactStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["pending", "working", "done"].includes(status)) {
      return res.status(400).json({
        status: "0",
        message: "Invalid status value",
      });
    }

    const contact = await ContactUs.findById(id);

    if (!contact) {
      return res.status(404).json({
        status: "0",
        message: "Contact not found",
      });
    }

    contact.status = status;
    await contact.save();

    return res.status(200).json({
      status: "1",
      message: "Contact status updated successfully",
      data: contact,
    });

  } catch (error) {
    console.error("Update Contact Status Error:", error);
    return res.status(500).json({
      status: "0",
      message: "Internal Server Error",
    });
  }
};



// ✅ Delete Contact (Admin)
const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await ContactUs.findByIdAndDelete(id);

    if (!contact) {
      return res.status(404).json({
        status: "0",
        message: "Contact not found",
      });
    }

    return res.status(200).json({
      status: "1",
      message: "Contact deleted successfully",
    });

  } catch (error) {
    console.error("Delete Contact Error:", error);
    return res.status(500).json({
      status: "0",
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  createContact,
  getAllContacts,
  getContactById,
  updateContactStatus,
  deleteContact,
};

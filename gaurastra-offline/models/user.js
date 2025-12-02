const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid"); // Good for generating unique IDs

// --- User Schema ---

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true, 
      trim: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
    },

    name: { type: String, trim: true, required:true },
  
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    is_active: {
      type: Boolean,
      default: true,
    },

  },
  {
    timestamps: true,
  }
);

UserSchema.virtual("full_name").get(function () {
  if (this.first_name || this.last_name) {
    return `${this.first_name} ${this.last_name}`.trim();
  }
  return this.username;
});


module.exports = mongoose.model("OfflineUser", UserSchema);
const mongoose = require("mongoose");

const postSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "title is requried"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "description is requried"],
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timeStamps: true }
);

modules.export = mongoose.model("Post", postSchema);

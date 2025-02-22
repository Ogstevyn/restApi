const { signupSchema } = require("../middleware/validator");
const userModel = require("../models/userModel");
const { doHash } = require("../utils/hashing");

exports.signup = async (req, res) => {
  const { email, password } = req.body;
  try {
    const { error, value } = signupSchema.validate({ email, password });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const existingUser = await userModel.findOne({ email });

    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "This user already exists" });
    }

    const hashedPassword = await doHash(password, 12);

    const newUser = new userModel({
      email,
      password: hashedPassword,
    });

    const result = await newUser.save();
    result.password = undefined;
    res
      .status(201)
      .json({ success: true, message: "User created successfully!", result });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "User creation failed" });
  }
};

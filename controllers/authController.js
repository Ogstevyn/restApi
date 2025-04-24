const { jwt } = require("jsonwebtoken");
const { signupSchema, signinSchema } = require("../middleware/validator");
const userModel = require("../models/userModel");
const { doHash, doHashValidation } = require("../utils/hashing");

//signup

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

//signin
exports.signin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const { error, value } = signinSchema.validate({ email, password });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const existingUser = await User.findOne({ email }).select("+password");

    if (!existingUser) {
      return res
        .status(401)
        .json({ success: false, message: "User does not exist!" });
    }

    const result = await doHashValidation(password, existingUser.password);
    if (!result) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials!" });
    }

    const token = jwt.sign(
      {
        userId: existingUser._id,
        email: existingUser.email,
        verified: existingUser.verified,
      },
      process.env.TOKEN_SECRET,
      {
        expiresIn: "8h",
      }
    );

    res
      .cookie("Authorization", "Bearer" + token, {
        expires: new Date(Date.now + 8 * 3600000),
        httpOnly: process.env.NODE_ENV === "production",
        secure: process.env.NODE_ENV === "production",
      })
      .json({
        success: true,
        token,
        message: "User logged in successfully!",
      });
  } catch (error) {
    console.log(error);
  }
};

//signout
exports.signout = async (req, res) => {
  res
    .clearCookie("Auhorization")
    .status(200)
    .json({ success: true, message: "User signed out successfully!" });
};

//verification

exports.sendVerificationCode = async (req, res) => {
  const { email } = req.body;
  try {
    const existingUser = await user.findOne({ email });

    if (!existingUser) {
      return res(404).josn({ success: false, message: "User does not exist!" });
    }
    if (existingUser.verified) {
      return res
        .status(400)
        .json({ success: false, message: "User is already verified!" });
    }

    const codeValue = Math.floor(Math.random() * 100000).toString();
  } catch (error) {
    console.log(error);
    //   res.status(500).json({ success: false, message: "Verification failed" });
    //
  }
};

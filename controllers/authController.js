const jwt = require("jsonwebtoken");
const {
  signupSchema,
  signinSchema,
  acceptCodeSchema,
} = require("../middleware/validator");
const userModel = require("../models/userModel");
const { doHash, doHashValidation, hmacProcess } = require("../utils/hashing");
const transport = require("../middleware/sendMail");

// Signup
exports.signup = async (req, res) => {
  const { email, password } = req.body;
  try {
    const { error } = signupSchema.validate({ email, password });
    if (error) {
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }

    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "This user already exists" });
    }

    const hashedPassword = await doHash(password, 12);
    const newUser = new userModel({ email, password: hashedPassword });
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

// Signin
exports.signin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const { error } = signinSchema.validate({ email, password });
    if (error) {
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }

    const existingUser = await userModel.findOne({ email }).select("+password");
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
      { expiresIn: "8h" }
    );

    res
      .cookie("Authorization", "Bearer " + token, {
        expires: new Date(Date.now() + 8 * 3600000),
        httpOnly: process.env.NODE_ENV === "production",
        secure: process.env.NODE_ENV === "production",
      })
      .json({ success: true, token, message: "User logged in successfully!" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Signin failed" });
  }
};

// Signout
exports.signout = async (req, res) => {
  res
    .clearCookie("Authorization")
    .status(200)
    .json({ success: true, message: "User signed out successfully!" });
};

// Send Verification Code
exports.sendVerificationCode = async (req, res) => {
  const { email } = req.body;
  try {
    const existingUser = await userModel.findOne({ email });
    if (!existingUser) {
      return res
        .status(404)
        .json({ success: false, message: "User does not exist!" });
    }
    if (existingUser.verified) {
      return res
        .status(400)
        .json({ success: false, message: "User is already verified!" });
    }

    const codeValue = Math.floor(Math.random() * 100000).toString();
    let info = await transport.sendMail({
      from: process.env.NODE_CODE_SENDING_EMAIL_ADDRESS,
      to: existingUser.email,
      subject: "Verification code",
      html: "<h1>" + codeValue + "</h1>",
    });

    if (info.accepted[0] === existingUser.email) {
      const hashedCodeValue = hmacProcess(
        codeValue,
        process.env.HMAC_VERIFICATION_CODE_SECRET
      );
      existingUser.verificationCode = hashedCodeValue;
      existingUser.verificationCodeValidation = Date.now() + 10 * 60 * 1000;
      await existingUser.save();
      return res
        .status(200)
        .json({ success: true, message: "Verification code sent!" });
    }
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ success: false, message: "Failed to send verification code" });
  }
};

// Verify Verification Code
exports.verifyVerificationCode = async (req, res) => {
  const { email, providedCode } = req.body;
  try {
    const { error } = acceptCodeSchema.validate({ email, providedCode });
    if (error) {
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }

    const codeValue = providedCode.toString();
    const existingUser = await userModel
      .findOne({ email })
      .select("+verificationCode +verificationCodeValidation");

    if (!existingUser) {
      return res
        .status(404)
        .json({ success: false, message: "User does not exist!" });
    }
    if (existingUser.verified) {
      return res
        .status(400)
        .json({ success: false, message: "User is already verified!" });
    }
    if (
      !existingUser.verificationCode ||
      !existingUser.verificationCodeValidation
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Something is wrong with the code!" });
    }
    if (Date.now() > existingUser.verificationCodeValidation) {
      return res
        .status(400)
        .json({ success: false, message: "Code is expired!" });
    }

    const hashedCodeValue = hmacProcess(
      codeValue,
      process.env.HMAC_VERIFICATION_CODE_SECRET
    );
    if (hashedCodeValue === existingUser.verificationCode) {
      existingUser.verified = true;
      existingUser.verificationCode = undefined;
      existingUser.verificationCodeValidation = undefined;
      await existingUser.save();
      return res
        .status(200)
        .json({ success: true, message: "User verified successfully!" });
    }

    return res
      .status(400)
      .json({ success: false, message: "Invalid verification code" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Verification failed" });
  }
};

import User from "../models/User.js";
import UserHealthProfile from "../models/UserHealthProfile.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      age,
      gender,
      height,
      weight,
      diseaseTags,
      dietType,
      userType,
      pregnancyStage,
      pregnancyWeek,
      babyBirthDate,
      subscriptionTier,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Missing fields " });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create User (PII/Auth)
    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      userType: userType || "general",
      subscriptionTier: subscriptionTier || "free",
    });

    // Create corresponding Health Profile
    const healthProfile = await UserHealthProfile.create({
      userId: user._id,
      age: age || 25,
      gender: gender || "female",
      height: height || 160,
      weight: weight || 50,
      diseaseTags: diseaseTags || [],
      dietType: dietType || "regular",
      pregnancyStage: pregnancyStage || "pre-natal",
      pregnancyWeek: pregnancyWeek || 0,
      babyBirthDate: babyBirthDate || null,
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    const { password: _, ...safeUserAccount } = user._doc;
    const safeUser = {
      ...safeUserAccount,
      ...healthProfile._doc
    };

    res.status(201).json({ user: safeUser, token });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    let healthProfile = await UserHealthProfile.findOne({ userId: user._id });
    if (!healthProfile) {
      const legacyRaw = user._doc || user;
      healthProfile = await UserHealthProfile.create({
        userId: user._id,
        age: legacyRaw.age || 25,
        gender: legacyRaw.gender || "female",
        height: legacyRaw.height || 160,
        weight: legacyRaw.weight || 50,
        diseaseTags: legacyRaw.diseaseTags || [],
        dietType: legacyRaw.dietType || "regular",
        pregnancyStage: legacyRaw.pregnancyStage || "pre-natal",
        pregnancyWeek: legacyRaw.pregnancyWeek || 0,
        babyBirthDate: legacyRaw.babyBirthDate || null
      });
    }

    const { password: _, ...safeUserAccount } = user._doc;
    const safeUser = {
      ...safeUserAccount,
      ...healthProfile._doc
    };

    res.json({ user: safeUser, token });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const { password: _, ...safeUserAccount } = req.user._doc || req.user;
    const safeUser = {
      ...safeUserAccount,
      ...(req.healthProfile ? (req.healthProfile._doc || req.healthProfile) : {})
    };
    res.json({ user: safeUser });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const imageUrl = `/uploads/profiles/${req.file.filename}`;
    user.profileImage = imageUrl;
    await user.save();

    const healthProfile = await UserHealthProfile.findOne({ userId: user._id });
    const { password: _, ...safeUserAccount } = user._doc;
    const safeUser = {
      ...safeUserAccount,
      ...(healthProfile ? healthProfile._doc : {})
    };

    res.json({ user: safeUser });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

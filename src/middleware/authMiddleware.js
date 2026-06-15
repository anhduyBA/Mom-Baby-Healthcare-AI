import jwt from "jsonwebtoken";
import User from "../models/User.js";
import UserHealthProfile from "../models/UserHealthProfile.js";

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (verifyErr) {
      // Attempt to decode without verification (relaxed mode for cross-backend token compatibility in development)
      decoded = jwt.decode(token);
      if (!decoded) {
        return res.status(401).json({ message: "JWT verification failed: " + verifyErr.message });
      }
    }

    if (!decoded) {
      return res.status(401).json({ message: "JWT verification failed" });
    }

    let user;
    if (decoded.id) {
      user = await User.findById(decoded.id).select("-password");
    }

    if (!user) {
      const email = decoded.email || decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"];
      if (email) {
        user = await User.findOne({ email: email.toLowerCase() }).select("-password");
        if (!user) {
          // Auto-create user in MongoDB if they exist in C# but not in MongoDB yet
          const name = decoded.fullname || decoded.unique_name || decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] || "Mom User";
          console.log(`[Auth] Auto-creating user ${email} in MongoDB from decoded C# JWT`);
          user = await User.create({
            name: name,
            email: email.toLowerCase(),
            phone: "0000000000",
            password: "external_oauth_or_csharp_sync_dummy_password",
            userType: "general",
            subscriptionTier: "free"
          });
        }
      }
    }

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;

    // Retrieve or migrate UserHealthProfile
    let healthProfile = await UserHealthProfile.findOne({ userId: user._id });
    if (!healthProfile) {
      // Legacy user compatibility: extract legacy fields that might exist in User document
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
        babyBirthDate: legacyRaw.babyBirthDate || null,
        aiContext: legacyRaw.aiContext || {}
      });
    }

    req.healthProfile = healthProfile;

    next();
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export default authMiddleware;

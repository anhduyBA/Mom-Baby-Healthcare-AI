/**
 * Middleware to verify that the logged-in user has admin privileges.
 */
export default function adminMiddleware(req, res, next) {
  if (req.user && (req.user.userType === "admin" || req.user.isAdmin === true)) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: "Forbidden: Access is restricted to administrators only."
    });
  }
}

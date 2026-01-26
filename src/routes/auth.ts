import express from "express";
import {
  register,
  registerFarmer,
  login,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  refreshAccessToken,
  logout,
  logoutAll,
  getMe,
  updateMe,
  changePassword,
  suspendUser,
  reactivateUser,
  approveFarmer,
  rejectFarmer,
  getPendingFarmers,
} from "@/controllers/auth";
import { authenticateToken, superAdminMiddleware } from "@/lib/authMiddleware";
// import { 
//   authenticateToken, 
//   superAdminMiddleware 
// } from "@/middleware/authMiddleware";


const router = express.Router();

// ==================== PUBLIC ROUTES ====================

// Farmer registration (with farm onboarding)
router.post("/register-farmer", registerFarmer);

// Other user registration (Vet, Caretaker, Observer)
router.post("/register", register);

// Login
router.post("/login", login);

// Email verification
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);

// Password reset
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Token refresh
router.post("/refresh", refreshAccessToken);

// ==================== PROTECTED ROUTES ====================

// Logout
router.post("/logout", authenticateToken, logout);
router.post("/logout-all", authenticateToken, logoutAll);

// User profile
router.get("/me", authenticateToken, getMe);
router.patch("/me", authenticateToken, updateMe);

// Change password
router.post("/change-password", authenticateToken, changePassword);

// ==================== SUPER ADMIN ROUTES ====================

// Farmer approval management
router.get(
  "/admin/pending-farmers",
  authenticateToken,
  superAdminMiddleware,
  getPendingFarmers
);
router.post(
  "/admin/approve-farmer/:userId",
  authenticateToken,
  superAdminMiddleware,
  approveFarmer
);
router.post(
  "/admin/reject-farmer/:userId",
  authenticateToken,
  superAdminMiddleware,
  rejectFarmer
);

// User management
router.post(
  "/suspend/:userId",
  authenticateToken,
  superAdminMiddleware,
  suspendUser
);
router.post(
  "/reactivate/:userId",
  authenticateToken,
  superAdminMiddleware,
  reactivateUser
);

export default router;
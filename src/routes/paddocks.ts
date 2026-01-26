// import { Router } from "express";
// import {
//   createPaddock,
//   getPaddocks,
//   getPaddock,
//   updatePaddock,
//   deletePaddock,
//   moveAnimalsToPaddock,
//   removeAnimalsFromPaddock,
//   getPaddockStats,
// } from "../controllers/paddocks";
// import {
//   createGrazingHistory,
//   getGrazingHistory,
//   getSingleGrazingHistory,
//   updateGrazingHistory,
//   deleteGrazingHistory,
//   endActiveGrazing,
//   getGrazingAnalytics,
// } from "../controllers/grazing";
// import {
//   createSoilTest,
//   getSoilTests,
//   getSingleSoilTest,
//   updateSoilTest,
//   deleteSoilTest,
//   getSoilTrends,
//   comparePaddockSoils,
// } from "../controllers/pasturesoil";
// // import { authenticate } from "../middleware/auth";
// // import { validateRequest } from "../middleware/validation";
// import { body, param, query } from "express-validator";
// import { authenticateToken } from "@/lib/authMiddleware";

// const router = Router();

// // ==================== VALIDATION RULES ====================

// // Paddock validations
// const createPaddockValidation = [
//   param("farmId").isString().notEmpty(),
//   body("name").isString().trim().notEmpty(),
//   body("number").optional().isString(),
//   body("sizeInAcres").optional().isFloat({ min: 0 }),
//   body("grassType").optional().isString(),
//   body("status")
//     .optional()
//     .isIn(["AVAILABLE", "IN_USE", "RESTING", "MAINTENANCE"]),
// ];

// const updatePaddockValidation = [
//   param("farmId").isString().notEmpty(),
//   param("paddockId").isString().notEmpty(),
// ];

// const moveAnimalsValidation = [
//   param("farmId").isString().notEmpty(),
//   param("paddockId").isString().notEmpty(),
//   body("animalIds").isArray().notEmpty(),
//   body("animalIds.*").isString(),
//   body("startGrazing").optional().isBoolean(),
// ];

// // Grazing history validations
// const createGrazingHistoryValidation = [
//   param("farmId").isString().notEmpty(),
//   param("paddockId").isString().notEmpty(),
//   body("animalIds").optional().isArray(),
//   body("startDate").optional().isISO8601(),
//   body("endDate").optional().isISO8601(),
// ];

// // Soil test validations
// const createSoilTestValidation = [
//   param("farmId").isString().notEmpty(),
//   param("paddockId").isString().notEmpty(),
//   body("pH").isFloat({ min: 0, max: 14 }),
//   body("organicMatter").optional().isFloat({ min: 0 }),
//   body("nitrogen").optional().isFloat({ min: 0 }),
//   body("phosphorus").optional().isFloat({ min: 0 }),
//   body("potassium").optional().isFloat({ min: 0 }),
// ];

// // ==================== PADDOCK ROUTES ====================

// /**
//  * @route   POST /api/v1/farms/:farmId/paddocks
//  * @desc    Create a new paddock
//  * @access  Private (Owner/Manager)
//  */
// router.post(
//   "/farms/:farmId/paddocks",
//   
//   createPaddockValidation,
//   validateRequest,
//   createPaddock
// );

// /**
//  * @route   GET /api/v1/farms/:farmId/paddocks
//  * @desc    Get all paddocks for a farm
//  * @access  Private (Farm members)
//  */
// router.get(
//   "/farms/:farmId/paddocks",
//   authenticate,
//   param("farmId").isString().notEmpty(),
//   validateRequest,
//   getPaddocks
// );

// /**
//  * @route   GET /api/v1/farms/:farmId/paddocks/stats
//  * @desc    Get paddock statistics
//  * @access  Private (Farm members)
//  */
// router.get(
//   "/farms/:farmId/paddocks/stats",
//   authenticate,
//   param("farmId").isString().notEmpty(),
//   validateRequest,
//   getPaddockStats
// );

// /**
//  * @route   GET /api/v1/farms/:farmId/paddocks/:paddockId
//  * @desc    Get single paddock details
//  * @access  Private (Farm members)
//  */
// router.get(
//   "/farms/:farmId/paddocks/:paddockId",
//   authenticate,
//   param("farmId").isString().notEmpty(),
//   param("paddockId").isString().notEmpty(),
//   validateRequest,
//   getPaddock
// );

// /**
//  * @route   PATCH /api/v1/farms/:farmId/paddocks/:paddockId
//  * @desc    Update paddock details
//  * @access  Private (Owner/Manager)
//  */
// router.patch(
//   "/farms/:farmId/paddocks/:paddockId",
//   authenticate,
//   updatePaddockValidation,
//   validateRequest,
//   updatePaddock
// );

// /**
//  * @route   DELETE /api/v1/farms/:farmId/paddocks/:paddockId
//  * @desc    Delete a paddock
//  * @access  Private (Owner/Manager)
//  */
// router.delete(
//   "/farms/:farmId/paddocks/:paddockId",
//   authenticate,
//   param("farmId").isString().notEmpty(),
//   param("paddockId").isString().notEmpty(),
//   validateRequest,
//   deletePaddock
// );

// /**
//  * @route   POST /api/v1/farms/:farmId/paddocks/:paddockId/animals
//  * @desc    Move animals to paddock
//  * @access  Private (Owner/Manager/Caretaker)
//  */
// router.post(
//   "/farms/:farmId/paddocks/:paddockId/animals",
//   authenticate,
//   moveAnimalsValidation,
//   validateRequest,
//   moveAnimalsToPaddock
// );

// /**
//  * @route   DELETE /api/v1/farms/:farmId/paddocks/:paddockId/animals
//  * @desc    Remove animals from paddock
//  * @access  Private (Owner/Manager/Caretaker)
//  */
// router.delete(
//   "/farms/:farmId/paddocks/:paddockId/animals",
//   authenticate,
//   param("farmId").isString().notEmpty(),
//   param("paddockId").isString().notEmpty(),
//   body("animalIds").isArray().notEmpty(),
//   validateRequest,
//   removeAnimalsFromPaddock
// );

// // ==================== GRAZING HISTORY ROUTES ====================

// /**
//  * @route   POST /api/v1/farms/:farmId/paddocks/:paddockId/grazing-history
//  * @desc    Create grazing history record
//  * @access  Private (Owner/Manager/Caretaker)
//  */
// router.post(
//   "/farms/:farmId/paddocks/:paddockId/grazing-history",
//   authenticate,
//   createGrazingHistoryValidation,
//   validateRequest,
//   createGrazingHistory
// );

// /**
//  * @route   GET /api/v1/farms/:farmId/paddocks/:paddockId/grazing-history
//  * @desc    Get all grazing history for a paddock
//  * @access  Private (Farm members)
//  */
// router.get(
//   "/farms/:farmId/paddocks/:paddockId/grazing-history",
//   authenticate,
//   param("farmId").isString().notEmpty(),
//   param("paddockId").isString().notEmpty(),
//   validateRequest,
//   getGrazingHistory
// );

// /**
//  * @route   GET /api/v1/farms/:farmId/paddocks/:paddockId/grazing-history/analytics
//  * @desc    Get grazing analytics for a paddock
//  * @access  Private (Farm members)
//  */
// router.get(
//   "/farms/:farmId/paddocks/:paddockId/grazing-history/analytics",
//   authenticate,
//   param("farmId").isString().notEmpty(),
//   param("paddockId").isString().notEmpty(),
//   validateRequest,
//   getGrazingAnalytics
// );

// /**
//  * @route   GET /api/v1/farms/:farmId/paddocks/:paddockId/grazing-history/:historyId
//  * @desc    Get single grazing history record
//  * @access  Private (Farm members)
//  */
// router.get(
//   "/farms/:farmId/paddocks/:paddockId/grazing-history/:historyId",
//   authenticate,
//   param("farmId").isString().notEmpty(),
//   param("paddockId").isString().notEmpty(),
//   param("historyId").isString().notEmpty(),
//   validateRequest,
//   getSingleGrazingHistory
// );

// /**
//  * @route   PATCH /api/v1/farms/:farmId/paddocks/:paddockId/grazing-history/:historyId
//  * @desc    Update grazing history record
//  * @access  Private (Owner/Manager/Caretaker)
//  */
// router.patch(
//   "/farms/:farmId/paddocks/:paddockId/grazing-history/:historyId",
//   authenticate,
//   param("farmId").isString().notEmpty(),
//   param("paddockId").isString().notEmpty(),
//   param("historyId").isString().notEmpty(),
//   validateRequest,
//   updateGrazingHistory
// );

// /**
//  * @route   DELETE /api/v1/farms/:farmId/paddocks/:paddockId/grazing-history/:historyId
//  * @desc    Delete grazing history record
//  * @access  Private (Owner/Manager)
//  */
// router.delete(
//   "/farms/:farmId/paddocks/:paddockId/grazing-history/:historyId",
//   authenticate,
//   param("farmId").isString().notEmpty(),
//   param("paddockId").isString().notEmpty(),
//   param("historyId").isString().notEmpty(),
//   validateRequest,
//   deleteGrazingHistory
// );

// /**
//  * @route   POST /api/v1/farms/:farmId/paddocks/:paddockId/grazing-history/end-active
//  * @desc    End active grazing session
//  * @access  Private (Owner/Manager/Caretaker)
//  */
// router.post(
//   "/farms/:farmId/paddocks/:paddockId/grazing-history/end-active",
//   authenticate,
//   param("farmId").isString().notEmpty(),
//   param("paddockId").isString().notEmpty(),
//   validateRequest,
//   endActiveGrazing
// );

// // ==================== SOIL TEST ROUTES ====================

// /**
//  * @route   POST /api/v1/farms/:farmId/paddocks/:paddockId/soil-tests
//  * @desc    Create soil test record
//  * @access  Private (Owner/Manager)
//  */
// router.post(
//   "/farms/:farmId/paddocks/:paddockId/soil-tests",
//   authenticate,
//   createSoilTestValidation,
//   validateRequest,
//   createSoilTest
// );

// /**
//  * @route   GET /api/v1/farms/:farmId/paddocks/:paddockId/soil-tests
//  * @desc    Get all soil tests for a paddock
//  * @access  Private (Farm members)
//  */
// router.get(
//   "/farms/:farmId/paddocks/:paddockId/soil-tests",
//   authenticate,
//   param("farmId").isString().notEmpty(),
//   param("paddockId").isString().notEmpty(),
//   validateRequest,
//   getSoilTests
// );

// /**
//  * @route   GET /api/v1/farms/:farmId/paddocks/:paddockId/soil-tests/trends
//  * @desc    Get soil trends for a paddock
//  * @access  Private (Farm members)
//  */
// router.get(
//   "/farms/:farmId/paddocks/:paddockId/soil-tests/trends",
//   authenticate,
//   param("farmId").isString().notEmpty(),
//   param("paddockId").isString().notEmpty(),
//   validateRequest,
//   getSoilTrends
// );

// /**
//  * @route   GET /api/v1/farms/:farmId/paddocks/:paddockId/soil-tests/:testId
//  * @desc    Get single soil test record
//  * @access  Private (Farm members)
//  */
// router.get(
//   "/farms/:farmId/paddocks/:paddockId/soil-tests/:testId",
//   authenticate,
//   param("farmId").isString().notEmpty(),
//   param("paddockId").isString().notEmpty(),
//   param("testId").isString().notEmpty(),
//   validateRequest,
//   getSingleSoilTest
// );

// /**
//  * @route   PATCH /api/v1/farms/:farmId/paddocks/:paddockId/soil-tests/:testId
//  * @desc    Update soil test record
//  * @access  Private (Owner/Manager)
//  */
// router.patch(
//   "/farms/:farmId/paddocks/:paddockId/soil-tests/:testId",
//   authenticate,
//   param("farmId").isString().notEmpty(),
//   param("paddockId").isString().notEmpty(),
//   param("testId").isString().notEmpty(),
//   validateRequest,
//   updateSoilTest
// );

// /**
//  * @route   DELETE /api/v1/farms/:farmId/paddocks/:paddockId/soil-tests/:testId
//  * @desc    Delete soil test record
//  * @access  Private (Owner/Manager)
//  */
// router.delete(
//   "/farms/:farmId/paddocks/:paddockId/soil-tests/:testId",
//   authenticate,
//   param("farmId").isString().notEmpty(),
//   param("paddockId").isString().notEmpty(),
//   param("testId").isString().notEmpty(),
//   validateRequest,
//   deleteSoilTest
// );

// /**
//  * @route   GET /api/v1/farms/:farmId/paddocks/soil-tests/compare
//  * @desc    Compare soil health across all paddocks
//  * @access  Private (Farm members)
//  */
// router.get(
//   "/farms/:farmId/paddocks/soil-tests/compare",
//   authenticate,
//   param("farmId").isString().notEmpty(),
//   validateRequest,
//   comparePaddockSoils
// );

// export default router;
















// routes/paddocks.ts
import { Router } from "express";
import {
  createPaddock,
  getPaddocks,
  getPaddock,
  updatePaddock,
  deletePaddock,
  moveAnimalsToPaddock,
  removeAnimalsFromPaddock,
  getPaddockStats,
} from "../controllers/paddocks";
import {
  createGrazingHistory,
  getGrazingHistory,
  getSingleGrazingHistory,
  updateGrazingHistory,
  deleteGrazingHistory,
  endActiveGrazing,
  getGrazingAnalytics,
} from "../controllers/grazing";
import {
  createSoilTest,
  getSoilTests,
  getSingleSoilTest,
  updateSoilTest,
  deleteSoilTest,
  getSoilTrends,
  comparePaddockSoils,
} from "../controllers/pasturesoil";
// import { authenticateToken } from "@/lib/authMiddleware";

const router = Router();

// ==================== PADDOCK ROUTES ====================

/**
 * @route   POST /api/v1/farms/:farmId/paddocks
 * @desc    Create a new paddock
 * @access  Private (Owner/Manager)
 */
router.post(
  "/farms/:farmId/paddocks",
  // 
  createPaddock
);

/**
 * @route   GET /api/v1/farms/:farmId/paddocks
 * @desc    Get all paddocks for a farm
 * @access  Private (Farm members)
 */
router.get(
  "/farms/:farmId/paddocks",
  // 
  getPaddocks
);

/**
 * @route   GET /api/v1/farms/:farmId/paddocks/stats
 * @desc    Get paddock statistics
 * @access  Private (Farm members)
 */
router.get(
  "/farms/:farmId/paddocks/stats",
  // 
  getPaddockStats
);

/**
 * @route   GET /api/v1/farms/:farmId/paddocks/:paddockId
 * @desc    Get single paddock details
 * @access  Private (Farm members)
 */
router.get(
  "/farms/:farmId/paddocks/:paddockId",
  // 
  getPaddock
);

/**
 * @route   PATCH /api/v1/farms/:farmId/paddocks/:paddockId
 * @desc    Update paddock details
 * @access  Private (Owner/Manager)
 */
router.patch(
  "/farms/:farmId/paddocks/:paddockId",
  // 
  updatePaddock
);

/**
 * @route   DELETE /api/v1/farms/:farmId/paddocks/:paddockId
 * @desc    Delete a paddock
 * @access  Private (Owner/Manager)
 */
router.delete(
  "/farms/:farmId/paddocks/:paddockId",
  // 
  deletePaddock
);

/**
 * @route   POST /api/v1/farms/:farmId/paddocks/:paddockId/animals
 * @desc    Move animals to paddock
 * @access  Private (Owner/Manager/Caretaker)
 */
router.post(
  "/farms/:farmId/paddocks/:paddockId/animals",
  // 
  moveAnimalsToPaddock
);

/**
 * @route   DELETE /api/v1/farms/:farmId/paddocks/:paddockId/animals
 * @desc    Remove animals from paddock
 * @access  Private (Owner/Manager/Caretaker)
 */
router.delete(
  "/farms/:farmId/paddocks/:paddockId/animals",
  // 
  removeAnimalsFromPaddock
);

// ==================== GRAZING HISTORY ROUTES ====================

/**
 * @route   POST /api/v1/farms/:farmId/paddocks/:paddockId/grazing-history
 * @desc    Create grazing history record
 * @access  Private (Owner/Manager/Caretaker)
 */
router.post(
  "/farms/:farmId/paddocks/:paddockId/grazing-history",
  // 
  createGrazingHistory
);

/**
 * @route   GET /api/v1/farms/:farmId/paddocks/:paddockId/grazing-history
 * @desc    Get all grazing history for a paddock
 * @access  Private (Farm members)
 */
router.get(
  "/farms/:farmId/paddocks/:paddockId/grazing-history",
  // 
  getGrazingHistory
);

/**
 * @route   GET /api/v1/farms/:farmId/paddocks/:paddockId/grazing-history/analytics
 * @desc    Get grazing analytics for a paddock
 * @access  Private (Farm members)
 */
router.get(
  "/farms/:farmId/paddocks/:paddockId/grazing-history/analytics",
  // 
  getGrazingAnalytics
);

/**
 * @route   GET /api/v1/farms/:farmId/paddocks/:paddockId/grazing-history/:historyId
 * @desc    Get single grazing history record
 * @access  Private (Farm members)
 */
router.get(
  "/farms/:farmId/paddocks/:paddockId/grazing-history/:historyId",
  // 
  getSingleGrazingHistory
);

/**
 * @route   PATCH /api/v1/farms/:farmId/paddocks/:paddockId/grazing-history/:historyId
 * @desc    Update grazing history record
 * @access  Private (Owner/Manager/Caretaker)
 */
router.patch(
  "/farms/:farmId/paddocks/:paddockId/grazing-history/:historyId",
  // 
  updateGrazingHistory
);

/**
 * @route   DELETE /api/v1/farms/:farmId/paddocks/:paddockId/grazing-history/:historyId
 * @desc    Delete grazing history record
 * @access  Private (Owner/Manager)
 */
router.delete(
  "/farms/:farmId/paddocks/:paddockId/grazing-history/:historyId",
  
  deleteGrazingHistory
);

/**
 * @route   POST /api/v1/farms/:farmId/paddocks/:paddockId/grazing-history/end-active
 * @desc    End active grazing session
 * @access  Private (Owner/Manager/Caretaker)
 */
router.post(
  "/farms/:farmId/paddocks/:paddockId/grazing-history/end-active",
  
  endActiveGrazing
);

// ==================== SOIL TEST ROUTES ====================

/**
 * @route   POST /api/v1/farms/:farmId/paddocks/:paddockId/soil-tests
 * @desc    Create soil test record
 * @access  Private (Owner/Manager)
 */
router.post(
  "/farms/:farmId/paddocks/:paddockId/soil-tests",
  
  createSoilTest
);

/**
 * @route   GET /api/v1/farms/:farmId/paddocks/:paddockId/soil-tests
 * @desc    Get all soil tests for a paddock
 * @access  Private (Farm members)
 */
router.get(
  "/farms/:farmId/paddocks/:paddockId/soil-tests",
  
  getSoilTests
);

/**
 * @route   GET /api/v1/farms/:farmId/paddocks/:paddockId/soil-tests/trends
 * @desc    Get soil trends for a paddock
 * @access  Private (Farm members)
 */
router.get(
  "/farms/:farmId/paddocks/:paddockId/soil-tests/trends",
  
  getSoilTrends
);

/**
 * @route   GET /api/v1/farms/:farmId/paddocks/:paddockId/soil-tests/:testId
 * @desc    Get single soil test record
 * @access  Private (Farm members)
 */
router.get(
  "/farms/:farmId/paddocks/:paddockId/soil-tests/:testId",
  
  getSingleSoilTest
);

/**
 * @route   PATCH /api/v1/farms/:farmId/paddocks/:paddockId/soil-tests/:testId
 * @desc    Update soil test record
 * @access  Private (Owner/Manager)
 */
router.patch(
  "/farms/:farmId/paddocks/:paddockId/soil-tests/:testId",
  
  updateSoilTest
);

/**
 * @route   DELETE /api/v1/farms/:farmId/paddocks/:paddockId/soil-tests/:testId
 * @desc    Delete soil test record
 * @access  Private (Owner/Manager)
 */
router.delete(
  "/farms/:farmId/paddocks/:paddockId/soil-tests/:testId",
  
  deleteSoilTest
);

/**
 * @route   GET /api/v1/farms/:farmId/paddocks/soil-tests/compare
 * @desc    Compare soil health across all paddocks
 * @access  Private (Farm members)
 */
router.get(
  "/farms/:farmId/paddocks/soil-tests/compare",
  
  comparePaddockSoils
);

export default router;
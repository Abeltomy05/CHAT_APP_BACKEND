import express from "express";
const router = express.Router();
import { protectRoute } from "../middleware/auth.middleware.js";
import { getBlockedUsers, blockUser, unblockUser} from "../controllers/user.controller.js";

router.get('/blocked', protectRoute, getBlockedUsers);
router.post("/block", protectRoute, blockUser);
router.post("/unblock", protectRoute, unblockUser);

export default router;
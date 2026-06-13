import { Router } from "express";
import { AdminInstitutionUsersController } from "../controllers/AdminInstitutionUsersController";

const router = Router();

// PUBLIC — a prospective institution submits a join request (no auth).
router.post("/apply", AdminInstitutionUsersController.applyAsInstitution);

export default router;

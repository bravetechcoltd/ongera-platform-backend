import { Router } from 'express';
import { HomePageController } from '../controllers/HomePageController';

const router = Router();

router.get("/homepage/summary", HomePageController.getHomePageSummary);
router.get("/homepage/content", HomePageController.getHomePageContent);

export default router;
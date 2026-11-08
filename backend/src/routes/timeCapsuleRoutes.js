import express from 'express';
import { timeCapsuleController } from '../controllers/timeCapsuleController.js';
import { optionalProtect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', optionalProtect, timeCapsuleController.getMyCapsules);
router.post('/', optionalProtect, timeCapsuleController.createCapsule);
router.post('/:id/open', optionalProtect, timeCapsuleController.openCapsule);
router.delete('/:id', optionalProtect, timeCapsuleController.deleteCapsule);

export default router;

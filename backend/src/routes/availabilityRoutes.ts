import { Router } from 'express';
import { checkDateAvailability, validateSlot } from '../controllers/availabilityController.js';

const router = Router();

router.get('/', checkDateAvailability);
router.post('/check-slot', validateSlot);

export default router;

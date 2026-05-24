import { Router } from 'express';
import userRoutes from './user.routes.js';

const router = Router();

router.use('/users', userRoutes);

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Codeaptor API is operational',
    timestamp: new Date().toISOString(),
  });
});

export default router;

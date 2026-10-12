import express from 'express';
import { streamChat } from '../controllers/chatController.js';

const router = express.Router();

router.post('/stream', streamChat);

export default router;

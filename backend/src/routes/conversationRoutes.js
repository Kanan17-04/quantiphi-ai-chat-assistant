import express from 'express';
import {
  listConversations,
  getConversation,
  createConversation,
  updateConversationTone,
  updateConversationTitle,
  deleteConversation,
  exportConversation,
  savePartialMessage,
} from '../controllers/conversationController.js';

const router = express.Router();

router.get('/', listConversations);
router.post('/', createConversation);
router.get('/:id', getConversation);
router.patch('/:id/tone', updateConversationTone);
router.patch('/:id/title', updateConversationTitle);
router.delete('/:id', deleteConversation);
router.get('/:id/export', exportConversation);
router.post('/:id/messages/partial', savePartialMessage);

export default router;

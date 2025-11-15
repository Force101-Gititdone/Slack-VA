import { Router } from 'express';
const router = Router();
// TODO: Implement Slack webhook routes
router.post('/events', (req, res) => {
    res.json({ ok: true });
});
export default router;
//# sourceMappingURL=slack.js.map
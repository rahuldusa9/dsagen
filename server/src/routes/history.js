import { Router } from 'express';
import Submission from '../models/Submission.js';

const router = Router();

// GET /api/history
router.get('/history', async (req, res, next) => {
  try {
    const { topic, difficulty, result, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (topic) filter['problem.topic'] = { $regex: topic, $options: 'i' };
    if (difficulty) filter['problem.difficulty'] = difficulty;
    if (result) filter.result = result;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [submissions, total] = await Promise.all([
      Submission.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-testResults')
        .lean(),
      Submission.countDocuments(filter)
    ]);
    
    res.json({
      success: true,
      submissions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/history/:id
router.get('/history/:id', async (req, res, next) => {
  try {
    const submission = await Submission.findById(req.params.id).lean();
    
    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Submission not found'
      });
    }
    
    res.json({
      success: true,
      submission
    });
  } catch (err) {
    next(err);
  }
});

export default router;

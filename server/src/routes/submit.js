import { Router } from 'express';
import Submission from '../models/Submission.js';

const router = Router();

// POST /api/submit
router.post('/submit', async (req, res, next) => {
  try {
    const { code, language, problem, results, executionTime, complexity } = req.body;
    
    if (!code || !language || !problem) {
      return res.status(400).json({
        success: false,
        error: 'Code, language, and problem are required'
      });
    }
    
    const passedCount = results ? results.filter(r => r.passed).length : 0;
    const totalCount = results ? results.length : 0;
    const allPassed = passedCount === totalCount && totalCount > 0;
    
    const submission = new Submission({
      problem: {
        title: problem.title,
        topic: problem.topic,
        difficulty: problem.difficulty,
        description: problem.description
      },
      code,
      language,
      result: allPassed ? 'pass' : passedCount > 0 ? 'partial' : 'fail',
      passedCount,
      totalCount,
      executionTime: executionTime || 0,
      testResults: results || [],
      complexity: complexity || {},
      timestamp: new Date()
    });
    
    await submission.save();
    
    res.json({
      success: true,
      submission: {
        id: submission._id,
        result: submission.result,
        passedCount,
        totalCount
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;

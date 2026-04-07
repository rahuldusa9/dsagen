import { Router } from 'express';
import { generateProblem, generateDynamicHint } from '../services/gemini.js';

const router = Router();

// POST /api/generate-problem
router.post('/generate-problem', async (req, res, next) => {
  try {
    const { topic, difficulty } = req.body;
    
    if (!topic || !difficulty) {
      return res.status(400).json({
        success: false,
        error: 'Topic and difficulty are required'
      });
    }
    
    if (!['Easy', 'Medium', 'Hard'].includes(difficulty)) {
      return res.status(400).json({
        success: false,
        error: 'Difficulty must be Easy, Medium, or Hard'
      });
    }
    
    console.log(`Generating ${difficulty} problem for topic: ${topic}`);
    const problem = await generateProblem(topic, difficulty);
    
    res.json({
      success: true,
      problem: { ...problem, topic, difficulty }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/generate-hint
router.post('/generate-hint', async (req, res, next) => {
  try {
    const { problem, code, language, level } = req.body;
    
    if (!problem || !level) {
      return res.status(400).json({
        success: false,
        error: 'Problem and hint level are required'
      });
    }
    
    const result = await generateDynamicHint(problem, code, language, level);
    
    res.json({
      success: true,
      hint: result.hint
    });
  } catch (err) {
    next(err);
  }
});

export default router;

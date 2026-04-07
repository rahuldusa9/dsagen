import { Router } from 'express';
import { analyzeComplexity } from '../services/gemini.js';

const router = Router();

// POST /api/analyze-code
router.post('/analyze-code', async (req, res, next) => {
  try {
    const { code, language, problemTitle } = req.body;
    
    if (!code || !language) {
      return res.status(400).json({
        success: false,
        error: 'Code and language are required'
      });
    }
    
    console.log(`Analyzing ${language} code complexity`);
    const analysis = await analyzeComplexity(code, language, problemTitle);
    
    res.json({
      success: true,
      analysis
    });
  } catch (err) {
    next(err);
  }
});

export default router;

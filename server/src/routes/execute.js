import { Router } from 'express';
import { runCode } from '../services/executor.js';

const router = Router();

// POST /api/run-code
router.post('/run-code', async (req, res, next) => {
  try {
    const { code, language, testCases, customInput, functionSignature } = req.body;
    
    if (!code || !language) {
      return res.status(400).json({
        success: false,
        error: 'Code and language are required'
      });
    }
    
    if (!['javascript', 'java'].includes(language)) {
      return res.status(400).json({
        success: false,
        error: 'Language must be javascript or java'
      });
    }
    
    const hasCustomInput = customInput !== null && customInput !== undefined;
    
    if (!hasCustomInput && (!testCases || !testCases.length)) {
      return res.status(400).json({
        success: false,
        error: 'Test cases or custom input are required'
      });
    }
    
    console.log(`Running ${language} code against ${hasCustomInput ? 'custom input' : testCases.length + ' test cases'}`);
    
    const result = await runCode(code, language, testCases || [], functionSignature, hasCustomInput ? customInput : null);
    
    const passedCount = result.results.filter(r => r.passed).length;
    
    res.json({
      success: true,
      ...result,
      summary: hasCustomInput ? null : {
        passed: passedCount,
        total: result.results.length,
        allPassed: passedCount === result.results.length
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;

import { GoogleGenAI } from '@google/genai';

let ai = null;

function getAI() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

/**
 * Helper: call Gemini with retry logic
 */
async function callGemini(prompt, { temperature = 0.7, maxOutputTokens = 8192, retries = 2 } = {}) {
  const genAI = getAI();
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await genAI.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          temperature,
          maxOutputTokens,
          responseMimeType: 'application/json'
        }
      });

      const text = response.text.trim();
      let jsonStr = text;

      // Remove markdown code fences if present
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      return JSON.parse(jsonStr);
    } catch (e) {
      console.error(`Gemini attempt ${attempt + 1} failed:`, e.message);
      if (attempt === retries) throw e;
      // Brief pause before retry
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}

const PROBLEM_PROMPT = `You are an expert DSA problem creator like LeetCode. Generate an ORIGINAL problem.

Return JSON with this EXACT structure (keep descriptions concise):
{
  "title": "Short Problem Title",
  "description": "Problem description (2-4 sentences). Describe what the function should do.",
  "constraints": ["1 <= nums.length <= 10^5", "etc"],
  "examples": [
    {"input": "nums = [1,2,3], target = 3", "output": "[0,1]", "explanation": "brief why"}
  ],
  "testCases": [
    {"args": [[1,2,3], 3], "expected": [0,1]}
  ],
  "functionSignature": {
    "name": "findLeaders",
    "params": [
      {"name": "nums", "type": "int[]"},
      {"name": "k", "type": "int"}
    ],
    "returnType": "int[]"
  },
  "hints": [
    {"level": 1, "text": "Concept hint"},
    {"level": 2, "text": "Approach hint"},
    {"level": 3, "text": "Pseudocode hint"}
  ],
  "timeComplexity": "O(n)",
  "spaceComplexity": "O(1)",
  "tags": ["array"]
}

CRITICAL RULES:
- "testCases" must have at least 5 entries with edge cases
- "args" is a JSON array of arguments matching the function params in order
- "expected" is the expected return value
- Type mappings: int, int[], int[][], String, String[], boolean, double, List<Integer>, etc.
- functionSignature.name should be camelCase
- Keep it ORIGINAL, don't copy LeetCode exactly
- Difficulty: Easy=single pass/basic, Medium=two pointers/hash maps, Hard=DP/advanced graphs`;

const SOLUTION_PROMPT = `You are an expert programmer. Given this DSA problem, write the optimal solution body ONLY.

Return JSON:
{
  "java": "Just the method body code (NOT the class or method signature, ONLY the code inside the method). Use standard Java.",
  "javascript": "Just the function body code (NOT the function declaration, ONLY the code inside the function). Use standard JS."
}

IMPORTANT: Return ONLY the inner code, not the wrapping function/class. The platform adds those automatically.`;

export async function generateProblem(topic, difficulty) {
  console.log(`[Step 1] Generating problem for: ${topic} (${difficulty})`);
  
  const problem = await callGemini(
    `${PROBLEM_PROMPT}\n\nTopic: ${topic}\nDifficulty: ${difficulty}\n\nGenerate the problem now.`,
    { temperature: 0.8, maxOutputTokens: 8192 }
  );

  if (!problem.title || !problem.description || !problem.testCases || !problem.functionSignature) {
    throw new Error('Generated problem is missing required fields. Please try again.');
  }

  // Step 2: Generate optimal solution body
  console.log(`[Step 2] Generating solution for: ${problem.title}`);
  try {
    const sig = problem.functionSignature;
    const paramStr = sig.params.map(p => `${p.name} (${p.type})`).join(', ');
    const solutions = await callGemini(
      `${SOLUTION_PROMPT}\n\nProblem: ${problem.title}\n${problem.description}\n\nFunction: ${sig.name}(${paramStr}) -> ${sig.returnType}\n\nExample: ${JSON.stringify(problem.testCases[0])}`,
      { temperature: 0.3, maxOutputTokens: 4096 }
    );
    problem.optimalSolution = solutions;
  } catch (e) {
    console.error('Failed to generate solution (non-fatal):', e.message);
    problem.optimalSolution = { java: '// TODO', javascript: '// TODO' };
  }

  return problem;
}

export async function analyzeComplexity(code, language, problemTitle = '') {
  const prompt = `You are an expert algorithm analyst. Analyze the following ${language} code.

Code:
${code}

${problemTitle ? `Problem: ${problemTitle}` : ''}

Return JSON: {"timeComplexity":"O(...)","spaceComplexity":"O(...)","analysis":"explanation","canBeOptimized":bool,"suggestion":"better approach if any","suggestedTimeComplexity":"O(...)","suggestedSpaceComplexity":"O(...)"}`;

  return callGemini(prompt, { temperature: 0.3, maxOutputTokens: 4096 });
}

export async function generateDynamicHint(problem, code, language, hintLevel) {
  const prompt = `You are a helpful DSA tutor. Problem: ${problem.title} - ${problem.description}

Student's ${language} code: ${code || '(none yet)'}

Generate a level ${hintLevel} hint (1=concept, 2=approach, 3=pseudocode).
Return JSON: {"hint": "your hint text"}`;

  try {
    return await callGemini(prompt, { temperature: 0.5, maxOutputTokens: 2048 });
  } catch (e) {
    return { hint: 'Unable to generate hint. Please try again.' };
  }
}


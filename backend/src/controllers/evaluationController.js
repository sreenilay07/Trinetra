const { GoogleGenAI } = require('@google/genai');
const Question = require('../models/Question');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');

// @desc    Evaluate student's coding answer using AI
// @route   POST /api/exams/evaluate-code
// @access  Private/Student
const evaluateCode = asyncHandler(async (req, res) => {
  const { questionId, studentCode } = req.body;

  if (!questionId || !studentCode) {
    res.status(400);
    throw new Error('Question ID and student code are required');
  }

  const question = await Question.findById(questionId);

  if (!question || question.type !== 'coding') {
    res.status(404);
    throw new Error('Coding question not found');
  }

  const SystemSetting = require('../models/SystemSetting');
  let apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    const geminiSetting = await SystemSetting.findOne({ key: 'GEMINI_API_KEY' });
    if (geminiSetting && geminiSetting.value) {
      apiKey = geminiSetting.value;
    }
  }

  if (!apiKey) {
    logger.warn('GEMINI_API_KEY is not set. Returning mock evaluation.');
    return res.json({
      scoreObtained: 0,
      feedback: "AI Evaluation skipped: GEMINI_API_KEY not configured on server. Please add a valid Gemini API Key in the Authoring Engine settings.",
      testCasesPassed: 0,
      totalTestCases: question.testCases?.length || 0,
    });
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
You are an expert programming instructor evaluating a student's code.
Problem Statement:
${question.question}

Student's Code:
${studentCode}

Test Cases:
${JSON.stringify(question.testCases, null, 2)}

Max Marks: ${question.marks}

Evaluate the student's code against the problem statement and test cases. 
Consider correctness, edge cases, and basic efficiency.
Return your evaluation strictly as a valid JSON object (no markdown formatting around it) with these exact keys:
{
  "scoreObtained": (number, between 0 and Max Marks based on how well it solves the problem),
  "testCasesPassed": (number, how many test cases successfully pass),
  "feedback": (string, concise feedback on what they did right or wrong)
}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    let text = response.text || '';
    
    // Clean up potential markdown formatting from JSON
    if (text.startsWith('\`\`\`json')) {
      text = text.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    } else if (text.startsWith('\`\`\`')) {
      text = text.replace(/\`\`\`/g, '').trim();
    }

    const evaluation = JSON.parse(text);

    res.json({
      scoreObtained: evaluation.scoreObtained || 0,
      testCasesPassed: evaluation.testCasesPassed || 0,
      totalTestCases: question.testCases?.length || 0,
      feedback: evaluation.feedback || 'Evaluation complete.',
      maxMarks: question.marks
    });
  } catch (error) {
    logger.error('AI Evaluation failed:', error);
    res.status(500);
    throw new Error('Failed to evaluate code using AI.');
  }
});

module.exports = {
  evaluateCode
};

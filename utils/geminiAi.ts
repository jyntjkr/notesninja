import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize the Gemini API with your API key
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

// Safety settings
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

/**
 * Interface for test configuration
 */
export interface TestConfig {
  testTitle: string;
  testSubject: string;
  testDescription?: string;
  questions: Array<{
    type: string;
    quantity: number;
    difficulty: string;
  }>;
}

/**
 * Generates a test using Gemini AI based on the provided content and configuration
 * @param content - The content to generate the test from
 * @param config - The test configuration
 * @returns The generated test as a string
 */
export async function generateTest(content: string, config: TestConfig): Promise<string> {
  try {
    // If no API key is provided, throw an error
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }

    // Validate content
    if (!content || content.trim() === '') {
      throw new Error('Cannot generate test from empty content');
    }

    // Get the model
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
      safetySettings,
    });

    // Create a context for the questions
    const questionConfig = config.questions.map(q => 
      `${q.quantity} ${q.difficulty} ${q.type} questions`
    ).join(', ');

    // Limit content length to avoid exceeding API limits
    const maxContentLength = 30000;
    const trimmedContent = content.substring(0, maxContentLength);
    const contentTruncated = content.length > maxContentLength;

    // Create the prompt
    const prompt = `
    You are an expert educational test creator. Create a comprehensive test based on the following educational content:
    
    ${trimmedContent} ${contentTruncated ? '...(content truncated)' : ''}
    
    Test Title: ${config.testTitle}
    Subject: ${config.testSubject}
    ${config.testDescription ? `Description: ${config.testDescription}` : ''}
    
    Please include the following questions:
    ${questionConfig}
    
    Format the test professionally with clear sections, question numbering, and answer keys (where applicable).
    For multiple choice questions, include 4 options (A, B, C, D) with one correct answer.
    For short answer questions, provide expected answers.
    For long answer questions, provide evaluation criteria or key points that should be addressed.
    
    The output should be formatted in markdown for clean presentation.
    `;

    // Generate the content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    if (!text || text.trim() === '') {
      throw new Error('AI generated empty response');
    }
    
    return text;
  } catch (error) {
    console.error('Error generating test with Gemini:', error);
    throw new Error(error instanceof Error ? 
      `Failed to generate test: ${error.message}` : 
      'Failed to generate test with AI');
  }
} 
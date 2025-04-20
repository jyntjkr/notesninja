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

// Helper function to truncate content intelligently
function smartTruncate(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;
  
  // Find paragraph breaks to truncate at logical points
  const paragraphs = content.split(/\n\s*\n/);
  let result = '';
  
  for (const paragraph of paragraphs) {
    if ((result + paragraph).length > maxLength) {
      break;
    }
    result += paragraph + '\n\n';
  }
  
  return result.trim();
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

    // Get the model
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
      safetySettings,
      generationConfig: {
        temperature: 0.7, // Add some creativity but keep it reasonably focused
        topP: 0.9,
        maxOutputTokens: 8192, // Limit output size for better performance
      }
    });

    // Create a context for the questions
    const questionConfig = config.questions.map(q => 
      `${q.quantity} ${q.difficulty} ${q.type} questions`
    ).join(', ');
    
    // Intelligently truncate content
    const MAX_CONTENT_LENGTH = 15000; // Reduced from 30000 for better performance
    const truncatedContent = smartTruncate(content, MAX_CONTENT_LENGTH);
    
    if (content.length > MAX_CONTENT_LENGTH) {
      console.log(`Content was truncated from ${content.length} to ${truncatedContent.length} characters`);
    }

    // Create the prompt
    const prompt = `
    You are an expert educational test creator. Create a comprehensive test based on the following educational content:
    
    ${truncatedContent} ${content.length > MAX_CONTENT_LENGTH ? '...(content truncated for brevity)' : ''}
    
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

    // Generate the content with timeout
    const generateWithTimeout = async () => {
      const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('AI generation timed out after 3 minutes')), 180000); // 3 minute timeout
      });
      
      const generatePromise = model.generateContent(prompt);
      
      // Race between the generation and the timeout
      const result = await Promise.race([generatePromise, timeout]);
      const response = await result.response;
      return response.text();
    };
    
    return await generateWithTimeout();
  } catch (error) {
    console.error('Error generating test with Gemini:', error);
    throw new Error(`Failed to generate test with AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 
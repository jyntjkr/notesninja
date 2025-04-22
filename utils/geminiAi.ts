import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { generateTestPromptTemplate, formatTestContent } from './testTemplates';

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
 * Intelligently extracts the most important content from a large text
 * Focuses on keeping chapter beginnings, headings, and reducing redundancy
 */
function extractSmartSummary(content: string, maxLength: number): string {
  // If content is already under the limit, return it directly
  if (content.length <= maxLength) {
    return content;
  }
  
  // Split content into paragraphs
  const paragraphs = content.split('\n\n');
  
  // Identify headings and chapter starts (simple heuristic)
  const importantParagraphs = paragraphs.filter(p => {
    const trimmed = p.trim();
    // Keep headings, chapter indicators, and intro paragraphs
    return (
      /chapter|section|part \d+/i.test(trimmed) || 
      /^#+ /.test(trimmed) ||      // Markdown headings
      /introduction|overview|summary/i.test(trimmed)
    );
  });
  
  // If we have enough important paragraphs, use those
  if (importantParagraphs.join('\n\n').length >= maxLength / 2) {
    let result = '';
    for (const para of importantParagraphs) {
      if ((result + '\n\n' + para).length <= maxLength) {
        result += (result ? '\n\n' : '') + para;
      } else {
        break;
      }
    }
    return result;
  }
  
  // Take evenly distributed chunks from the content if we can't identify important sections
  const totalChunks = 5;
  const chunkSize = Math.floor(maxLength / totalChunks);
  let result = '';
  
  // Take beginning
  result += content.substring(0, chunkSize);
  
  // Take distributed samples
  for (let i = 1; i < totalChunks - 1; i++) {
    const startPos = Math.floor((content.length / totalChunks) * i);
    result += '\n\n[...]\n\n' + content.substring(startPos, startPos + chunkSize);
  }
  
  // Take end portion
  result += '\n\n[...]\n\n' + content.substring(content.length - chunkSize);
  
  return result;
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

    // Limit content length to avoid exceeding API limits and timeout
    // Use a smaller limit for better reliability with serverless functions
    const maxContentLength = 20000; // Reduced from 30000 to improve reliability
    
    // Use smart summary extraction instead of simple truncation
    const processedContent = extractSmartSummary(content, maxContentLength);
    const contentTruncated = content.length > maxContentLength;

    console.log(`Original content length: ${content.length}, Processed content length: ${processedContent.length}`);

    // Use the new template system to create a structured prompt
    const prompt = generateTestPromptTemplate(processedContent, config, contentTruncated);

    // Set timeout to prevent hanging serverless functions
    const timeoutMs = 25000; // 25 seconds max for AI processing
    const timeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error('AI generation timeout exceeded')), timeoutMs);
    });

    // Generate the content with timeout protection
    const generationPromise = model.generateContent(prompt)
      .then(result => result.response)
      .then(response => response.text());
    
    // Race against timeout
    let text = await Promise.race([generationPromise, timeoutPromise]);
    
    if (!text || text.trim() === '') {
      throw new Error('AI generated empty response');
    }
    
    // Post-process the generated content for consistent formatting
    text = formatTestContent(text);
    
    return text;
  } catch (error) {
    console.error('Error generating test with Gemini:', error);
    throw new Error(error instanceof Error ? 
      `Failed to generate test: ${error.message}` : 
      'Failed to generate test with AI');
  }
} 
/**
 * Test template utilities for consistently structured test generation
 */

import { TestConfig } from './geminiAi';

/**
 * Generates a standardized test prompt template for AI
 */
export function generateTestPromptTemplate(content: string, config: TestConfig, contentTruncated: boolean = false): string {
  // Create sections for question configuration
  const questionConfig = config.questions.map(q => 
    `${q.quantity} ${q.difficulty} ${q.type} questions`
  ).join(', ');

  return `
You are an expert educational test creator. Create a professionally structured test following this specific format:

# ${config.testTitle}
## Subject: ${config.testSubject}
${config.testDescription ? `**Description**: ${config.testDescription}` : ''}

---

## Instructions:
- Read all questions carefully before answering
- The test duration is 60 minutes
- Write all answers in the designated spaces
- Total points: ${getTotalPoints(config.questions)}

---

Based on the following educational content:

${content} ${contentTruncated ? '...(content summarized from a larger document)' : ''}

Create the following sections:

${generateSectionInstructions(config.questions)}

Format requirements:
1. Every section MUST have a clear heading (e.g., "## Section 1: Multiple Choice Questions")
2. All questions MUST be numbered sequentially within their sections
3. Multiple choice options MUST use letters (A, B, C, D) and be properly indented
4. Include a point value for each question in [brackets] at the end of the question
5. For MCQs, clearly mark the correct answer in the answer key section
6. For short answer questions, provide expected answers in the answer key section
7. For long answer questions, provide evaluation criteria or key points in the answer key section
8. Include a properly formatted answer key section at the end of the test with correct question numbers and answers

The output MUST be formatted in clean, consistent markdown with proper spacing between sections.
`;
}

/**
 * Generates the section instructions based on question types
 */
function generateSectionInstructions(questions: TestConfig['questions']): string {
  const sectionMap: Record<string, { quantity: number, difficulty: string[] }> = {
    'mcq': { quantity: 0, difficulty: [] },
    'short': { quantity: 0, difficulty: [] },
    'long': { quantity: 0, difficulty: [] },
    'true_false': { quantity: 0, difficulty: [] },
    'matching': { quantity: 0, difficulty: [] }
  };

  // Group questions by type
  questions.forEach(q => {
    if (sectionMap[q.type]) {
      sectionMap[q.type].quantity += q.quantity;
      if (!sectionMap[q.type].difficulty.includes(q.difficulty)) {
        sectionMap[q.type].difficulty.push(q.difficulty);
      }
    }
  });

  // Create instructions for each section
  let instructions = '';
  
  if (sectionMap.mcq.quantity > 0) {
    instructions += `## Section 1: Multiple Choice Questions (${sectionMap.mcq.quantity} questions, ${sectionMap.mcq.difficulty.join('/')} difficulty)\n`;
    instructions += `- Each question must have exactly 4 options (A, B, C, D)\n`;
    instructions += `- Each question is worth 1 point\n\n`;
  }
  
  if (sectionMap.true_false.quantity > 0) {
    instructions += `## Section 2: True/False Questions (${sectionMap.true_false.quantity} questions, ${sectionMap.true_false.difficulty.join('/')} difficulty)\n`;
    instructions += `- Indicate whether each statement is True or False\n`;
    instructions += `- Each question is worth 1 point\n\n`;
  }
  
  if (sectionMap.short.quantity > 0) {
    instructions += `## Section 3: Short Answer Questions (${sectionMap.short.quantity} questions, ${sectionMap.short.difficulty.join('/')} difficulty)\n`;
    instructions += `- Answer each question in 1-3 sentences\n`;
    instructions += `- Each question is worth 2 points\n\n`;
  }
  
  if (sectionMap.long.quantity > 0) {
    instructions += `## Section 4: Long Answer Questions (${sectionMap.long.quantity} questions, ${sectionMap.long.difficulty.join('/')} difficulty)\n`;
    instructions += `- Answer each question in a detailed paragraph\n`;
    instructions += `- Each question is worth 5 points\n\n`;
  }
  
  if (sectionMap.matching.quantity > 0) {
    instructions += `## Section 5: Matching Questions (${sectionMap.matching.quantity} questions, ${sectionMap.matching.difficulty.join('/')} difficulty)\n`;
    instructions += `- Match items from column A with their corresponding items in column B\n`;
    instructions += `- Each match is worth 1 point\n\n`;
  }
  
  instructions += `## Answer Key\n`;
  instructions += `- Include answers for all questions and evaluation criteria for long-form questions\n`;
  
  return instructions;
}

/**
 * Calculates total points for a test based on question types
 */
function getTotalPoints(questions: TestConfig['questions']): number {
  return questions.reduce((total, q) => {
    let pointValue = 1; // Default point value
    
    // Assign point values based on question type
    switch (q.type) {
      case 'mcq':
      case 'true_false':
      case 'matching':
        pointValue = 1;
        break;
      case 'short':
        pointValue = 2;
        break;
      case 'long':
        pointValue = 5;
        break;
    }
    
    return total + (q.quantity * pointValue);
  }, 0);
}

/**
 * Post-processes generated test content to enforce consistent formatting
 */
export function formatTestContent(content: string): string {
  // Ensure headers are properly formatted
  let formattedContent = content
    // Ensure section headers use ## format
    .replace(/^(Section \d+:)/gm, '## $1')
    // Ensure answer key has proper formatting
    .replace(/^(Answer Key)/gm, '## $1')
    // Ensure consistent question numbering
    .replace(/^(\d+\.\s)/gm, '$1 ');
  
  // Add proper spacing between sections
  formattedContent = formattedContent.replace(/^##\s/gm, '\n## ');
  
  // Add horizontal rule before the answer key
  if (formattedContent.includes('## Answer Key')) {
    formattedContent = formattedContent.replace(/## Answer Key/, '\n---\n\n## Answer Key');
  }
  
  return formattedContent;
} 
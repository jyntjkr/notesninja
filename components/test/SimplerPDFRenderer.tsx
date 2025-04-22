import React, { useState } from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';

// Define styles with standard fonts
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#fff',
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 25,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 5,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 12,
    marginBottom: 5,
    fontStyle: 'italic',
  },
  hr: {
    borderBottom: 1,
    borderBottomColor: '#e0e0e0',
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
    padding: 5,
  },
  paragraph: {
    fontSize: 11,
    marginBottom: 6,
    lineHeight: 1.5,
  },
  contentSection: {
    marginBottom: 15,
  },
  questionContainer: {
    marginBottom: 10,
  },
  questionText: {
    fontSize: 11,
    marginBottom: 3,
  },
  optionRow: {
    flexDirection: 'row',
    marginBottom: 4,
    marginLeft: 20,
    padding: 2,
  },
  optionLetter: {
    fontSize: 11,
    width: 20,
    fontWeight: 'bold',
  },
  optionText: {
    fontSize: 11,
    flex: 1,
  },
  matchingContainer: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  matchingLeft: {
    fontSize: 11, 
    width: '45%',
  },
  matchingCenter: {
    width: '10%',
    alignItems: 'center',
  },
  matchingBox: {
    width: 15,
    height: 15,
    borderWidth: 1,
    borderColor: '#000',
  },
  matchingRight: {
    fontSize: 11,
    width: '45%',
  },
  trueFalseContainer: {
    flexDirection: 'row',
    marginLeft: 20,
    marginTop: 5,
    marginBottom: 10,
  },
  trueFalseOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 30,
  },
  checkbox: {
    width: 12,
    height: 12,
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 12,
    marginRight: 5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 10,
    color: '#666',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    right: 40,
    fontSize: 10,
    color: '#666',
  },
});

// Improved function to clean up markdown content
const cleanupMarkdown = (content: string): string => {
  // More thorough markdown cleaning
  return content
    // Remove headers
    .replace(/#{1,6}\s+/g, '')
    // Remove bold - handles ** patterns globally
    .replace(/\*\*(.*?)\*\*/g, '$1')
    // Remove italic - handles * patterns globally  
    .replace(/\*([^*]+)\*/g, '$1')
    // Remove underscores for emphasis
    .replace(/__(.*?)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove links, keep text
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    // Remove code blocks with language specification
    .replace(/```[\w]*\n[\s\S]*?\n```/g, '')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove point indicators
    .replace(/\[(\d+)\s*(?:points?|pts?)\]/gi, '')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Convert list items
    .replace(/^\s*[-*•+]\s*/gm, '• ')
    // Fix any remaining asterisks that weren't part of formatting
    .replace(/\*/g, '')
    // Fix any remaining underscores that weren't part of formatting
    .replace(/_/g, '')
    // Clean up extra spaces and empty lines
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n');
};

// Improved function to extract content sections for consistent rendering
const processContent = (content: string): string[] => {
  // Make sure we only look at the question content, not metadata
  const mainContent = content
    // Remove title at the beginning
    .replace(/^#\s+[^\n]+/, '')
    // Remove subject line
    .replace(/^##\s+Subject:[^\n]+/m, '')
    // Remove instructions section
    .replace(/^##\s+Instructions:[\s\S]*?(?=##|$)/m, '');
  
  // Find all section headings (##)
  const sectionHeadings = mainContent.match(/##\s+[^\n]+/g) || [];
  
  // Split content into sections
  const sections = [];
  for (let i = 0; i < sectionHeadings.length; i++) {
    const currentHeading = sectionHeadings[i];
    const nextHeading = sectionHeadings[i + 1];
    
    const startIdx = mainContent.indexOf(currentHeading);
    const endIdx = nextHeading ? mainContent.indexOf(nextHeading) : mainContent.length;
    
    if (startIdx !== -1) {
      const sectionContent = mainContent.substring(startIdx, endIdx).trim();
      sections.push(sectionContent);
    }
  }
  
  return sections;
};

// Improved section title extraction
const extractCleanSectionTitle = (title: string): string => {
  // Remove markdown header symbols
  let cleanTitle = title.replace(/^##\s+/, '');
  
  // Remove section numbers
  cleanTitle = cleanTitle.replace(/^Section \d+:\s*/i, '');
  
  // Remove anything in parentheses, including difficulty level
  cleanTitle = cleanTitle.replace(/\s*\(.*?\)\s*/g, '');
  
  return cleanTitle;
};

// Process matching questions just as plain text with bold headers
const processMatching = (content: string) => {
  // First clean the content but preserve newlines
  const cleaned = content
    // Remove headers
    .replace(/#{1,6}\s+/g, '')
    // Remove bold - handles ** patterns globally
    .replace(/\*\*(.*?)\*\*/g, '$1')
    // Remove italic - handles * patterns globally  
    .replace(/\*([^*]+)\*/g, '$1')
    // Remove underscores for emphasis
    .replace(/__(.*?)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove links, keep text
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    // Remove code blocks with language specification
    .replace(/```[\w]*\n[\s\S]*?\n```/g, '')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove point indicators
    .replace(/\[(\d+)\s*(?:points?|pts?)\]/gi, '')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Convert list items
    .replace(/^\s*[-*•+]\s*/gm, '• ')
    // Fix any remaining asterisks that weren't part of formatting
    .replace(/\*/g, '')
    // Fix any remaining underscores that weren't part of formatting
    .replace(/_/g, '');
  
  // Look for Column A: or Column B: patterns and wrap them in custom tags for later styling
  const formatted = cleaned
    .replace(/\b(Column\s+A):?/gi, '**$1:**')
    .replace(/\b(Column\s+B):?/gi, '**$1:**');
  
  return formatted;
};

// Enhanced function to process multiple choice questions with better option detection
const processMultipleChoice = (content: string) => {
  // First extract the section title if present
  let sectionIntro = '';
  const introMatch = content.match(/^(.*?)(?=\n\d+\.)/);
  if (introMatch && introMatch[1]) {
    sectionIntro = cleanupMarkdown(introMatch[1].trim());
  }

  // Find all numbered questions with their content
  const questionPattern = /\n(\d+)\.\s+([\s\S]+?)(?=\n\d+\.|\n$|$)/g;
  const questions: { number: string; content: string }[] = [];
  let match;
  
  // Clone content to avoid regex lastIndex issues
  const contentCopy = content.slice();
  
  while ((match = questionPattern.exec(contentCopy)) !== null) {
    const questionNumber = match[1];
    const questionContent = match[2].trim();
    
    // Skip if the content seems like just a section title
    if (questionContent.length < 3) continue;
    
    questions.push({
      number: questionNumber,
      content: questionContent
    });
  }
  
  return questions.map(q => {
    const { number, content } = q;
    
    // Extract question text and options
    let questionText = content;
    let options: { letter: string; text: string }[] = [];
    
    // Improved pattern that only matches options at the start of a line or after a line break
    // This prevents matching words that start with A-D in the middle of sentences
    const optionPattern = /(?:^|\n)\s*([A-D])(?:\)|\.|:)\s+([^\n]+)/g;
    let optionMatch;
    const foundOptions: { letter: string; text: string }[] = [];
    
    // Clone question text for pattern testing to avoid regex lastIndex issues
    const questionCopy = content.slice();
    
    while ((optionMatch = optionPattern.exec(questionCopy)) !== null) {
      foundOptions.push({
        letter: optionMatch[1].trim() + '.',
        text: cleanupMarkdown(optionMatch[2].trim())
      });
    }
    
    // If we didn't find options with the first pattern, try an alternate pattern
    if (foundOptions.length === 0) {
      const alternatePattern = /(?:^|\n)\s*([A-D])[\s:.)-]+([^\n]+)/g;
      while ((optionMatch = alternatePattern.exec(questionCopy)) !== null) {
        foundOptions.push({
          letter: optionMatch[1].trim() + '.',
          text: cleanupMarkdown(optionMatch[2].trim())
        });
      }
    }
    
    if (foundOptions.length > 0) {
      // If we found options, extract question text (everything before first option)
      const firstOptionIndex = content.search(/(?:^|\n)\s*[A-D](?:\)|\.|:)[\s]+/);
      if (firstOptionIndex > -1) {
        questionText = cleanupMarkdown(content.substring(0, firstOptionIndex).trim());
      } else {
        questionText = cleanupMarkdown(content);
      }
      options = foundOptions;
    } else {
      // Fallback method - just use the whole cleaned question
      questionText = cleanupMarkdown(content);
      
      // Create placeholder options if needed
      if (questionText.length > 0) {
        options = [
          { letter: 'A.', text: '' },
          { letter: 'B.', text: '' },
          { letter: 'C.', text: '' },
          { letter: 'D.', text: '' }
        ];
      }
    }
    
    return { 
      questionText, 
      options, 
      questionNumber: number 
    };
  });
};

// Process true/false questions
const processTrueFalse = (content: string) => {
  // Split content by numbered questions
  const questionRegex = /\n\d+\.\s+/;
  const questions = content.split(questionRegex).filter((q, i) => i > 0 || !q.includes('True/False'));
  
  // Extract original question numbers
  const questionNumbers: string[] = [];
  const numberMatches = content.match(/\n(\d+)\.\s+/g) || [];
  numberMatches.forEach(match => {
    const num = match.match(/\n(\d+)\.\s+/)?.[1];
    if (num) questionNumbers.push(num);
  });
  
  return questions.map((question, index) => {
    const cleanQuestion = cleanupMarkdown(question);
    // Use the original question number if available
    const questionNumber = questionNumbers[index] || (index + 1).toString();
    return { text: cleanQuestion, questionNumber };
  });
};

// Main PDF component
interface SimpleTestPDFProps {
  title: string;
  description: string;
  content: string;
}

const SimpleTestPDF: React.FC<SimpleTestPDFProps> = ({ title, description, content }) => {
  // Process content to match preview display
  const processedSections = processContent(content);
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {description && <Text style={styles.description}>{description}</Text>}
        </View>
        
        <View style={styles.hr} />
        
        {/* Content Sections */}
        {processedSections.map((section, index) => {
          const lines = section.split('\n');
          const rawSectionTitle = lines[0].replace(/^##\s+/, '');
          const sectionTitle = extractCleanSectionTitle(rawSectionTitle);
          const sectionContent = lines.slice(1).join('\n');
          
          // Determine section type for special handling
          const sectionType = 
            /multiple choice/i.test(rawSectionTitle) ? 'mcq' :
            /matching/i.test(rawSectionTitle) ? 'matching' : 
            /true.*false/i.test(rawSectionTitle) ? 'true_false' :
            'standard';
          
          return (
            <View key={index} style={styles.contentSection}>
              <Text style={styles.sectionTitle}>{sectionTitle}</Text>
              
              {sectionType === 'mcq' && (
                <>
                  {processMultipleChoice(sectionContent).map((q, i) => (
                    <View key={i} style={styles.questionContainer}>
                      <Text style={styles.questionText}>{q.questionNumber}. {q.questionText}</Text>
                      {q.options.map((option, j) => (
                        <View key={j} style={styles.optionRow}>
                          <Text style={styles.optionLetter}>{option.letter}</Text>
                          <Text style={styles.optionText}>{option.text}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </>
              )}
              
              {sectionType === 'true_false' && (
                <>
                  {processTrueFalse(sectionContent).map((q, i) => (
                    <View key={i} style={styles.questionContainer}>
                      <Text style={styles.questionText}>{q.questionNumber}. {q.text}</Text>
                      <View style={styles.trueFalseContainer}>
                        <View style={styles.trueFalseOption}>
                          <View style={styles.checkbox}></View>
                          <Text style={{ fontSize: 11 }}>True</Text>
                        </View>
                        <View style={styles.trueFalseOption}>
                          <View style={styles.checkbox}></View>
                          <Text style={{ fontSize: 11 }}>False</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </>
              )}
              
              {sectionType === 'matching' && (
                <Text style={styles.paragraph}>
                  {processMatching(sectionContent).split('**').map((part, i) => {
                    // Odd indices (1, 3, 5...) are the parts to be bolded
                    const isBold = i % 2 === 1;
                    return isBold ? 
                      <Text key={i} style={{ fontWeight: 'bold' }}>{part}</Text> : 
                      <Text key={i}>{part}</Text>;
                  })}
                </Text>
              )}
              
              {sectionType === 'standard' && (
                <Text style={styles.paragraph}>{cleanupMarkdown(sectionContent)}</Text>
              )}
            </View>
          );
        })}
        
        {/* Footer */}
        <Text style={styles.footer}>Generated with NotesNinja</Text>
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
          `${pageNumber} / ${totalPages}`
        )} fixed />
      </Page>
    </Document>
  );
};

// Function to download the PDF
export const downloadSimplePDF = async (
  title: string, 
  description: string, 
  content: string, 
  fileName: string
): Promise<boolean> => {
  try {
    // Generate the PDF document
    const blob = await pdf(
      <SimpleTestPDF 
        title={title} 
        description={description} 
        content={content} 
      />
    ).toBlob();
    
    // Create a URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Create a link element and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'test.pdf';
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
};

// Button component
interface SimplePDFDownloadProps {
  title: string;
  description?: string;
  content: string;
  fileName: string;
  children: React.ReactNode;
  onStart?: () => void;
  onComplete?: (success: boolean) => void;
}

export const SimplerPDFDownloadButton: React.FC<SimplePDFDownloadProps> = ({
  title,
  description = '',
  content,
  fileName,
  children,
  onStart,
  onComplete
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  
  const handleClick = async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    if (onStart) onStart();
    
    try {
      const success = await downloadSimplePDF(title, description, content, fileName);
      if (onComplete) onComplete(success);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      if (onComplete) onComplete(false);
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <div onClick={handleClick}>
      {children}
    </div>
  );
};

export default SimpleTestPDF; 
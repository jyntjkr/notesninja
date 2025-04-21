import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, pdf } from '@react-pdf/renderer';
import { marked } from 'marked';

// Register fonts
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/roboto/v20/KFOmCnqEu92Fr1Mu4mxP.ttf', fontWeight: 'normal' },
    { src: 'https://fonts.gstatic.com/s/roboto/v20/KFOlCnqEu92Fr1MmWUlfBBc9.ttf', fontWeight: 'bold' },
    { src: 'https://fonts.gstatic.com/s/roboto/v20/KFOkCnqEu92Fr1MmYUtfBBc9.ttf', fontWeight: 700 },
    { src: 'https://fonts.gstatic.com/s/roboto/v20/KFOlCnqEu92Fr1MmSU5fBBc9.ttf', fontStyle: 'normal' },
    { src: 'https://fonts.gstatic.com/s/roboto/v20/KFOkCnqEu92Fr1Mu51xIIzI.ttf', fontStyle: 'italic' },
  ],
});

// Define styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#fff',
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    fontSize: 12,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  contentContainer: {
    marginBottom: 10,
  },
  // Section styles
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
    backgroundColor: '#f5f5f5',
    padding: 5,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  // Question styles
  questionItem: {
    marginBottom: 10,
  },
  questionText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  optionText: {
    fontSize: 11,
    marginLeft: 15,
    marginBottom: 3,
  },
  // Text styles
  paragraph: {
    fontSize: 11,
    marginBottom: 6,
    lineHeight: 1.5,
  },
  bold: {
    fontWeight: 'bold',
  },
  italic: {
    fontStyle: 'italic',
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
});

// Use Unicode escape sequences for all special characters
const entities: { [key: string]: string } = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&copy;': '\u00A9', // Copyright symbol
  '&reg;': '\u00AE',  // Registered trademark
  '&deg;': '\u00B0',  // Degree symbol
  '&hellip;': '\u2026', // Horizontal ellipsis
  '&middot;': '\u00B7', // Middle dot
  '&bull;': '\u2022',   // Bullet
  '&ndash;': '\u2013',  // En dash
  '&mdash;': '\u2014',  // Em dash
  '&lsquo;': '\u2018',  // Left single quotation mark
  '&rsquo;': '\u2019',  // Right single quotation mark
  '&ldquo;': '\u201C',  // Left double quotation mark
  '&rdquo;': '\u201D',  // Right double quotation mark
};

// Add a robust HTML entity decoder function that works in all environments
const decodeHTMLEntities = (text: string): string => {
  if (!text) return '';
  
  // Replace known entities
  let decoded = text;
  Object.keys(entities).forEach(entity => {
    const regex = new RegExp(entity, 'g');
    decoded = decoded.replace(regex, entities[entity]);
  });
  
  // Handle numeric entities (like &#39;)
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
    return String.fromCharCode(parseInt(dec, 10));
  });
  
  // Handle hex entities (like &#x27;)
  decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  
  // Fallback to browser API if available and if still contains entities
  if (typeof document !== 'undefined' && decoded.includes('&')) {
    try {
      const textarea = document.createElement('textarea');
      textarea.innerHTML = decoded;
      return textarea.value;
    } catch (e) {
      console.warn('Browser HTML entity decoding failed, using partial result', e);
    }
  }
  
  return decoded;
};

// Update the removeHtmlTags function to also decode HTML entities
const removeHtmlTags = (str: string): string => {
  // First remove HTML tags
  const withoutTags = str.replace(/<\/?[^>]+(>|$)/g, '');
  // Then decode HTML entities
  return decodeHTMLEntities(withoutTags);
};

// Add proper TypeScript type annotations
interface Section {
  type: string;
  title: string;
  items: Array<{
    type: string;
    text: string;
    options?: Array<{ type: string; text: string }>;
    answer?: { type: string; text: string };
  }>;
}

// Update the parseMarkdown function to ensure all content is properly decoded
const parseMarkdown = (markdownText: string): Section[] => {
  // Use marked to get HTML from markdown with explicit options
  // Force synchronous mode by providing empty options object
  const html = marked.parse(markdownText, {}) as string;
  
  // Convert HTML structure to a more processable array of objects
  const sections: Section[] = [];
  let currentSection: Section | null = null;
  
  // Split the content by lines for easier parsing
  const lines = html.split('\n');
  
  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Header detection (section titles)
    if (line.startsWith('<h1>') || line.startsWith('<h2>')) {
      if (currentSection) {
        sections.push(currentSection);
      }
      
      const title = removeHtmlTags(line);
      currentSection = {
        type: 'section',
        title,
        items: []
      };
    }
    // Detect questions (we'll consider numbered lists or paragraphs with question-like content)
    else if (line.includes('<li>') || (line.includes('<p>') && (
        /^\d+\./.test(removeHtmlTags(line)) || 
        removeHtmlTags(line).startsWith('Question') ||
        removeHtmlTags(line).toLowerCase().includes('answer')
      ))) {
      
      const text = removeHtmlTags(line);
      
      // Skip if we don't have a current section
      if (!currentSection) {
        currentSection = {
          type: 'section',
          title: 'Questions',
          items: []
        };
      }
      
      // Question or option detection logic
      if (/^[A-D]\./.test(text) || /^[a-d]\)/.test(text)) {
        // This is an option for a multiple choice question
        if (currentSection.items.length > 0) {
          const lastItem = currentSection.items[currentSection.items.length - 1];
          if (!lastItem.options) {
            lastItem.options = [];
          }
          lastItem.options.push({
            type: 'option',
            text
          });
        }
      } 
      else if (text.toLowerCase().includes('answer:')) {
        // This is an answer hint
        if (currentSection.items.length > 0) {
          const lastItem = currentSection.items[currentSection.items.length - 1];
          lastItem.answer = {
            type: 'answer',
            text
          };
        }
      } 
      else {
        // This is a question
        currentSection.items.push({
          type: 'question',
          text
        });
      }
    } 
    // Paragraph text
    else if (line.includes('<p>')) {
      if (!currentSection) {
        currentSection = {
          type: 'section',
          title: 'Introduction',
          items: []
        };
      }
      
      currentSection.items.push({
        type: 'paragraph',
        text: removeHtmlTags(line)
      });
    }
  }
  
  // Add the last section if it exists
  if (currentSection) {
    sections.push(currentSection);
  }
  
  return sections;
};

// Fix type issues in the FormattedTestPDF component
interface TestPDFProps {
  title: string;
  description: string;
  content: string;
}

const FormattedTestPDF: React.FC<TestPDFProps> = ({ title, description, content }) => {
  // Pre-process the content to fix any encoding issues directly in the source
  const cleanContent = content.replace(/&#39;/g, "'")
                            .replace(/&quot;/g, '"')
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>')
                            .replace(/&amp;/g, '&');
  
  // Parse markdown content into structured sections
  const sections = parseMarkdown(cleanContent);
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {description && <Text style={styles.description}>{description}</Text>}
        </View>
        
        {sections.length > 0 ? (
          sections.map((section, sIndex) => (
            <View key={`section-${sIndex}`} style={styles.contentContainer}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              
              {section.items.map((item, iIndex) => {
                if (item.type === 'question') {
                  return (
                    <View key={`question-${sIndex}-${iIndex}`} style={styles.questionItem}>
                      <Text style={styles.questionText}>{item.text}</Text>
                      
                      {item.options && item.options.map((option, oIndex) => (
                        <Text key={`option-${oIndex}`} style={styles.optionText}>
                          {option.text}
                        </Text>
                      ))}
                      
                      {item.answer && (
                        <Text style={[styles.optionText, styles.italic]}>
                          {item.answer.text}
                        </Text>
                      )}
                    </View>
                  );
                } else if (item.type === 'paragraph') {
                  return (
                    <Text key={`para-${sIndex}-${iIndex}`} style={styles.paragraph}>
                      {item.text}
                    </Text>
                  );
                }
                return null;
              })}
            </View>
          ))
        ) : (
          // Fallback for unparsed content - split by lines
          <View style={styles.contentContainer}>
            {cleanContent.split('\n').map((line, i) => (
              <Text key={i} style={styles.paragraph}>
                {decodeHTMLEntities(line) || ' '}
              </Text>
            ))}
          </View>
        )}
        
        <View style={styles.footer}>
          <Text>{title} | Generated with NoteNinja</Text>
        </View>
      </Page>
    </Document>
  );
};

// Browser-safe download function that creates and downloads the PDF
export const downloadPDF = async (
  title: string, 
  description: string, 
  content: string, 
  fileName: string
): Promise<boolean> => {
  try {
    // Ensure title and description are also decoded
    const decodedTitle = decodeHTMLEntities(title);
    const decodedDescription = description ? decodeHTMLEntities(description) : '';
    
    // Create the PDF document
    const pdfDoc = <FormattedTestPDF 
      title={decodedTitle} 
      description={decodedDescription} 
      content={content} 
    />;
    
    // Generate a blob from the PDF
    const blob = await pdf(pdfDoc).toBlob();
    
    // Create a URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Create a link and click it to download
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
};

// Simple PDF Download Button component
interface SimplePDFDownloadProps {
  title: string;
  description?: string;
  content: string;
  fileName: string;
  children: React.ReactNode;
  onStart?: () => void;
  onComplete?: (success: boolean) => void;
}

export const SimplePDFDownloadButton: React.FC<SimplePDFDownloadProps> = ({
  title,
  description = '',
  content,
  fileName,
  children,
  onStart,
  onComplete
}) => {
  const [isGenerating, setIsGenerating] = React.useState(false);
  
  const handleClick = async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    if (onStart) onStart();
    
    try {
      // Set a timeout to ensure UI responsiveness
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error('PDF generation timeout')), 30000); // 30-second timeout
      });
      
      // Race between the actual PDF generation and the timeout
      const success = await Promise.race([
        downloadPDF(title, description, content, fileName),
        timeoutPromise
      ]);
      
      setIsGenerating(false);
      if (onComplete) onComplete(success);
    } catch (error) {
      console.error('Error in PDF generation:', error);
      setIsGenerating(false);
      if (onComplete) onComplete(false);
    }
  };
  
  return (
    <button 
      onClick={handleClick} 
      disabled={isGenerating}
      style={{ border: 'none', background: 'none', padding: 0, cursor: isGenerating ? 'default' : 'pointer' }}
    >
      {children}
    </button>
  );
};

export default SimplePDFDownloadButton; 
import React, { useState } from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { marked } from 'marked';

// Define styles with default fonts that come with react-pdf
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
  instructionsHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  instructionsList: {
    marginBottom: 10,
  },
  instructionItem: {
    fontSize: 11,
    marginBottom: 3,
    flexDirection: 'row',
  },
  bullet: {
    width: 10,
    fontSize: 11,
  },
  instructionText: {
    fontSize: 11,
    flex: 1,
  },
  contentContainer: {
    marginBottom: 10,
  },
  // Section styles
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 4,
  },
  sectionDescription: {
    fontSize: 11,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  // Question styles
  questionContainer: {
    marginBottom: 15,
  },
  questionHeader: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  questionNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 5,
    width: 20,
  },
  questionText: {
    fontSize: 12,
    flex: 1,
  },
  questionPoints: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#666',
    marginLeft: 5,
  },
  optionsContainer: {
    marginLeft: 25,
    marginTop: 3,
  },
  optionItem: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  optionLetter: {
    fontSize: 11,
    width: 15,
  },
  optionText: {
    fontSize: 11,
    flex: 1,
  },
  // Answer key styles
  answerKeyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    backgroundColor: '#f0f7ff',
    padding: 8,
    borderRadius: 4,
  },
  answerItem: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  answerNumber: {
    fontSize: 11,
    fontWeight: 'bold',
    width: 20,
  },
  answerText: {
    fontSize: 11,
    flex: 1,
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
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    right: 40,
    fontSize: 10,
    color: '#666',
  },
});

// Helper functions for processing markdown and content
const parseMarkdownToSections = (markdown: string) => {
  // Split the markdown by sections (## headers)
  const sections = markdown.split(/\n##\s+/).filter(Boolean);
  
  // The first section contains the title and description
  const headerInfo = sections[0];
  
  // Process the rest as content sections
  const contentSections = sections.slice(1);
  
  return {
    headerInfo,
    contentSections
  };
};

// Process a section of content into structured data
const processSectionContent = (section: string) => {
  const lines = section.split('\n');
  const sectionTitle = lines[0].trim();
  
  // Determine the section type
  let sectionType = 'generic';
  if (sectionTitle.toLowerCase().includes('multiple choice')) {
    sectionType = 'mcq';
  } else if (sectionTitle.toLowerCase().includes('short answer')) {
    sectionType = 'short';
  } else if (sectionTitle.toLowerCase().includes('long answer')) {
    sectionType = 'long';
  } else if (sectionTitle.toLowerCase().includes('true/false')) {
    sectionType = 'true_false';
  } else if (sectionTitle.toLowerCase().includes('matching')) {
    sectionType = 'matching';
  } else if (sectionTitle.toLowerCase().includes('answer key')) {
    sectionType = 'answer_key';
  }
  
  // Extract questions from the section
  const content = lines.slice(1).join('\n').trim();
  
  return {
    sectionTitle,
    sectionType,
    content
  };
};

// Render a section based on its type
const renderSection = (section: { sectionTitle: string, sectionType: string, content: string }) => {
  switch (section.sectionType) {
    case 'mcq':
      return <MultipleChoiceSection title={section.sectionTitle} content={section.content} />;
    case 'short':
      return <ShortAnswerSection title={section.sectionTitle} content={section.content} />;
    case 'long':
      return <LongAnswerSection title={section.sectionTitle} content={section.content} />;
    case 'true_false':
      return <TrueFalseSection title={section.sectionTitle} content={section.content} />;
    case 'matching':
      return <MatchingSection title={section.sectionTitle} content={section.content} />;
    case 'answer_key':
      return <AnswerKeySection title={section.sectionTitle} content={section.content} />;
    default:
      return <GenericSection title={section.sectionTitle} content={section.content} />;
  }
};

// Components for each section type
const MultipleChoiceSection = ({ title, content }: { title: string, content: string }) => {
  // Extract questions and options using regex
  const questions = content.split(/\n\d+\.\s+/).filter(Boolean);
  
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionDescription}>Select the best answer for each question.</Text>
      
      {questions.map((question, i) => {
        // Split into question text and options
        const parts = question.split(/\n\s*[A-D]\)\s+/);
        const questionText = parts[0].trim();
        
        // Extract options
        const optionsMatches = question.match(/[A-D]\)\s+[^\n]+/g) || [];
        const options = optionsMatches.map(opt => {
          const letter = opt.match(/^[A-D]\)/)?.[0] || '';
          const text = opt.replace(/^[A-D]\)\s+/, '').trim();
          return { letter, text };
        });
        
        // Extract points value
        const pointsMatch = questionText.match(/\[(\d+)\s*points?\]/i);
        const points = pointsMatch ? pointsMatch[1] : '1';
        const cleanQuestion = questionText.replace(/\[\d+\s*points?\]/i, '').trim();
        
        return (
          <View key={i} style={styles.questionContainer}>
            <View style={styles.questionHeader}>
              <Text style={styles.questionNumber}>{i + 1}.</Text>
              <Text style={styles.questionText}>{cleanQuestion}</Text>
              <Text style={styles.questionPoints}>[{points} pt{points !== '1' ? 's' : ''}]</Text>
            </View>
            
            <View style={styles.optionsContainer}>
              {options.map((option, j) => (
                <View key={j} style={styles.optionItem}>
                  <Text style={styles.optionLetter}>{option.letter}</Text>
                  <Text style={styles.optionText}>{option.text}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const ShortAnswerSection = ({ title, content }: { title: string, content: string }) => {
  const questions = content.split(/\n\d+\.\s+/).filter(Boolean);
  
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionDescription}>Answer each question in 1-3 sentences.</Text>
      
      {questions.map((question, i) => {
        // Extract points value
        const pointsMatch = question.match(/\[(\d+)\s*points?\]/i);
        const points = pointsMatch ? pointsMatch[1] : '2';
        const cleanQuestion = question.replace(/\[\d+\s*points?\]/i, '').trim();
        
        return (
          <View key={i} style={styles.questionContainer}>
            <View style={styles.questionHeader}>
              <Text style={styles.questionNumber}>{i + 1}.</Text>
              <Text style={styles.questionText}>{cleanQuestion}</Text>
              <Text style={styles.questionPoints}>[{points} pt{points !== '1' ? 's' : ''}]</Text>
            </View>
            
            {/* Lines for answer */}
            <View style={{ marginLeft: 25, marginTop: 5 }}>
              <View style={{ borderBottomWidth: 1, borderBottomColor: '#ddd', marginBottom: 8, height: 20 }}></View>
              <View style={{ borderBottomWidth: 1, borderBottomColor: '#ddd', marginBottom: 8, height: 20 }}></View>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const LongAnswerSection = ({ title, content }: { title: string, content: string }) => {
  const questions = content.split(/\n\d+\.\s+/).filter(Boolean);
  
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionDescription}>Provide detailed answers with well-developed arguments.</Text>
      
      {questions.map((question, i) => {
        // Extract points value
        const pointsMatch = question.match(/\[(\d+)\s*points?\]/i);
        const points = pointsMatch ? pointsMatch[1] : '5';
        const cleanQuestion = question.replace(/\[\d+\s*points?\]/i, '').trim();
        
        return (
          <View key={i} style={styles.questionContainer}>
            <View style={styles.questionHeader}>
              <Text style={styles.questionNumber}>{i + 1}.</Text>
              <Text style={styles.questionText}>{cleanQuestion}</Text>
              <Text style={styles.questionPoints}>[{points} pt{points !== '1' ? 's' : ''}]</Text>
            </View>
            
            {/* Box for answer */}
            <View style={{ marginLeft: 25, marginTop: 5, borderWidth: 1, borderColor: '#ddd', height: 100, borderRadius: 4 }}></View>
          </View>
        );
      })}
    </View>
  );
};

const TrueFalseSection = ({ title, content }: { title: string, content: string }) => {
  const questions = content.split(/\n\d+\.\s+/).filter(Boolean);
  
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionDescription}>Indicate whether each statement is True or False.</Text>
      
      {questions.map((question, i) => {
        // Extract points value
        const pointsMatch = question.match(/\[(\d+)\s*points?\]/i);
        const points = pointsMatch ? pointsMatch[1] : '1';
        const cleanQuestion = question.replace(/\[\d+\s*points?\]/i, '').trim();
        
        return (
          <View key={i} style={styles.questionContainer}>
            <View style={styles.questionHeader}>
              <Text style={styles.questionNumber}>{i + 1}.</Text>
              <Text style={styles.questionText}>{cleanQuestion}</Text>
              <Text style={styles.questionPoints}>[{points} pt{points !== '1' ? 's' : ''}]</Text>
            </View>
            
            {/* True/False options */}
            <View style={{ marginLeft: 25, marginTop: 5, flexDirection: 'row', gap: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 12, height: 12, borderWidth: 1, borderColor: '#000', borderRadius: 12, marginRight: 5 }}></View>
                <Text style={{ fontSize: 11 }}>True</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 12, height: 12, borderWidth: 1, borderColor: '#000', borderRadius: 12, marginRight: 5 }}></View>
                <Text style={{ fontSize: 11 }}>False</Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const MatchingSection = ({ title, content }: { title: string, content: string }) => {
  // For matching, we need to handle columns
  const lines = content.split('\n').filter(Boolean);
  const items = lines.filter(line => /^\d+\./.test(line));
  
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionDescription}>Match items from column A with the appropriate items in column B.</Text>
      
      <View style={{ flexDirection: 'row', marginTop: 10, marginBottom: 5 }}>
        <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: '#000', paddingBottom: 5 }}>
          <Text style={{ fontSize: 12, fontWeight: 'bold' }}>Column A</Text>
        </View>
        <View style={{ width: 50 }}></View>
        <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: '#000', paddingBottom: 5 }}>
          <Text style={{ fontSize: 12, fontWeight: 'bold' }}>Column B</Text>
        </View>
      </View>
      
      {items.map((item, i) => {
        const number = item.match(/^\d+\./)?.[0] || `${i+1}.`;
        const text = item.replace(/^\d+\.\s+/, '').trim();
        
        return (
          <View key={i} style={{ flexDirection: 'row', marginBottom: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11 }}>{number} {text}</Text>
            </View>
            <View style={{ width: 50, alignItems: 'center' }}>
              <View style={{ width: 20, height: 20, borderWidth: 1, borderColor: '#000' }}></View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11 }}>{String.fromCharCode(65 + i)}. [Matching item]</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const AnswerKeySection = ({ title, content }: { title: string, content: string }) => {
  const answers = content.split(/\n\d+\.\s+/).filter(Boolean);
  
  return (
    <View>
      <Text style={styles.answerKeyTitle}>{title}</Text>
      
      {answers.map((answer, i) => (
        <View key={i} style={styles.answerItem}>
          <Text style={styles.answerNumber}>{i + 1}.</Text>
          <Text style={styles.answerText}>{answer.trim()}</Text>
        </View>
      ))}
    </View>
  );
};

const GenericSection = ({ title, content }: { title: string, content: string }) => {
  const paragraphs = content.split('\n\n').filter(Boolean);
  
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      
      {paragraphs.map((paragraph, i) => (
        <Text key={i} style={styles.paragraph}>{paragraph.trim()}</Text>
      ))}
    </View>
  );
};

// The main PDF test content component
interface TestPDFProps {
  title: string;
  description: string;
  content: string;
}

const EnhancedTestPDF: React.FC<TestPDFProps> = ({ title, description, content }) => {
  // Process the markdown content into sections
  const { headerInfo, contentSections } = parseMarkdownToSections(content);
  
  // Process each content section
  const processedSections = contentSections.map(section => processSectionContent(section));
  
  // Extract instructions from the header if present
  const instructionsMatch = headerInfo.match(/## Instructions:([\s\S]*?)(?=\n##|$)/);
  const instructions = instructionsMatch 
    ? instructionsMatch[1].split('-').filter(Boolean).map(item => item.trim())
    : [];
  
  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* Header with title, subject, and description */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          
          {/* Extract subject if present */}
          {headerInfo.includes('## Subject:') && (
            <Text style={styles.subtitle}>
              {headerInfo.match(/## Subject:(.*?)(?=\n|$)/)?.[1]?.trim()}
            </Text>
          )}
          
          {description && <Text style={styles.description}>{description}</Text>}
        </View>
        
        <View style={styles.hr} />
        
        {/* Instructions */}
        {instructions.length > 0 && (
          <View>
            <Text style={styles.instructionsHeader}>Instructions:</Text>
            <View style={styles.instructionsList}>
              {instructions.map((instruction, i) => (
                <View key={i} style={styles.instructionItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.instructionText}>{instruction}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        
        <View style={styles.hr} />
        
        {/* Content sections */}
        <View style={styles.contentContainer}>
          {processedSections.map((section, i) => (
            <React.Fragment key={i}>
              {renderSection(section)}
            </React.Fragment>
          ))}
        </View>
        
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
export const downloadEnhancedPDF = async (
  title: string, 
  description: string, 
  content: string, 
  fileName: string
): Promise<boolean> => {
  try {
    // Generate the PDF document
    const blob = await pdf(
      <EnhancedTestPDF 
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

// A button component to trigger the PDF download
interface EnhancedPDFDownloadProps {
  title: string;
  description?: string;
  content: string;
  fileName: string;
  children: React.ReactNode | (({ isGenerating, onClick }: { isGenerating: boolean, onClick: () => Promise<void> }) => React.ReactNode);
  onStart?: () => void;
  onComplete?: (success: boolean) => void;
}

export const EnhancedPDFDownloadButton: React.FC<EnhancedPDFDownloadProps> = ({
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
      const success = await downloadEnhancedPDF(title, description, content, fileName);
      if (onComplete) onComplete(success);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      if (onComplete) onComplete(false);
    } finally {
      setIsGenerating(false);
    }
  };
  
  if (typeof children === 'function') {
    return children({ isGenerating, onClick: handleClick });
  }
  
  return (
    <div onClick={handleClick}>
      {children}
    </div>
  );
};

export default EnhancedTestPDF; 
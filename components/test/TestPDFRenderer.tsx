import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import { marked } from 'marked';

// Register fonts for PDF
Font.register({
  family: 'Open Sans',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-regular.ttf' },
    { src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-600.ttf', fontWeight: 600 },
    { src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-700.ttf', fontWeight: 700 },
  ],
});

// Define styles for PDF document
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 40,
    fontFamily: 'Open Sans',
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
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 10,
    backgroundColor: '#f5f5f5',
    padding: 8,
  },
  question: {
    marginBottom: 15,
  },
  questionText: {
    fontSize: 12,
    marginBottom: 8,
    fontWeight: 600,
  },
  answer: {
    fontSize: 11,
    marginLeft: 20,
    marginBottom: 4,
  },
  longAnswer: {
    fontSize: 11,
    marginTop: 5,
    marginLeft: 20,
    marginBottom: 10,
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

// Parse markdown test content to structured format
const parseTestContent = (markdown: string) => {
  // Simple sections extraction logic - this could be expanded based on specific test format
  const sections: { title: string; questions: { question: string; options?: string[]; answer?: string }[] }[] = [];
  
  let currentSection: { title: string; questions: { question: string; options?: string[]; answer?: string }[] } | null = null;
  let currentQuestion: { question: string; options?: string[]; answer?: string } | null = null;
  
  // Process markdown line by line
  const lines = markdown.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Section headers (# or ## headers)
    if (line.startsWith('# ') || line.startsWith('## ')) {
      if (currentSection && currentSection.questions.length > 0) {
        sections.push(currentSection);
      }
      
      currentSection = {
        title: line.replace(/^#+ /, ''),
        questions: []
      };
      currentQuestion = null;
    }
    // Questions (numbered or with "Question" prefix)
    else if (/^(\d+\.)/.test(line) || line.startsWith('Question')) {
      if (currentQuestion && currentSection) {
        currentSection.questions.push(currentQuestion);
      }
      
      currentQuestion = {
        question: line,
        options: []
      };
    }
    // Options (A., B., C., etc.)
    else if (/^[A-D]\.\s/.test(line) && currentQuestion) {
      if (!currentQuestion.options) {
        currentQuestion.options = [];
      }
      currentQuestion.options.push(line);
    }
    // Answer key or expected answer
    else if ((line.startsWith('Answer:') || line.startsWith('Expected answer:')) && currentQuestion) {
      currentQuestion.answer = line;
    }
    // End of file, add final question and section
    else if (line === '' && i === lines.length - 1) {
      if (currentQuestion && currentSection) {
        currentSection.questions.push(currentQuestion);
      }
      if (currentSection && currentSection.questions.length > 0) {
        sections.push(currentSection);
      }
    }
  }
  
  // Add the last section if it exists and wasn't added
  if (currentQuestion && currentSection) {
    currentSection.questions.push(currentQuestion);
  }
  if (currentSection && currentSection.questions.length > 0 && !sections.includes(currentSection)) {
    sections.push(currentSection);
  }
  
  return sections;
};

interface TestPDFDocumentProps {
  testTitle: string;
  testDescription?: string;
  testContent: string;
}

export const TestPDFDocument: React.FC<TestPDFDocumentProps> = ({ 
  testTitle, 
  testDescription = '', 
  testContent 
}) => {
  // Parse the markdown content into structured sections
  const sections = parseTestContent(testContent);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{testTitle}</Text>
          {testDescription && (
            <Text style={styles.description}>{testDescription}</Text>
          )}
        </View>

        {sections.length > 0 ? (
          sections.map((section, sectionIndex) => (
            <View key={`section-${sectionIndex}`} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              
              {section.questions.map((question, questionIndex) => (
                <View key={`question-${sectionIndex}-${questionIndex}`} style={styles.question}>
                  <Text style={styles.questionText}>{question.question}</Text>
                  
                  {question.options?.map((option, optionIndex) => (
                    <Text key={`option-${optionIndex}`} style={styles.answer}>
                      {option}
                    </Text>
                  ))}
                  
                  {question.answer && (
                    <Text style={styles.longAnswer}>{question.answer}</Text>
                  )}
                </View>
              ))}
            </View>
          ))
        ) : (
          // Fallback rendering for unparsed content
          <View style={styles.section}>
            <Text>{testContent}</Text>
          </View>
        )}
        
        <View style={styles.footer}>
          <Text>{testTitle} | Generated with NoteNinja</Text>
        </View>
      </Page>
    </Document>
  );
};

interface TestPDFProps {
  testTitle: string;
  testDescription?: string;
  testContent: string;
  fileName: string;
}

export const TestPDFViewer: React.FC<TestPDFProps> = ({ 
  testTitle,
  testDescription,
  testContent,
  fileName
}) => {
  return (
    <PDFViewer style={{ width: '100%', height: '600px' }}>
      <TestPDFDocument 
        testTitle={testTitle}
        testDescription={testDescription}
        testContent={testContent}
      />
    </PDFViewer>
  );
};

interface TestPDFDownloadButtonProps extends TestPDFProps {
  children: (loading: boolean) => React.ReactNode;
}

export const TestPDFDownloadButton: React.FC<TestPDFDownloadButtonProps> = ({
  testTitle,
  testDescription,
  testContent,
  fileName,
  children
}) => {
  return (
    <PDFDownloadLink
      document={
        <TestPDFDocument 
          testTitle={testTitle}
          testDescription={testDescription}
          testContent={testContent}
        />
      }
      fileName={fileName}
    >
      {({ loading }) => children(loading)}
    </PDFDownloadLink>
  );
};

export default TestPDFViewer; 
'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Separator } from '@/components/ui/separator';

interface TestPreviewProps {
  content: string;
  className?: string;
  hideAnswers?: boolean;
}

/**
 * Component for rendering test content with consistent styling
 */
export function TestPreview({ content, className = '', hideAnswers = false }: TestPreviewProps) {
  // Process content to optionally hide answers
  let displayContent = content;

  if (hideAnswers) {
    // Remove the answer key section
    const answerKeyIndex = displayContent.indexOf('## Answer Key');
    if (answerKeyIndex !== -1) {
      displayContent = displayContent.substring(0, answerKeyIndex);
      // Add a note about hidden answers
      displayContent += '\n\n---\n\n*Answer key is hidden in preview mode*';
    }
  }

  return (
    <Card className={`test-preview overflow-hidden print:shadow-none ${className}`}>
      <CardContent className="p-6 sm:p-8 prose max-w-none dark:prose-invert">
        <Markdown 
          remarkPlugins={[remarkGfm]}
          components={{
            // Style headings
            h1: ({ children }) => (
              <h1 className="text-2xl font-bold mt-0 mb-4 text-center">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xl font-semibold mt-6 mb-3 pb-1 border-b">{children}</h2>
            ),
            // Style list items (for multiple choice options)
            li: ({ children }) => (
              <li className="my-1">{children}</li>
            ),
            // Style paragraphs
            p: ({ children }) => (
              <p className="my-2">{children}</p>
            ),
            // Style horizontal rules
            hr: () => (
              <Separator className="my-4" />
            ),
          }}
        >
          {displayContent}
        </Markdown>
      </CardContent>
    </Card>
  );
}

export default TestPreview; 
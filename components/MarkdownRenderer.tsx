'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * MarkdownRenderer - Unified component for rendering AI responses with proper markdown parsing
 * 
 * Features:
 * - Proper bullet point rendering
 * - Bold/italic text support
 * - Headers with proper hierarchy
 * - Links and lists
 * - Tables (via remark-gfm)
 * - Strikethrough (via remark-gfm)
 * - Special styling for conclusions/summaries
 */
export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  // Clean up empty bullet points and fix common formatting issues
  const cleanedContent = cleanMarkdownContent(content);

  return (
    <div className={`markdown-renderer ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headers with proper styling
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-white mb-4 mt-6 pb-2 border-b border-cyan-500/30">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold text-white mb-3 mt-5">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold text-white mb-2 mt-4">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold text-cyan-400 mb-2 mt-3">
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5 className="text-sm font-semibold text-cyan-400 mb-1 mt-2">
              {children}
            </h5>
          ),
          h6: ({ children }) => {
            // Special styling for conclusions/summaries (often marked as h6 or contains key words)
            const text = String(children).toLowerCase();
            const isConclusion = text.includes('kesimpulan') || 
                                text.includes('conclusion') || 
                                text.includes('ringkasan') ||
                                text.includes('summary');
            
            if (isConclusion) {
              return (
                <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-cyan-500/10 border border-cyan-500/30">
                  <h6 className="text-base font-bold text-cyan-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                    {children}
                  </h6>
                </div>
              );
            }
            return <h6 className="text-sm font-medium text-gray-300 mb-1 mt-2">{children}</h6>;
          },
          
          // Paragraphs
          p: ({ children }) => {
            const text = String(children).toLowerCase();
            
            // Special styling for conclusion paragraphs
            const isConclusion = text.includes('kesimpulan') || 
                                text.includes('conclusion') || 
                                text.includes('ringkasan') ||
                                text.includes('summary');
            
            // Check if it's a section header (numbered like "6. KESIMPULAN")
            const isSectionHeader = /^\d+\.\s*(kesimpulan|conclusion|ringkasan|summary)/i.test(text);
            
            if (isSectionHeader || isConclusion) {
              return (
                <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-cyan-500/10 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                  <p className="text-base font-semibold text-cyan-300 leading-relaxed">
                    {children}
                  </p>
                </div>
              );
            }
            
            return (
              <p className="text-gray-300 leading-relaxed mb-3">
                {children}
              </p>
            );
          },
          
          // Lists with proper bullet styling
          ul: ({ children }) => (
            <ul className="list-none space-y-2 my-3 pl-0">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-2 my-3 text-gray-300">
              {children}
            </ol>
          ),
          li: ({ children, ordered }) => (
            <li className="flex items-start gap-2 text-gray-300">
              {!ordered && (
                <span className="text-cyan-400 mt-1.5 flex-shrink-0">•</span>
              )}
              <span className="flex-1">{children}</span>
            </li>
          ),
          
          // Emphasis
          strong: ({ children }) => (
            <strong className="font-bold text-white">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-gray-200">{children}</em>
          ),
          
          // Code blocks
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 rounded text-sm font-mono">
                  {children}
                </code>
              );
            }
            return (
              <code className={`block p-4 bg-black/50 rounded-lg border border-cyan-500/20 text-sm font-mono overflow-x-auto ${className}`}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="my-4 overflow-x-auto">
              {children}
            </pre>
          ),
          
          // Block quotes (for disclaimers, notes)
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-cyan-500/50 pl-4 my-4 py-2 bg-cyan-500/5 rounded-r-lg italic text-gray-400">
              {children}
            </blockquote>
          ),
          
          // Links
          a: ({ href, children }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors"
            >
              {children}
            </a>
          ),
          
          // Tables
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-lg border border-cyan-500/20">
              <table className="w-full text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-cyan-500/10 border-b border-cyan-500/20">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-cyan-500/10">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-cyan-500/5 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-left font-semibold text-cyan-400">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 text-gray-300">
              {children}
            </td>
          ),
          
          // Horizontal rule
          hr: () => (
            <hr className="my-6 border-t border-cyan-500/20" />
          ),
        }}
      >
        {cleanedContent}
      </ReactMarkdown>
    </div>
  );
}

/**
 * Clean up markdown content to fix common issues:
 * - Remove empty bullet points
 * - Fix malformed lists
 * - Clean up excessive whitespace
 */
function cleanMarkdownContent(content: string): string {
  if (!content) return '';
  
  let cleaned = content;
  
  // Remove empty bullet points (lines with just * or - and optional whitespace)
  cleaned = cleaned.replace(/^[\*\-]\s*$/gm, '');
  
  // Remove multiple consecutive empty lines (keep max 2)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // Fix bullet points that are missing space after asterisk
  cleaned = cleaned.replace(/^\*([^\s\*])/gm, '* $1');
  
  // Fix numbered lists that are missing space after dot
  cleaned = cleaned.replace(/^(\d+\.)([^\s])/gm, '$1 $2');
  
  // Ensure headers have proper spacing
  cleaned = cleaned.replace(/^(#{1,6})([^\s#])/gm, '$1 $2');
  
  // Trim trailing whitespace from each line
  cleaned = cleaned.split('\n').map(line => line.trimEnd()).join('\n');
  
  // Trim overall content
  cleaned = cleaned.trim();
  
  return cleaned;
}

/**
 * Utility to detect if content contains markdown formatting
 */
export function hasMarkdownFormatting(content: string): boolean {
  if (!content) return false;
  
  const markdownPatterns = [
    /^#{1,6}\s/m,           // Headers
    /\*\*.+\*\*/,           // Bold
    /\*.+\*/,               // Italic
    /^[\*\-\+]\s/m,         // Unordered lists
    /^\d+\.\s/m,            // Ordered lists
    /\[.+\]\(.+\)/,         // Links
    /`[^`]+`/,              // Inline code
    /^```/m,                // Code blocks
    /^\>/m,                 // Blockquotes
    /^\|.+\|$/m,            // Tables
  ];
  
  return markdownPatterns.some(pattern => pattern.test(content));
}

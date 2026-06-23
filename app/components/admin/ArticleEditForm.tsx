'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ArticleEditFormProps {
  article: {
    id: number;
    title: string;
    summary: string | null;
    content: string;
  };
  onSave: (data: { title: string; summary: string; content: string }) => Promise<void>;
  isSaving: boolean;
}

export function ArticleEditForm({ article, onSave, isSaving }: ArticleEditFormProps) {
  const [title, setTitle] = useState(article.title);
  const [summary, setSummary] = useState(article.summary ?? '');
  const [content, setContent] = useState(article.content);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ title, summary, content });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Edit Article</h1>
        <button
          type="submit"
          disabled={isSaving || !title || !content}
          className="px-4 py-2 bg-accent-blue text-bg-primary text-sm font-medium rounded-md hover:bg-accent-blue-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-text-secondary mb-1">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-border-secondary rounded-md text-sm text-text-primary bg-bg-primary focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent"
            required
          />
        </div>

        <div>
          <label htmlFor="summary" className="block text-sm font-medium text-text-secondary mb-1">
            Summary
          </label>
          <input
            id="summary"
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="w-full px-3 py-2 border border-border-secondary rounded-md text-sm text-text-primary bg-bg-primary focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent"
          />
        </div>

        <div>
          <div className="flex items-center gap-4 mb-1">
            <label className="block text-sm font-medium text-text-secondary">Content</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`text-sm pb-1 ${
                  activeTab === 'edit'
                    ? 'text-accent-blue border-b-2 border-accent-blue font-semibold'
                    : 'text-text-tertiary'
                }`}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`text-sm pb-1 ${
                  activeTab === 'preview'
                    ? 'text-accent-blue border-b-2 border-accent-blue font-semibold'
                    : 'text-text-tertiary'
                }`}
              >
                Preview
              </button>
            </div>
          </div>

          {activeTab === 'edit' ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full min-h-[400px] font-mono text-sm text-text-primary bg-bg-primary border border-border-secondary rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent"
              required
            />
          ) : (
            <div className="min-h-[400px] border border-border-secondary rounded-md p-3 prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}

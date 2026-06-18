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
        <h1 className="text-2xl font-bold text-gray-900">Edit Article</h1>
        <button
          type="submit"
          disabled={isSaving || !title || !content}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label htmlFor="summary" className="block text-sm font-medium text-gray-700 mb-1">
            Summary
          </label>
          <input
            id="summary"
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
          />
        </div>

        <div>
          <div className="flex items-center gap-4 mb-1">
            <label className="block text-sm font-medium text-gray-700">Content</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`text-sm pb-1 ${
                  activeTab === 'edit'
                    ? 'text-blue-600 border-b-2 border-blue-600 font-semibold'
                    : 'text-gray-500'
                }`}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`text-sm pb-1 ${
                  activeTab === 'preview'
                    ? 'text-blue-600 border-b-2 border-blue-600 font-semibold'
                    : 'text-gray-500'
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
              className="w-full min-h-[400px] font-mono text-sm border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              required
            />
          ) : (
            <div className="min-h-[400px] border border-gray-300 rounded-md p-3 prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}

'use client';

import { useState } from 'react';
import { ArticleEditForm } from '@/app/components/admin/ArticleEditForm';
import { VersionHistoryTable } from '@/app/components/admin/VersionHistoryTable';
import { ConfirmDialog } from '@/app/components/admin/ConfirmDialog';
import { useToast, ToastContainer } from '@/app/components/admin/Toast';
import { format } from 'date-fns';

interface Version {
  id: number;
  version: number;
  title: string;
  createdAt: string;
}

interface Extraction {
  id: number;
  modelName: string;
  inputPricePer1m: number | null;
  outputPricePer1m: number | null;
  confidence: string;
  sourceName: string | null;
  sourceUrl: string | null;
  collectedAt: string;
}

interface EditArticleClientProps {
  article: {
    id: number;
    title: string;
    summary: string | null;
    content: string;
    date: string;
  };
  initialVersions: Version[];
  initialExtractions: Extraction[];
}

export function EditArticleClient({ article, initialVersions, initialExtractions }: EditArticleClientProps) {
  const [versions, setVersions] = useState(initialVersions);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'sources'>('edit');
  const [isSaving, setIsSaving] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState<number | null>(null);
  const { toasts, addToast, removeToast } = useToast();

  const currentVersion = versions.length > 0 ? Math.max(...versions.map((v) => v.version)) : 0;

  const handleSave = async (data: { title: string; summary: string; content: string }) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/articles/${article.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error('Save failed');

      addToast('success', 'Changes saved successfully.');

      // Refresh versions
      const versionsRes = await fetch(`/api/admin/articles/${article.id}/versions`);
      if (versionsRes.ok) {
        const { versions: newVersions } = await versionsRes.json();
        setVersions(newVersions);
      }
    } catch (error) {
      console.error('Article save failed:', error);
      addToast('error', 'Article save failed. Your changes were not saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRollback = async () => {
    if (!rollbackTarget) return;

    try {
      const res = await fetch(`/api/admin/articles/${article.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId: rollbackTarget }),
      });

      if (!res.ok) throw new Error('Rollback failed');

      addToast('success', 'Article rolled back to the selected version.');
      setRollbackTarget(null);

      // Reload page to show restored content
      window.location.reload();
    } catch (error) {
      console.error('Rollback failed:', error);
      addToast('error', 'Rollback failed. The article could not be restored to the selected version. Please try again.');
    }
  };

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('edit')}
          className={`pb-3 text-sm ${
            activeTab === 'edit'
              ? 'text-blue-600 border-b-2 border-blue-600 font-semibold'
              : 'text-gray-500'
          }`}
        >
          Edit
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`pb-3 text-sm ${
            activeTab === 'preview'
              ? 'text-blue-600 border-b-2 border-blue-600 font-semibold'
              : 'text-gray-500'
          }`}
        >
          Preview
        </button>
        <button
          onClick={() => setActiveTab('sources')}
          className={`pb-3 text-sm ${
            activeTab === 'sources'
              ? 'text-blue-600 border-b-2 border-blue-600 font-semibold'
              : 'text-gray-500'
          }`}
        >
          Sources
        </button>
      </div>

      {/* Edit tab */}
      {activeTab === 'edit' && (
        <ArticleEditForm article={article} onSave={handleSave} isSaving={isSaving} />
      )}

      {/* Preview tab */}
      {activeTab === 'preview' && (
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{article.title}</h1>
          {article.summary && <p className="text-sm text-gray-500 mb-6">{article.summary}</p>}
          <div className="prose prose-sm max-w-none">
            {/* Preview is handled by ArticleEditForm, but we show it standalone here too */}
            <p className="text-sm text-gray-500">Switch to Edit tab and use the Preview button within the form.</p>
          </div>
        </div>
      )}

      {/* Sources tab */}
      {activeTab === 'sources' && (
        <div>
          {initialExtractions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">No source data found for this article&apos;s date.</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Model</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Source</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Input Price</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Output Price</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Confidence</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {initialExtractions.map((ext) => (
                    <tr key={ext.id} className="border-b border-gray-100">
                      <td className="px-4 py-3 text-gray-900">{ext.modelName}</td>
                      <td className="px-4 py-3">
                        {ext.sourceUrl ? (
                          <a href={ext.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm">
                            {ext.sourceName ?? 'Link'}
                          </a>
                        ) : (
                          <span className="text-gray-600">{ext.sourceName ?? 'Unknown'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {ext.inputPricePer1m !== null ? `$${ext.inputPricePer1m.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {ext.outputPricePer1m !== null ? `$${ext.outputPricePer1m.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 capitalize">{ext.confidence.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {format(new Date(ext.collectedAt), 'MMM d, yyyy h:mm a')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Version History */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Version History</h2>
        <VersionHistoryTable
          versions={versions}
          onRollback={(versionId) => setRollbackTarget(versionId)}
          currentVersion={currentVersion}
        />
      </div>

      {/* Rollback confirmation dialog */}
      <ConfirmDialog
        isOpen={rollbackTarget !== null}
        title="Rollback Article"
        message="This will replace the current article content with a previous version. The current version will be saved in history. Continue?"
        confirmLabel="Yes, Rollback"
        onConfirm={handleRollback}
        onCancel={() => setRollbackTarget(null)}
        variant="danger"
      />

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}

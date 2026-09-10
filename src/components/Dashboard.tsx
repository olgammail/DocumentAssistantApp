import { useState } from 'react';
import type { DashboardDocument } from '../types/document';
import ReviewDialog from './ReviewDialog';

interface DashboardProps {
  documents: DashboardDocument[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
}

function safeFileLink(link: string): string | undefined {
  try {
    const url = new URL(link);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined;
  } catch { return undefined; }
}

export default function Dashboard({ documents, loading, error, onRefresh }: DashboardProps) {
  const [selected, setSelected] = useState<DashboardDocument | null>(null);
  const [success, setSuccess] = useState('');
  // Keep confirmed reviews protected if the subsequent refresh fails or returns stale data.
  const [confirmedReviews, setConfirmedReviews] = useState<Record<string, string>>({});
  return <section className="panel dashboard" aria-labelledby="dashboard-title" aria-busy={loading}>
    <div className="dashboard-heading">
      <h2 id="dashboard-title">Processed Documents</h2>
      <button type="button" onClick={onRefresh} disabled={loading}>Refresh</button>
    </div>
    <div aria-live="polite">
      {success && <p className="message success">{success}</p>}
      {loading && <p className="message">Loading documents…</p>}
      {error && <p className="message error" role="alert">{error}</p>}
      {!loading && !error && documents.length === 0 && <p className="message">No documents found.</p>}
    </div>
    {documents.length > 0 && <div className="table-scroll" role="region" aria-label="Processed documents table" tabIndex={0}>
      <table>
        <thead><tr>{['File Name', 'Document Type', 'Summary', 'Urgency', 'Department', 'Status', 'Reviewed By', 'Document ID', 'Action'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>{documents.map((document, index) => {
          const confirmedBy = Object.hasOwn(confirmedReviews, document.documentId) ? confirmedReviews[document.documentId] : '';
          const reviewed = Boolean(document.reviewedBy.trim() || confirmedBy || document.status.trim().toLowerCase() === 'reviewed');
          const link = safeFileLink(document.fileLink);
          const urgency = document.urgency.toLowerCase();
          const knownUrgency = ['high', 'medium', 'low'].includes(urgency);
          return <tr key={`${document.documentId}-${index}`}>
            <td>{link ? <a href={link} target="_blank" rel="noopener noreferrer">{document.fileName || '-'}</a> : document.fileName || '-'}</td>
            <td>{document.documentType || '-'}</td>
            <td className="document-summary">{document.summary || '-'}</td>
            <td><span className={knownUrgency ? `urgency urgency-${urgency}` : ''}>{knownUrgency ? urgency[0].toUpperCase() + urgency.slice(1) : document.urgency || '-'}</span></td>
            <td>{document.department || '-'}</td>
            <td>{confirmedBy ? 'Reviewed' : document.status || '-'}</td>
            <td>{document.reviewedBy || confirmedBy || '-'}</td>
            <td>{document.documentId || '-'}</td>
            <td>{reviewed ? <span className="success">Reviewed ✓</span> : <>
              <button className="review-button" type="button" disabled={!document.documentId.trim()} onClick={() => { setSuccess(''); setSelected(document); }}>Review</button>
              {!document.documentId.trim() && <span className="hint">Document ID is missing.</span>}
            </>}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>}
    {selected && <ReviewDialog document={selected} onCancel={() => setSelected(null)} onSuccess={reviewedBy => {
      setConfirmedReviews(previous => ({ ...previous, [selected.documentId]: reviewedBy }));
      setSuccess('Review submitted successfully.');
      setSelected(null);
      onRefresh();
    }} />}
  </section>;
}

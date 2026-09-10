import { useEffect, useRef, useState, type FormEvent } from 'react';
import { submitReview } from '../api/documents';
import type { DashboardDocument } from '../types/document';

interface ReviewDialogProps {
  document: DashboardDocument;
  onCancel: () => void;
  onSuccess: (reviewedBy: string) => void;
}

export default function ReviewDialog({ document, onCancel, onSuccess }: ReviewDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pending = useRef(false);
  const [reviewedBy, setReviewedBy] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    if (!document.documentId.trim()) { setError('Document ID is missing. This document cannot be reviewed.'); return; }
    if (!reviewedBy.trim()) { setError('Reviewed By is required.'); return; }
    pending.current = true;
    setSubmitting(true);
    setError('');
    try {
      await submitReview(document.documentId, reviewedBy, reviewNote);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Review failed. Please retry.');
      pending.current = false;
      setSubmitting(false);
      return;
    }
    onSuccess(reviewedBy.trim());
  }

  return <dialog ref={dialog} className="review-dialog" aria-labelledby="review-title" onCancel={event => {
    event.preventDefault();
    if (!pending.current) onCancel();
  }}>
    <h2 id="review-title">Review Document</h2>
    <dl>
      <div><dt>File Name</dt><dd>{document.fileName || '-'}</dd></div>
      <div><dt>Document ID</dt><dd>{document.documentId || '-'}</dd></div>
    </dl>
    <form onSubmit={handleSubmit} noValidate aria-busy={submitting}>
      <fieldset disabled={submitting}>
        <label htmlFor="reviewed-by">Reviewed By (required)</label>
        <input id="reviewed-by" type="text" autoFocus required value={reviewedBy} onChange={event => setReviewedBy(event.target.value)} />
        <label htmlFor="review-note">Review Note <span className="optional">(optional)</span></label>
        <textarea id="review-note" rows={4} value={reviewNote} onChange={event => setReviewNote(event.target.value)} />
        <div className="review-actions">
          <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
          <button type="submit" disabled={submitting || !document.documentId.trim()}>{submitting ? 'Submitting...' : 'Submit Review'}</button>
        </div>
      </fieldset>
      {error && <p className="message error" role="alert">{error}</p>}
      {!document.documentId.trim() && <p className="message error">Document ID is missing. This document cannot be reviewed.</p>}
    </form>
  </dialog>;
}

import { useRef, useState, type FormEvent } from 'react';
import { getDocuments, isSupportedDocument, processDocument } from './api/documents';
import type { DashboardDocument, ProcessedDocument } from './types/document';
import Dashboard from './components/Dashboard';

export default function App() {
  const [tab, setTab] = useState<'upload' | 'dashboard'>('upload');
  const [documents, setDocuments] = useState<DashboardDocument[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const dashboardRequested = useRef(false);
  const dashboardRequest = useRef(0);

  async function refreshDocuments() {
    dashboardRequested.current = true;
    const request = ++dashboardRequest.current;
    setDashboardLoading(true);
    setDashboardError('');
    try {
      const rows = await getDocuments();
      if (request === dashboardRequest.current) setDocuments(rows);
    } catch (cause) {
      if (request === dashboardRequest.current) setDashboardError(cause instanceof Error ? cause.message : 'Could not load documents. Please retry.');
    } finally {
      if (request === dashboardRequest.current) setDashboardLoading(false);
    }
  }
  const [file, setFile] = useState<File | null>(null);
  const [submittedBy, setSubmittedBy] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [document, setDocument] = useState<ProcessedDocument | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError('');
    setDocument(null);
    if (!file) { setError('Choose a document before processing.'); return; }
    if (!isSupportedDocument(file)) {
      setError('Choose a PDF (.pdf), Word (.docx), or Text (.txt) file.'); return;
    }
    setLoading(true);
    try {
      setDocument(await processDocument(file, submittedBy));
      void refreshDocuments();
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Something went wrong. Please retry.'); }
    finally { setLoading(false); }
  }

  return (
    <main className={tab === 'dashboard' ? 'dashboard-layout' : undefined}>
      <header>
        <p className="eyebrow">DOCUMENT WORKSPACE</p>
        <h1>Document Assistant</h1>
        <p className="intro">Upload a document to get its summary and urgency.</p>
      </header>
      <nav className="tabs" aria-label="Document workspace">
        <button type="button" aria-pressed={tab === 'upload'} aria-controls="upload-panel" onClick={() => setTab('upload')}>Upload Document</button>
        <button type="button" aria-pressed={tab === 'dashboard'} aria-controls="dashboard-panel" onClick={() => {
          setTab('dashboard');
          if (!dashboardRequested.current) void refreshDocuments();
        }}>Dashboard</button>
      </nav>
      <div id="upload-panel" hidden={tab !== 'upload'}>
      <section className="panel" aria-labelledby="upload-title">
        <h2 id="upload-title">Upload a document</h2>
        <form onSubmit={handleSubmit} aria-busy={loading}>
          <fieldset disabled={loading}>
            <div className="file-field">
              <label htmlFor="pdf">Document</label>
              <p id="file-hint" className="hint">Supported file types: PDF (.pdf), Word (.docx), and Text (.txt).</p>
              <input id="pdf" type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" aria-describedby="file-hint" onChange={(event) => {
                setFile(event.target.files?.[0] ?? null); setError(''); setDocument(null);
              }} />
            </div>
            <label htmlFor="submitted-by">Submitted by <span className="optional">(optional)</span></label>
            <input id="submitted-by" type="text" autoComplete="name" placeholder="Your name" value={submittedBy} onChange={(event) => setSubmittedBy(event.target.value)} />
            <button type="submit">{loading ? 'Processing…' : 'Process Document'}</button>
          </fieldset>
        </form>
        <div className="messages" aria-live="polite" aria-atomic="true">
          {loading && <p className="message">Processing your document. This may take a moment.</p>}
          {error && <p className="message error" role="alert">{error}</p>}
          {document && <p className="message success">Document processed successfully.</p>}
        </div>
      </section>
      {document && <section className="panel result" aria-labelledby="result-title">
        <h2 id="result-title">Processing result</h2>
        <dl>
          <div><dt>Document ID</dt><dd>{document.document_id}</dd></div>
          <div><dt>File Name</dt><dd>{document.file_name}</dd></div>
          <div><dt>Summary</dt><dd className="summary">{document.summary}</dd></div>
          <div><dt>Urgency</dt><dd>{document.urgency}</dd></div>
        </dl>
      </section>}
      </div>
      <div id="dashboard-panel" hidden={tab !== 'dashboard'}>
        <Dashboard documents={documents} loading={dashboardLoading} error={dashboardError} onRefresh={() => void refreshDocuments()} />
      </div>
    </main>
  );
}

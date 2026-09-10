import type { DashboardDocument, ProcessedDocument } from '../types/document';

export async function submitReview(documentId: string, reviewedBy: string, reviewNote: string): Promise<void> {
  if (!documentId.trim()) throw new Error('Document ID is missing. This document cannot be reviewed.');
  if (!reviewedBy.trim()) throw new Error('Reviewed By is required.');
  const url = import.meta.env.VITE_N8N_REVIEW_URL;
  const apiKey = import.meta.env.VITE_N8N_API_KEY;
  if (!url || !apiKey || apiKey === 'replace-with-your-demo-api-key') {
    throw new Error('Configure VITE_N8N_REVIEW_URL and VITE_N8N_API_KEY in .env.local, then restart the frontend.');
  }
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({ document_id: documentId, status: 'Reviewed', reviewed_by: reviewedBy.trim(), review_note: reviewNote }),
    });
  } catch {
    throw new Error('Could not reach the review service. Check your connection and refresh the Dashboard before retrying if the request may have reached the server.');
  }
  if (!response.ok) throw new Error(`Review failed (HTTP ${response.status}). Please check the review endpoint and try again.`);
}

export async function getDocuments(): Promise<DashboardDocument[]> {
  const url = import.meta.env.VITE_N8N_DOCUMENTS_URL;
  const apiKey = import.meta.env.VITE_N8N_API_KEY;
  if (!url || !apiKey || apiKey === 'replace-with-your-demo-api-key') {
    throw new Error('Configure VITE_N8N_DOCUMENTS_URL and VITE_N8N_API_KEY in .env.local, then restart the frontend.');
  }
  let response: Response;
  try {
    response = await fetch(url, { method: 'GET', headers: { 'x-api-key': apiKey } });
  } catch {
    throw new Error('Could not load documents. Check your connection, documents URL, and n8n CORS settings.');
  }
  if (!response.ok) throw new Error(`Could not load documents (HTTP ${response.status}). Check the documents URL and API key.`);
  let data: unknown;
  try { data = await response.json(); } catch {
    throw new Error('The documents service returned invalid JSON.');
  }
  const rows = Array.isArray(data) ? data :
    typeof data === 'object' && data !== null && 'documents' in data ? data.documents : undefined;
  if (!Array.isArray(rows)) throw new Error('The documents service did not return an expected document list.');
  return rows.map((row: unknown) => {
    if (typeof row !== 'object' || row === null || Array.isArray(row)) {
      throw new Error('The documents service returned an invalid document row.');
    }
    const record = row as Record<string, unknown>;
    const value = (label: string, key: string): string => {
      const item = record[label] ?? record[key];
      return typeof item === 'string' ? item.trim() : typeof item === 'number' ? String(item) : '';
    };
    return {
      fileName: value('File Name', 'file_name'),
      fileLink: value('File Link', 'file_link'),
      documentType: value('Document Type', 'document_type'),
      summary: value('Summary', 'summary'),
      urgency: value('Urgency', 'urgency'),
      department: value('Department', 'department'),
      status: value('Status', 'status'),
      reviewedBy: value('Reviewed By', 'reviewed_by'),
      documentId: value('Document ID', 'document_id'),
    };
  });
}

export function isSupportedDocument(file: File): boolean {
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
  };
  const extension = file.name.match(/\.(pdf|docx|txt)$/i)?.[1].toLowerCase();
  return extension !== undefined && (file.type === '' || file.type === mimeTypes[extension]);
}

export async function pdfToBase64(file: File): Promise<string> {
  if (!isSupportedDocument(file)) {
    throw new Error('Choose a PDF (.pdf), Word (.docx), or Text (.txt) file.');
  }
  if (/\.pdf$/i.test(file.name)) {
    // Preserve the existing signature check for PDF files.
    const signature = new Uint8Array(await file.slice(0, 5).arrayBuffer());
    if (String.fromCharCode(...signature) !== '%PDF-') {
      throw new Error('This file does not contain a valid PDF header. Choose another PDF.');
    }
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The file could not be read. Select it again and retry.'));
    reader.onabort = () => reject(new Error('Reading the file was cancelled.'));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string' || !result.includes(',')) {
        reject(new Error('The file could not be encoded. Please retry.'));
        return;
      }
      // Strip the entire data-URL prefix: send only the Base64 content.
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.readAsDataURL(file);
  });
}

export async function processDocument(file: File, submittedBy: string): Promise<ProcessedDocument> {
  const url = import.meta.env.VITE_N8N_PROCESS_DOCUMENT_URL;
  const apiKey = import.meta.env.VITE_N8N_API_KEY;
  if (!url || !apiKey || url.includes('your-n8n.example') || apiKey === 'replace-with-your-demo-api-key') {
    throw new Error('Configure the n8n URL and API key in .env.local, then restart the frontend.');
  }
  const base64 = await pdfToBase64(file);
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({
        file_name: file.name,
        mime_type: file.type,
        file_base64: base64,
        submitted_by: submittedBy,
      }),
    });
  } catch {
    throw new Error('Could not reach the processing service. Check your connection, endpoint URL, and n8n CORS settings.');
  }
  if (!response.ok) {
    throw new Error(`Processing failed (HTTP ${response.status}). Check the endpoint and API key before retrying.`);
  }
  let data: unknown;
  try { data = await response.json(); } catch {
    throw new Error('The processing service returned invalid JSON. Check the n8n response.');
  }
  if (typeof data !== 'object' || data === null ||
      !('status' in data) || data.status !== 'processed' ||
      !('document_id' in data) || typeof data.document_id !== 'string' ||
      !('file_name' in data) || typeof data.file_name !== 'string' ||
      !('summary' in data) || typeof data.summary !== 'string' ||
      !('urgency' in data) || typeof data.urgency !== 'string') {
    throw new Error('The service did not return the expected processed document. Check the n8n response.');
  }
  return data as ProcessedDocument;
}

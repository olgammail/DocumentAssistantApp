export interface ProcessedDocument {
  status: 'processed';
  document_id: string;
  file_name: string;
  summary: string;
  urgency: string;
}

export interface DashboardDocument {
  fileName: string;
  fileLink: string;
  documentType: string;
  summary: string;
  urgency: string;
  department: string;
  status: string;
  reviewedBy: string;
  documentId: string;
}

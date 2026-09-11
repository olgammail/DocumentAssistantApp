# Document Assistant

A small React + TypeScript + Vite frontend using plain CSS and browser `fetch`. Implements PDF upload to n8n only.

## Local setup

Use Node.js 22.12+ (or Node.js 24).

1. Run `npm install` in this project folder.
2. Copy `.env.example` to `.env.local`.
3. Set `VITE_N8N_PROCESS_DOCUMENT_URL` to the full n8n process-document webhook URL and `VITE_N8N_API_KEY` to your demo API key.
4. Run `npm run dev` and open the local URL printed by Vite (normally http://localhost:5173).

Restart Vite after changing environment values. `.env.local` is ignored by Git; the example contains placeholders only.

**Demo security:** Vite `VITE_*` environment variables are visible to browser code and anyone using the app. This direct API-key approach is suitable only for this local/demo application. A production application requires a backend/proxy to protect the secret. Do not commit real credentials or publish a build containing them.

For requests from the local frontend, n8n (or its existing hosting layer) must allow the frontend origin through CORS, including OPTIONS preflight, POST, and the `Content-Type` and `x-api-key` headers.

## Upload behavior

Select a PDF, optionally enter Submitted by, and click Process Document. The app checks the extension, MIME type (when present), and `%PDF-` file header. This is a basic client-side check, not a full PDF parser; the backend should validate uploads too.

The browser reads the file and removes the data-URL prefix before posting exactly these JSON fields:

```json
{
  "file_name": "example.pdf",
  "mime_type": "application/pdf",
  "file_base64": "<base64 file content only>",
  "submitted_by": "<entered value, or empty string>"
}
```

The request uses `Content-Type: application/json` and `x-api-key`. A successful JSON response must have `status: "processed"` and string fields `document_id`, `file_name`, `summary`, and `urgency`. These four fields appear beneath the form. Loading prevents duplicate submissions; file, network, HTTP, and response-format errors appear in the message area. Requests are not automatically retried.

## Files and commands

- `src/App.tsx`: upload form, loading/errors, and result display.
- `src/api/documents.ts`: PDF validation, Base64 conversion, and POST request.
- `src/types/document.ts`: processed-document response type.
- `src/main.tsx`, `src/styles.css`: app entry and responsive styling.
- `index.html`, `tsconfig.json`, `package.json`: frontend tooling.
- `.env.example`, `.gitignore`: configuration template and ignored local files.

`npm run build` type-checks and creates a production build. `npm run preview` serves that build locally. No document list or review endpoint is implemented.

## n8n Workflows

The `n8n/` directory contains five exported workflows:

- **process-document** (`process-document.json`): HTTP parent workflow used by the frontend/Postman. Receives `POST /process-document`, converts the Base64 document to a binary file, prepares file metadata, calls `DocumentAssistant_2`, and returns the result.
- **DocumentAssistant_2** (`DocumentAssistant_2.json`): Shared document-processing workflow. Handles file upload, TXT/PDF/DOCX processing, AI extraction, Google Sheets logging, Gmail notification, moving the processed file, and returning the processing result.
- **get-documents** (`get-documents.json`): Provides `GET /documents` for the application Dashboard.
- **review-document** (`review-document.json`): Provides `POST /review` for updating document review status, reviewer name, and review note.
- **Google Document Parent Document Assistant2** (`Google Document Parent Document Assistant2.json`): Watches the Google Drive Incoming Documents folder, downloads a new file, calls `DocumentAssistant_2`, and deletes the original Incoming file after successful processing.

### Setup after import

Import these JSON files into your n8n instance. Configure or select your own Google Drive, Google Docs, Google Sheets, Gmail, Ollama, and Header Auth credentials as needed. Configure credentials in n8n; do not put API keys, passwords, OAuth tokens, or other secrets in these exports or the README.

You may also need to configure your own Incoming Documents folder, Temp folder, Processed Documents folder, Google Sheet, and notification email address.

In nodes that call `DocumentAssistant_2`, select the imported `DocumentAssistant_2` workflow again if necessary. Workflow IDs can differ between n8n instances, so exported references may not resolve automatically.

Configure the frontend's `VITE_N8N_PROCESS_DOCUMENT_URL`, `VITE_N8N_DOCUMENTS_URL`, and `VITE_N8N_REVIEW_URL` with the corresponding webhook URLs in your local `.env.local`, and configure `VITE_N8N_API_KEY` to match your Header Auth setup. Keep `.env.local` private and ignored by Git, and restart Vite after changing it.

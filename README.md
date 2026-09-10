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

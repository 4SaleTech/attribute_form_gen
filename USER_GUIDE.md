## Welcome

This product lets you build and publish simple, bilingual (English and Arabic) forms, then share them with your app or website. People fill the form, and their responses are saved to your system. File uploads go to Cloudinary automatically.

### What you can do
- Create forms from a list of building blocks (called attributes)
- Preview the form live (English or Arabic)
- Publish the form (enforces both languages)
- Receive submissions, including file uploads

## Before you start

- You’ll need the following installed once on your computer:
  - Docker Desktop (to run the database)
  - Node.js and pnpm (to run the Admin app)
  - Go (for the API server)
  - The team has provided configuration files; you don’t need to edit them.

If you don’t have these tools, ask a teammate with a laptop set up to run the quick start for you.

## Quick start (first time)

1) Start the database

```bash
docker-compose up -d
```

2) Initialize the database

```bash
migrate -path db/migrations -database "mysql://formdev:formdevpw@tcp(localhost:3307)/formdev" up
```

3) Start the API (server)

```bash
cd apps/api
ENVFILE=.env.local go run ./cmd/server
```

4) Start the Admin app (in a new terminal window)

```bash
pnpm install
pnpm dev:admin
```

5) Open the Admin app in your browser

Visit `http://localhost:5173`.

## Daily use (after the first time)

Each day you use the app:
1. Make sure Docker Desktop is running
2. Start the API: `cd apps/api && ENVFILE=.env.local go run ./cmd/server`
3. Start the Admin: `pnpm dev:admin`
4. Go to `http://localhost:5173`

## Create and preview a form

1. Open the Admin app at `http://localhost:5173`.
2. Enter a Form ID (for example: `service-intake`).
3. Enter the form Title in English and Arabic (both are required on publish).
4. Attributes (building blocks) are listed for you. The initial set includes:
   - Hero banner
   - Contact preference (radio: phone or email)
   - Phone number
   - Attachments (file upload)
5. Choose a preview language (EN or AR) from the dropdown.
6. Click “Preview” to see the live form below the button.

Tip: The preview shows exactly what users will see in your app’s web view.

## Publish a form (make it available to your app)

1. Ensure your form has English and Arabic titles.
2. Ensure each field label (and any options/placeholders) has English and Arabic.
3. Click “Publish”.
4. If something is missing, you’ll see a message telling you what to fix (for example, a missing Arabic label). Fix and click “Publish” again.

After publish, your development app can load the latest version of the form. Share the Form ID with your developer if needed.

## File uploads (what to expect)

If your form includes an Attachments field:
- When a user selects a file, the browser asks our server for a secure, short-lived signature.
- The file is uploaded directly to Cloudinary.
- The saved answer only contains the file ID and link (not the raw file).

You don’t need to manage any keys or secrets—this is handled for you.

## Thank-you screen

After submit, you can show a thank-you message (in both English and Arabic). The app may close the web view automatically depending on your mobile app’s settings.

## Submissions and where they go

- Responses are saved to the database.
- If your team configured webhooks, the system also sends the response to your chosen URLs (for example, Slack or an HTTP endpoint).

## Common issues and fixes

- Admin page doesn’t load:
  - Make sure the Admin app is running (`pnpm dev:admin`).
  - Make sure the API is running (`ENVFILE=.env.local go run ./cmd/server`).

- “Bilingual required” error when publishing:
  - Make sure the form title has English and Arabic.
  - Make sure each field’s label and any options/placeholder text have English and Arabic.

- “Cannot connect to database” on the server:
  - Make sure Docker Desktop is open and `docker-compose up -d` has been run.
  - If you restarted your computer, run the database and server steps again.

- File upload fails in preview:
  - Check your internet connection.
  - Try selecting a smaller file.

## Reset the local environment (optional)

If you need to wipe and restart the local database:

```bash
docker-compose down -v
docker-compose up -d
migrate -path db/migrations -database "mysql://formdev:formdevpw@tcp(localhost:3307)/formdev" up
```

## Who to ask for help

If you get stuck, share the exact error message and what you clicked right before it happened with your developer or team lead. They can help quickly when they have those details.




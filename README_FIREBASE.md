Firebase Functions scaffold for replacing Base44 endpoints with Cloud Functions.

Prereqs
- Node 18+
- npm
- Firebase CLI (npm i -g firebase-tools)

Quick start
1. Login and initialize (if you haven't):
   firebase login
   firebase init
   # choose Functions, Firestore and Emulators when prompted

2. Install dependencies and run emulators from project root:
   cd "./functions"
   npm install
   npm run serve

3. Emulated Functions will appear at http://localhost:5001/<project>/us-central1/api
   - Example endpoint: http://localhost:5001/<project>/us-central1/api/api/apps

Deploy
- From project root:
    firebase deploy --only functions,firestore

Notes
- This scaffold provides a small set of CRUD endpoints under /api/apps that mimic the Base44 endpoints your app may call.
- To make your bundled client call these functions without rebuilding, add a small adapter in the client that rewrites requests from app.base44.com/base44.app to the functions URL (I can scaffold that adapter next).
  
Adapter (no-rebuild) instructions
1. Include the adapter script before your main bundle in `index.html`:

```html
<script src="/js/firebase-adapter.js"></script>
<script src="/js/main.388e37ce.js"></script>
```

2. By default the adapter rewrites to the local emulator at `http://localhost:5001` when you open the page on `localhost`. When you deploy, change `deployedFunctionsBase` in `js/firebase-adapter.js` to your deployed functions base URL (for example `https://us-central1-your-project.cloudfunctions.net`).

Testing tips
- Start the emulators with `cd functions && npm install && npm run serve` (from project root you can also run `firebase emulators:start`).
- Check the emulator logs in the terminal for incoming requests.
- If something doesn't work, open DevTools Network tab, inspect a request to `app.base44.com` — it should be rewritten to your functions host.

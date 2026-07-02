# site/ — Landing-page skeleton

A static, **bilingual** landing page with a free **Google Apps Script** lead-form backend. No build step, no paid service — host the files anywhere (Carrd, GitHub Pages, Netlify, or a plain static host).

## Architecture / technique

```
site/
├── index.html       ← markup + the small JS that runs the page
├── style.css        ← styles
├── ENcontent.js     ← all ENGLISH copy (one key per line)
├── VIcontent.js     ← all [SECOND-LANGUAGE] copy — SAME keys as EN
└── form.gs          ← Google Apps Script backend (Sheet + email)
```

### Bilingual via `data-i18n` (no duplicate HTML)
- Every translatable element carries `data-i18n="some_key"` and shows English inline as a fallback.
- `ENcontent.js` / `VIcontent.js` each define `window.I18N.en` / `window.I18N.vi` — **the same keys** in both.
- A small `applyLang(lang)` function swaps `el.innerHTML` for each `[data-i18n]` element, remembers the choice in `localStorage`, and the EN/VI buttons call it.
- To change wording: edit the text between back-ticks in the content file. Save, refresh. No HTML touched.

### Lead form → Google Sheet + Slack/email (free)
The **"Newton Leads"** sheet already exists (`SHEET_ID` and `NOTIFY_EMAIL` are pre-filled in `form.gs`).
Sheet: https://docs.google.com/spreadsheets/d/1Ee1Z_uc1q3pgNjRv2uWa3wg0DItxhCw26lglb4-qSYk/edit

1. Open that sheet ▸ Extensions ▸ Apps Script ▸ paste `form.gs`.
2. Run `setupSheet` once (authorize when prompted) to add the header row.
3. Deploy ▸ New deployment ▸ Web app (Execute as: Me · Access: Anyone). Copy the `/exec` URL.
4. Paste that URL into `FORM_ENDPOINT` in `index.html`.
5. **Slack alerts (optional):** create an Incoming Webhook (Slack ▸ Apps ▸ Incoming Webhooks ▸ add to a channel), paste the URL into `SLACK_WEBHOOK_URL` in `form.gs`. Until set, alerts go to email only.
6. Re-deploy a **new version** whenever you edit `form.gs`.

The page POSTs the form to that endpoint; Apps Script appends a row and emails you.

## To adapt for Affle
- Replace placeholder copy in `ENcontent.js` / `VIcontent.js`.
- Set the brand font + palette in `style.css`.
- Set `FORM_ENDPOINT` (index.html) and `SHEET_ID` / `NOTIFY_EMAIL` (form.gs).
- Drop any hero images/videos into a `media/` folder and reference them.

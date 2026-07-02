/**
 * Affle Landing — Lead form backend (Google Apps Script)
 * Receives POSTs from the landing pages, appends a row to a Google Sheet,
 * and emails a notification. One web app serves BOTH forms.
 *
 * Two forms → two tabs in the SAME spreadsheet, routed by `request_type`:
 *   • site/index.html  (sign-up / demo / etc.)  → "Signup" tab
 *   • site/report.html (2026 report waitlist)   → "Report" tab
 *       report.html sends request_type = "report"; everything else is a sign-up.
 *
 * ── SETUP ─────────────────────────────────────────────────────────
 * 1. Open the sheet ▸ Extensions ▸ Apps Script. Paste this whole file in
 *    (replacing the old version).
 * 2. Confirm SHEET_ID / NOTIFY_EMAIL below.
 * 3. Run `setupSheets` once (authorize when prompted) to create the
 *    "Signup" and "Report" tabs with header rows (skips any that exist).
 * 4. Deploy ▸ Manage deployments ▸ (your existing Web app) ▸ Edit ▸
 *    Version: "New version" ▸ Deploy.  The /exec URL stays the SAME,
 *    so both index.html and report.html keep working with no URL change.
 *    (First-time only: Deploy ▸ New deployment ▸ Web app ▸ Execute as: Me,
 *     Who has access: Anyone ▸ copy the /exec URL into both HTML files.)
 * ──────────────────────────────────────────────────────────────────
 */

var SHEET_ID     = '1Ee1Z_uc1q3pgNjRv2uWa3wg0DItxhCw26lglb4-qSYk'; // "Newton Leads" sheet
var NOTIFY_EMAIL = 'ravyn.do@affle.com'; // work email; set to '' to disable once Slack is live

// Slack Incoming Webhook — paste the https://hooks.slack.com/services/... URL here.
// Leave '' to skip Slack (email still fires).
var SLACK_WEBHOOK_URL = '';

// Each form's destination tab + the columns it writes (order matters).
var FORMS = {
  signup: {
    sheet:   'Signup',
    fields:  ['full_name', 'email', 'phone', 'company', 'job_title',
              'industry', 'objective', 'budget', 'message', 'request_type'],
    headers: ['Timestamp', 'Full name', 'Email', 'Phone', 'Company',
              'Job title', 'Industry', 'Objective', 'Budget', 'Message', 'Request type']
  },
  report: {
    sheet:   'Report',
    fields:  ['full_name', 'email', 'industry', 'running_apple_ads', 'request_type'],
    headers: ['Timestamp', 'Full name', 'Email', 'Vertical', 'Running Apple Ads?', 'Request type']
  }
};

var REQUEST_LABELS = {
  session:    'Strategy session',
  demo:       'Product demo',
  case_study: 'Case studies',
  benchmark:  'Benchmark report',
  signup:     'Sign-up',
  report:     'Report waitlist'
};

var FIELD_LABELS = {
  full_name: 'Name', email: 'Email', phone: 'Phone', company: 'Company',
  job_title: 'Job title', industry: 'Vertical', objective: 'Objective',
  budget: 'Budget', message: 'Message', running_apple_ads: 'Running Apple Ads?'
};

// Pick the right form config from the incoming payload.
function configFor(p) {
  return (p && p.request_type === 'report') ? FORMS.report : FORMS.signup;
}

// Return the tab, creating it (with a header row) if it doesn't exist yet.
function getOrCreateSheet(ss, cfg) {
  var sheet = ss.getSheetByName(cfg.sheet);
  if (!sheet) sheet = ss.insertSheet(cfg.sheet);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, cfg.headers.length).setValues([cfg.headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function doPost(e) {
  try {
    var p = (e && e.parameter) ? e.parameter : {};
    var cfg = configFor(p);
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = getOrCreateSheet(ss, cfg);

    var now = new Date();
    var row = [now];
    cfg.fields.forEach(function (f) { row.push(p[f] || ''); });
    sheet.appendRow(row);

    sendNotification(p, now, cfg);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

// Lets you sanity-check the deployment in a browser.
function doGet() {
  return json({ ok: true, service: 'Affle lead form', time: new Date() });
}

function sendNotification(p, when, cfg) {
  var typeLabel = REQUEST_LABELS[p.request_type] || p.request_type || 'Lead';
  var subject = '🍎 New Newton lead — ' + typeLabel + ' — ' +
                (p.company || p.full_name || p.email || 'Unknown');

  var lines = ['Request type: ' + typeLabel, 'Form: ' + cfg.sheet, 'Received: ' + when, ''];
  cfg.fields.forEach(function (f) {
    if (f === 'request_type') return;
    if (f === 'message') return; // printed last, as a block
    lines.push((FIELD_LABELS[f] || f) + ': ' + (p[f] || ''));
  });
  if (cfg.fields.indexOf('message') !== -1) {
    lines.push('', 'Message:', (p.message || '(none)'));
  }
  var body = lines.join('\n');

  // Slack first (preferred channel). Never let a Slack failure lose the lead.
  if (SLACK_WEBHOOK_URL) {
    try { postToSlack(subject, body); } catch (e) { /* fall through to email */ }
  }
  // Email fallback / record. Blank NOTIFY_EMAIL to disable.
  if (NOTIFY_EMAIL) {
    MailApp.sendEmail(NOTIFY_EMAIL, subject, body);
  }
}

function postToSlack(subject, body) {
  var payload = { text: '*' + subject + '*\n```' + body + '```' };
  UrlFetchApp.fetch(SLACK_WEBHOOK_URL, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Run once after pasting this in — creates both tabs with header rows
// (leaves any existing tab and its data untouched).
function setupSheets() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  Object.keys(FORMS).forEach(function (k) { getOrCreateSheet(ss, FORMS[k]); });
}

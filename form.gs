/**
 * Affle Landing — Lead form backend (Google Apps Script)
 * Receives POSTs from site/index.html, appends a row to a Google Sheet,
 * and emails a notification. Free, no third-party service.
 *
 * ── SETUP ─────────────────────────────────────────────────────────
 * 1. Create a Google Sheet. Copy its ID from the URL
 *    (https://docs.google.com/spreadsheets/d/<THIS_IS_THE_ID>/edit).
 * 2. Extensions ▸ Apps Script. Paste this file in.
 * 3. Fill in SHEET_ID and NOTIFY_EMAIL below.
 * 4. Run `setupSheet` once (authorize when prompted) to add the header row.
 * 5. Deploy ▸ New deployment ▸ type "Web app":
 *       - Execute as: Me
 *       - Who has access: Anyone
 *    Copy the /exec URL and paste it into FORM_ENDPOINT in index.html.
 * 6. Re-deploy (new version) whenever you change this script.
 * ──────────────────────────────────────────────────────────────────
 */

var SHEET_ID     = '1Ee1Z_uc1q3pgNjRv2uWa3wg0DItxhCw26lglb4-qSYk'; // "Newton Leads" sheet
var SHEET_NAME   = 'Leads';
var NOTIFY_EMAIL = 'ravyn.do@affle.com'; // work email; set to '' to disable once Slack is live

// Slack Incoming Webhook — paste the https://hooks.slack.com/services/... URL here.
// Create one: Slack ▸ your workspace ▸ Apps ▸ "Incoming Webhooks" ▸ Add to a channel (e.g. #newton-leads).
// Leave '' to skip Slack (email still fires).
var SLACK_WEBHOOK_URL = '';

// Order matters: matches HEADERS and the appendRow() below.
var FIELDS = [
  'full_name', 'email', 'phone', 'company', 'job_title',
  'industry', 'objective', 'budget', 'message', 'request_type'
];

var REQUEST_LABELS = {
  session:    'Strategy session',
  demo:       'Product demo',
  case_study: 'Case studies',
  benchmark:  'Benchmark report',
  signup:     'Sign-up'
};

function doPost(e) {
  try {
    var p = (e && e.parameter) ? e.parameter : {};
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME)
              || SpreadsheetApp.openById(SHEET_ID).insertSheet(SHEET_NAME);

    var now = new Date();
    var row = [now];
    FIELDS.forEach(function (f) { row.push(p[f] || ''); });
    sheet.appendRow(row);

    sendNotification(p, now);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

// Lets you sanity-check the deployment in a browser.
function doGet() {
  return json({ ok: true, service: 'Affle lead form', time: new Date() });
}

function sendNotification(p, when) {
  var typeLabel = REQUEST_LABELS[p.request_type] || p.request_type || 'Lead';
  var subject = '🍎 New Newton lead — ' + typeLabel + ' — ' + (p.company || p.full_name || 'Unknown');
  var lines = [
    'Request type: ' + typeLabel,
    'Received: ' + when,
    '',
    'Name:       ' + (p.full_name || ''),
    'Email:      ' + (p.email || ''),
    'Phone:      ' + (p.phone || ''),
    'Company:    ' + (p.company || ''),
    'Job title:  ' + (p.job_title || ''),
    'Industry:   ' + (p.industry || ''),
    'Objective:  ' + (p.objective || ''),
    'Budget:     ' + (p.budget || ''),
    '',
    'Message:',
    (p.message || '(none)')
  ];
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

// Run once after pasting in your SHEET_ID to create the header row.
function setupSheet() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  var HEADERS = ['Timestamp', 'Full name', 'Email', 'Phone', 'Company',
                 'Job title', 'Industry', 'Objective', 'Budget', 'Message', 'Request type'];
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  sheet.setFrozenRows(1);
}

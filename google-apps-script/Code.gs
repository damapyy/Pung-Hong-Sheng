/**
 * Google Apps Script for University Society & Club Treasury
 * -------------------------------------------------------------
 * 1. Open Google Sheets (https://sheets.new)
 * 2. Click Extensions > Apps Script
 * 3. Delete existing code and paste this entire file
 * 4. Click Run > initAllTreasurySheets (grant permissions once)
 * 5. Click Deploy > New deployment > Select type: "Web App"
 * 6. Set "Execute as: Me" and "Who has access: Anyone"
 * 7. Copy the Web App URL and paste it into the Treasurer Web App's Sync Settings!
 */

const SHEET_NAMES = {
  DASHBOARD: '1_Dashboard',
  TRANSACTIONS: '2_Transactions',
  PETTY_CASH: '3_Petty_Cash_Ledger',
  SCHOOL_TABUNG: '4_School_Tabung_Ledger',
  TRANSFERS: '5_Transfer_Log',
  BUDGET: '6_Budget_Tracker',
  MONTHLY: '7_Monthly_Report',
  CATEGORY: '8_Category_Summary',
  RECEIPTS: '9_Receipt_Tracker'
};

/**
 * Initialize all 9 sheets with styled headers, formulas, and conditional formatting.
 */
function initAllTreasurySheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Transactions Master Sheet
  initTransactionsSheet(ss);
  
  // 2. Ledgers
  initPettyCashSheet(ss);
  initSchoolTabungSheet(ss);
  
  // 3. Reports & Logs
  initTransfersSheet(ss);
  initBudgetSheet(ss);
  initMonthlySheet(ss);
  initCategorySheet(ss);
  initReceiptSheet(ss);
  initDashboardSheet(ss);
  
  SpreadsheetApp.flush();
  SpreadsheetApp.getActiveSpreadsheet().toast('All 9 Treasury Sheets have been initialized successfully!', 'Treasury System', 5);
}

function getOrCreateSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function formatHeader(range, bgColor, textColor = '#FFFFFF') {
  range.setBackground(bgColor)
       .setFontColor(textColor)
       .setFontWeight('bold')
       .setHorizontalAlignment('center')
       .setVerticalAlignment('middle')
       .setWrap(true);
}

function initTransactionsSheet(ss) {
  const sheet = getOrCreateSheet(ss, SHEET_NAMES.TRANSACTIONS);
  sheet.clear();
  
  const headers = [
    ['Ref', 'Date', 'Account', 'Type', 'Category', 'Description', 'Income (RM)', 'Expenses (RM)', 'Event', 'Paid By / Vendor', 'Receipt', 'Verified', 'Status', 'Notes']
  ];
  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
  formatHeader(sheet.getRange(1, 1, 1, headers[0].length), '#1e293b');
  sheet.setFrozenRows(1);
  
  // Number formatting for Income & Expenses
  sheet.getRange('G2:H1000').setNumberFormat('#,##0.00');
  sheet.getRange('B2:B1000').setNumberFormat('yyyy-mm-dd');
  
  // Column Widths
  sheet.setColumnWidth(1, 120); // Ref
  sheet.setColumnWidth(2, 110); // Date
  sheet.setColumnWidth(3, 130); // Account
  sheet.setColumnWidth(4, 100); // Type
  sheet.setColumnWidth(5, 110); // Category
  sheet.setColumnWidth(6, 250); // Description
  sheet.setColumnWidth(7, 120); // Income
  sheet.setColumnWidth(8, 120); // Expenses
  sheet.setColumnWidth(9, 180); // Event
  sheet.setColumnWidth(10, 180); // Paid By
  sheet.setColumnWidth(11, 80);  // Receipt
  sheet.setColumnWidth(12, 80);  // Verified
  sheet.setColumnWidth(13, 100); // Status
  sheet.setColumnWidth(14, 200); // Notes
}

function initPettyCashSheet(ss) {
  const sheet = getOrCreateSheet(ss, SHEET_NAMES.PETTY_CASH);
  sheet.clear();
  
  const headers = [
    ['Date', 'Ref', 'Category (Dept)', 'Description', 'Income (Inflow)', 'Expense (Outflow)', 'Running Balance (RM)', 'Status']
  ];
  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
  formatHeader(sheet.getRange(1, 1, 1, headers[0].length), '#059669'); // Emerald
  sheet.setFrozenRows(1);
  
  sheet.getRange('E2:G1000').setNumberFormat('#,##0.00');
  sheet.setColumnWidth(1, 110);
  sheet.setColumnWidth(2, 120);
  sheet.setColumnWidth(3, 140);
  sheet.setColumnWidth(4, 280);
  sheet.setColumnWidth(5, 130);
  sheet.setColumnWidth(6, 130);
  sheet.setColumnWidth(7, 160);
  sheet.setColumnWidth(8, 100);
}

function initSchoolTabungSheet(ss) {
  const sheet = getOrCreateSheet(ss, SHEET_NAMES.SCHOOL_TABUNG);
  sheet.clear();
  
  const headers = [
    ['Date', 'Ref', 'Category', 'Description', 'Income (Inflow)', 'Expense (Outflow)', 'Running Balance (RM)', 'Status']
  ];
  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
  formatHeader(sheet.getRange(1, 1, 1, headers[0].length), '#3b82f6'); // Royal Blue
  sheet.setFrozenRows(1);
  
  sheet.getRange('E2:G1000').setNumberFormat('#,##0.00');
  sheet.setColumnWidth(1, 110);
  sheet.setColumnWidth(2, 120);
  sheet.setColumnWidth(3, 140);
  sheet.setColumnWidth(4, 280);
  sheet.setColumnWidth(5, 130);
  sheet.setColumnWidth(6, 130);
  sheet.setColumnWidth(7, 160);
  sheet.setColumnWidth(8, 100);
}

function initTransfersSheet(ss) {
  const sheet = getOrCreateSheet(ss, SHEET_NAMES.TRANSFERS);
  sheet.clear();
  
  const headers = [
    ['Date', 'Ref', 'From Account', 'To Account', 'Amount (RM)', 'Description', 'Status', 'Verified']
  ];
  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
  formatHeader(sheet.getRange(1, 1, 1, headers[0].length), '#8b5cf6'); // Purple
  sheet.setFrozenRows(1);
  sheet.getRange('E2:E1000').setNumberFormat('#,##0.00');
}

function initBudgetSheet(ss) {
  const sheet = getOrCreateSheet(ss, SHEET_NAMES.BUDGET);
  sheet.clear();
  
  const headers = [
    ['Event Name', 'Allocated Budget (RM)', 'Actual Expenses (RM)', 'Remaining Budget (RM)', '% Spent', 'Health Status']
  ];
  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
  formatHeader(sheet.getRange(1, 1, 1, headers[0].length), '#0891b2'); // Cyan
  sheet.setFrozenRows(1);
  sheet.getRange('B2:D100').setNumberFormat('#,##0.00');
  sheet.getRange('E2:E100').setNumberFormat('0.0%');
}

function initMonthlySheet(ss) {
  const sheet = getOrCreateSheet(ss, SHEET_NAMES.MONTHLY);
  sheet.clear();
  
  const headers = [
    ['Month', 'Total Income (RM)', 'Total Expenses (RM)', 'Net Cash Flow (RM)', 'Petty Cash Net (RM)', 'School Tabung Net (RM)']
  ];
  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
  formatHeader(sheet.getRange(1, 1, 1, headers[0].length), '#475569'); // Slate
  sheet.setFrozenRows(1);
  sheet.getRange('B2:F100').setNumberFormat('#,##0.00');
}

function initCategorySheet(ss) {
  const sheet = getOrCreateSheet(ss, SHEET_NAMES.CATEGORY);
  sheet.clear();
  
  const headers = [
    ['Category / Department', 'Account', 'Type', 'Total Amount (RM)', 'Share of Total Expenses']
  ];
  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
  formatHeader(sheet.getRange(1, 1, 1, headers[0].length), '#d97706'); // Amber
  sheet.setFrozenRows(1);
  sheet.getRange('D2:D100').setNumberFormat('#,##0.00');
  sheet.getRange('E2:E100').setNumberFormat('0.0%');
}

function initReceiptSheet(ss) {
  const sheet = getOrCreateSheet(ss, SHEET_NAMES.RECEIPTS);
  sheet.clear();
  
  const headers = [
    ['Ref', 'Date', 'Vendor / Paid By', 'Amount (RM)', 'Event', 'Receipt Status', 'Verified by Treasurer', 'Compliance Alert']
  ];
  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
  formatHeader(sheet.getRange(1, 1, 1, headers[0].length), '#dc2626'); // Red
  sheet.setFrozenRows(1);
  sheet.getRange('D2:D1000').setNumberFormat('#,##0.00');
}

function initDashboardSheet(ss) {
  const sheet = getOrCreateSheet(ss, SHEET_NAMES.DASHBOARD);
  sheet.clear();
  
  sheet.getRange('A1:D1').merge().setValue('SOCIETY CLUB TREASURY - EXECUTIVE SUMMARY')
       .setBackground('#0f172a').setFontColor('#ffffff').setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center');
  
  sheet.getRange('A3').setValue('Account Overview').setFontWeight('bold');
  sheet.getRange('A4:B7').setValues([
    ['Petty Cash Account Balance:', `=SUMIF('2_Transactions'!C2:C, "Petty Cash", '2_Transactions'!G2:G) - SUMIFS('2_Transactions'!H2:H, '2_Transactions'!C2:C, "Petty Cash")`],
    ['School Tabung Balance:', `=SUMIF('2_Transactions'!C2:C, "School Tabung", '2_Transactions'!G2:G) - SUMIFS('2_Transactions'!H2:H, '2_Transactions'!C2:C, "School Tabung")`],
    ['Total Combined Assets:', `=B4+B5`],
    ['Net Cash Flow (Total):', `=SUM('2_Transactions'!G2:G) - SUM('2_Transactions'!H2:H)`]
  ]);
  sheet.getRange('B4:B7').setNumberFormat('#,##0.00').setFontWeight('bold');
}

/**
 * Web App REST Endpoint (GET): Exports data to Web App
 */
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const txnSheet = ss.getSheetByName(SHEET_NAMES.TRANSACTIONS);
    
    if (!txnSheet) {
      return createJsonResponse({ status: 'error', message: 'Transactions sheet not found. Run initAllTreasurySheets first.' });
    }
    
    const lastRow = txnSheet.getLastRow();
    const transactions = [];
    
    if (lastRow > 1) {
      const data = txnSheet.getRange(2, 1, lastRow - 1, 14).getValues();
      data.forEach((row, idx) => {
        if (!row[0] && !row[5]) return; // Skip empty rows
        
        let dateStr = '';
        if (row[1] instanceof Date) {
          dateStr = Utilities.formatDate(row[1], Session.getScriptTimeZone(), 'yyyy-MM-dd');
        } else {
          dateStr = String(row[1] || '');
        }
        
        transactions.push({
          id: 'gs-' + idx + '-' + Date.now(),
          ref: String(row[0] || ''),
          date: dateStr,
          account: String(row[2] || 'Petty Cash'),
          type: String(row[3] || 'Expenses'),
          category: String(row[4] || 'HC'),
          description: String(row[5] || ''),
          income: Number(row[6]) || 0,
          expenses: Number(row[7]) || 0,
          event: String(row[8] || ''),
          paidBy: String(row[9] || ''),
          receipt: String(row[10] || 'No'),
          verified: row[11] === true || String(row[11]).toLowerCase() === 'true' || String(row[11]).toLowerCase() === 'yes',
          status: String(row[12] || 'Completed'),
          notes: String(row[13] || '')
        });
      });
    }
    
    return createJsonResponse({
      status: 'success',
      timestamp: new Date().toISOString(),
      count: transactions.length,
      transactions: transactions
    });
  } catch (err) {
    return createJsonResponse({ status: 'error', error: err.toString() });
  }
}

/**
 * Web App REST Endpoint (POST): Syncs data from Web App into Google Spreadsheet
 */
function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (postData.action === 'syncAll' && Array.isArray(postData.transactions)) {
      populateTransactionsSheet(ss, postData.transactions);
      populateLedgerSheets(ss, postData.transactions);
      populateBudgetSheet(ss, postData.events, postData.transactions);
      populateReceiptSheet(ss, postData.transactions);
      
      return createJsonResponse({
        status: 'success',
        message: 'Successfully synced ' + postData.transactions.length + ' transactions across all sheets!',
        syncedAt: new Date().toISOString()
      });
    }
    
    return createJsonResponse({ status: 'error', message: 'Unsupported action or missing payload.' });
  } catch (err) {
    return createJsonResponse({ status: 'error', error: err.toString() });
  }
}

function populateTransactionsSheet(ss, txns) {
  const sheet = getOrCreateSheet(ss, SHEET_NAMES.TRANSACTIONS);
  sheet.getRange(2, 1, Math.max(sheet.getLastRow(), 2), 14).clearContent();
  
  if (!txns || txns.length === 0) return;
  
  const rows = txns.map(t => [
    t.ref || '',
    t.date || '',
    t.account || 'Petty Cash',
    t.type || 'Expenses',
    t.category || '',
    t.description || '',
    Number(t.income) || 0,
    Number(t.expenses) || 0,
    t.event || '',
    t.paidBy || '',
    t.receipt || 'No',
    t.verified ? 'Yes' : 'No',
    t.status || 'Completed',
    t.notes || ''
  ]);
  
  sheet.getRange(2, 1, rows.length, 14).setValues(rows);
}

function populateLedgerSheets(ss, txns) {
  // Populate Petty Cash
  const pettySheet = getOrCreateSheet(ss, SHEET_NAMES.PETTY_CASH);
  pettySheet.getRange(2, 1, Math.max(pettySheet.getLastRow(), 2), 8).clearContent();
  
  const pettyTxns = txns.filter(t => t.account === 'Petty Cash')
                        .sort((a, b) => new Date(a.date) - new Date(b.date));
  
  let pettyBal = 0;
  const pettyRows = pettyTxns.map(t => {
    const inc = Number(t.income) || 0;
    const exp = Number(t.expenses) || 0;
    if (t.type === 'Income') pettyBal += inc;
    if (t.type === 'Expenses' || t.type === 'Transfer') pettyBal -= exp;
    
    return [
      t.date,
      t.ref,
      t.category,
      t.description,
      inc > 0 ? inc : '',
      exp > 0 ? exp : '',
      pettyBal,
      t.status
    ];
  });
  
  if (pettyRows.length > 0) {
    pettySheet.getRange(2, 1, pettyRows.length, 8).setValues(pettyRows);
  }
  
  // Populate School Tabung
  const tabungSheet = getOrCreateSheet(ss, SHEET_NAMES.SCHOOL_TABUNG);
  tabungSheet.getRange(2, 1, Math.max(tabungSheet.getLastRow(), 2), 8).clearContent();
  
  const tabungTxns = txns.filter(t => t.account === 'School Tabung')
                         .sort((a, b) => new Date(a.date) - new Date(b.date));
  
  let tabungBal = 0;
  const tabungRows = tabungTxns.map(t => {
    const inc = Number(t.income) || 0;
    const exp = Number(t.expenses) || 0;
    if (t.type === 'Income') tabungBal += inc;
    if (t.type === 'Expenses' || t.type === 'Transfer') tabungBal -= exp;
    
    return [
      t.date,
      t.ref,
      t.category,
      t.description,
      inc > 0 ? inc : '',
      exp > 0 ? exp : '',
      tabungBal,
      t.status
    ];
  });
  
  if (tabungRows.length > 0) {
    tabungSheet.getRange(2, 1, tabungRows.length, 8).setValues(tabungRows);
  }
}

function populateBudgetSheet(ss, events, txns) {
  const sheet = getOrCreateSheet(ss, SHEET_NAMES.BUDGET);
  sheet.getRange(2, 1, Math.max(sheet.getLastRow(), 2), 6).clearContent();
  
  if (!events || events.length === 0) return;
  
  const rows = events.map(evt => {
    const actual = txns.filter(t => t.event === evt.name && (t.type === 'Expenses' || t.type === 'Transfer'))
                       .reduce((sum, t) => sum + (Number(t.expenses) || 0), 0);
    const budget = Number(evt.budget) || 0;
    const remaining = budget - actual;
    const pct = budget > 0 ? actual / budget : 0;
    let health = '🟢 Safe (<75%)';
    if (pct > 0.95) health = '🔴 Critical (>95%)';
    else if (pct >= 0.75) health = '🟡 Warning (75-95%)';
    
    return [evt.name, budget, actual, remaining, pct, health];
  });
  
  sheet.getRange(2, 1, rows.length, 6).setValues(rows);
}

function populateReceiptSheet(ss, txns) {
  const sheet = getOrCreateSheet(ss, SHEET_NAMES.RECEIPTS);
  sheet.getRange(2, 1, Math.max(sheet.getLastRow(), 2), 8).clearContent();
  
  const rows = txns.map(t => {
    const hasReceipt = t.receipt === 'Yes';
    const isVerified = t.verified === true;
    let alert = '🟢 Compliant';
    if (!hasReceipt) alert = '🔴 MISSING RECEIPT';
    else if (!isVerified) alert = '🟡 Pending Verification';
    
    return [
      t.ref,
      t.date,
      t.paidBy || t.description,
      Number(t.expenses) || Number(t.income) || 0,
      t.event,
      t.receipt,
      isVerified ? 'Yes' : 'No',
      alert
    ];
  });
  
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 8).setValues(rows);
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

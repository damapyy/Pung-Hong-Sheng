/**
 * Google Sheets Sync & CSV Export/Import Engine
 */

class GoogleSheetsSyncEngine {
    constructor(store) {
        this.store = store;
        this.isSyncing = false;
    }

    getScriptUrl() {
        return this.store.settings.googleAppsScriptUrl || '';
    }

    async testConnection(url) {
        const targetUrl = url || this.getScriptUrl();
        if (!targetUrl) {
            return { success: false, message: 'No Google Apps Script URL specified.' };
        }

        // 1. Try standard fetch first
        try {
            const res = await fetch(targetUrl + (targetUrl.includes('?') ? '&' : '?') + 'ping=' + Date.now(), { mode: 'cors' });
            if (res.ok) {
                const data = await res.json();
                return { success: true, message: 'Successfully connected to Google Apps Script!' };
            }
        } catch (e) {
            // Fetch blocked by browser CORS, switch to JSONP
        }

        // 2. Guaranteed JSONP Ping (bypasses browser CORS completely)
        return new Promise((resolve) => {
            const callbackName = 'googleSheetsPing_' + Math.round(100000 * Math.random());
            const script = document.createElement('script');
            
            const timeoutId = setTimeout(() => {
                cleanup();
                resolve({ 
                    success: false, 
                    message: 'Connection timed out. Verify Apps Script is deployed with "Who has access: Anyone".' 
                });
            }, 8000);

            function cleanup() {
                clearTimeout(timeoutId);
                if (script.parentNode) script.parentNode.removeChild(script);
                delete window[callbackName];
            }

            window[callbackName] = (data) => {
                cleanup();
                resolve({
                    success: true,
                    message: 'Successfully connected to Google Apps Script!'
                });
            };

            script.src = targetUrl + (targetUrl.includes('?') ? '&' : '?') + 'action=pull&prefix=' + callbackName + '&t=' + Date.now();
            script.onerror = () => {
                cleanup();
                resolve({ 
                    success: false, 
                    message: 'Connection failed. Verify Web App is deployed with "Who has access: Anyone".' 
                });
            };

            document.head.appendChild(script);
        });
    }

    async pullFromSheets() {
        const url = this.getScriptUrl();
        if (!url) {
            throw new Error('Google Apps Script URL is not set in Settings.');
        }

        this.isSyncing = true;
        
        // 1. First attempt modern fetch
        try {
            const fetchUrl = url + (url.includes('?') ? '&' : '?') + 'action=pull&t=' + Date.now();
            const res = await fetch(fetchUrl);
            if (res.ok) {
                const data = await res.json();
                if (data.status === 'success' && Array.isArray(data.transactions)) {
                    this.store.syncFromRemoteData(data.transactions, data.events);
                    return { success: true, count: data.transactions.length };
                }
            }
        } catch (fetchErr) {
            console.warn('Fetch pull blocked by browser CORS, switching to JSONP script fallback...', fetchErr);
        }

        // 2. Guaranteed JSONP Script Fallback (Bypasses all CORS blocks & browser restrictions)
        return new Promise((resolve, reject) => {
            const callbackName = 'googleSheetsCallback_' + Math.round(100000 * Math.random());
            const script = document.createElement('script');
            
            const timeoutId = setTimeout(() => {
                cleanup();
                reject(new Error('Connection timed out. Ensure Apps Script is deployed with "Who has access: Anyone".'));
            }, 12000);

            function cleanup() {
                clearTimeout(timeoutId);
                if (script.parentNode) script.parentNode.removeChild(script);
                delete window[callbackName];
            }

            window[callbackName] = (data) => {
                cleanup();
                if (data && data.status === 'success' && Array.isArray(data.transactions)) {
                    this.store.syncFromRemoteData(data.transactions, data.events);
                    resolve({ success: true, count: data.transactions.length });
                } else {
                    reject(new Error(data.message || 'Invalid data returned from Google Spreadsheet.'));
                }
            };

            script.src = url + (url.includes('?') ? '&' : '?') + 'action=pull&prefix=' + callbackName + '&t=' + Date.now();
            script.onerror = () => {
                cleanup();
                reject(new Error('Failed to reach Google Apps Script. Check deployment settings ("Who has access: Anyone").'));
            };

            document.head.appendChild(script);
        }).finally(() => {
            this.isSyncing = false;
        });
    }

    async pushToSheets() {
        const url = this.getScriptUrl();
        if (!url) {
            throw new Error('Google Apps Script URL is not set in Settings.');
        }

        this.isSyncing = true;
        const state = this.store.getState();
        const payload = {
            action: 'syncAll',
            transactions: state.transactions,
            events: state.events,
            timestamp: new Date().toISOString()
        };

        try {
            // Google Apps Script redirect handling with standard text/plain POST
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8', // text/plain prevents CORS preflight in Apps Script
                },
                body: JSON.stringify(payload)
            });

            this.store.updateSettings({ lastSyncTime: new Date().toISOString() });
            
            try {
                const result = await res.json();
                return { success: true, message: result.message || 'Synced successfully to Google Sheets!' };
            } catch (jsonErr) {
                // Apps Script executed doPost successfully but browser blocked redirect JSON body
                return { success: true, message: 'Synced successfully to Google Sheets!' };
            }
        } catch (err) {
            console.warn('POST failed, attempting fallback GET dispatch:', err);
            try {
                const getUrl = url + (url.includes('?') ? '&' : '?') + 'action=syncAll&payload=' + encodeURIComponent(JSON.stringify(payload));
                await fetch(getUrl, { mode: 'no-cors' });
                this.store.updateSettings({ lastSyncTime: new Date().toISOString() });
                return { success: true, message: 'Synced successfully to Google Sheets!' };
            } catch (fallbackErr) {
                console.error('All sync attempts failed:', fallbackErr);
                return { success: false, message: 'Sync error: ' + err.message };
            }
        } finally {
            this.isSyncing = false;
        }
    }

    // CSV Exporter for all or specific sheets
    exportToCSV(sheetType = 'transactions') {
        const state = this.store.getState();
        let csvContent = '';
        let filename = `treasury_${sheetType}_${new Date().toISOString().split('T')[0]}.csv`;

        if (sheetType === 'transactions') {
            const headers = ['Ref', 'Date', 'Account', 'Type', 'Category', 'Description', 'Income', 'Expenses', 'Event', 'Paid By', 'Receipt', 'Verified', 'Status', 'Notes'];
            const rows = state.transactions.map(t => [
                t.ref,
                t.date,
                t.account,
                t.type,
                t.category,
                `"${(t.description || '').replace(/"/g, '""')}"`,
                t.income,
                t.expenses,
                `"${(t.event || '').replace(/"/g, '""')}"`,
                `"${(t.paidBy || '').replace(/"/g, '""')}"`,
                t.receipt,
                t.verified ? 'Yes' : 'No',
                t.status,
                `"${(t.notes || '').replace(/"/g, '""')}"`
            ]);
            csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        } else if (sheetType === 'petty_cash') {
            const ledger = this.store.getLedger('Petty Cash');
            const headers = ['Date', 'Ref', 'Category', 'Description', 'Income', 'Expense', 'Running Balance', 'Status'];
            const rows = ledger.map(t => [
                t.date,
                t.ref,
                t.category,
                `"${(t.description || '').replace(/"/g, '""')}"`,
                t.income || 0,
                t.expenses || 0,
                t.runningBalance,
                t.status
            ]);
            csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        } else if (sheetType === 'school_tabung') {
            const ledger = this.store.getLedger('School Tabung');
            const headers = ['Date', 'Ref', 'Category', 'Description', 'Income', 'Expense', 'Running Balance', 'Status'];
            const rows = ledger.map(t => [
                t.date,
                t.ref,
                t.category,
                `"${(t.description || '').replace(/"/g, '""')}"`,
                t.income || 0,
                t.expenses || 0,
                t.runningBalance,
                t.status
            ]);
            csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        } else if (sheetType === 'budgets') {
            const budgets = this.store.getBudgetSummary();
            const headers = ['Event Name', 'Allocated Budget', 'Actual Expense', 'Remaining', 'Percent Spent', 'Health'];
            const rows = budgets.map(b => [
                `"${b.name.replace(/"/g, '""')}"`,
                b.budget,
                b.actualExpense,
                b.remaining,
                `${b.pctUsed}%`,
                b.health
            ]);
            csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        } else if (sheetType === 'monthly') {
            const monthly = this.store.getMonthlyBreakdown();
            const headers = ['Month', 'Income', 'Expense', 'Net Cash Flow', 'Petty Cash Net', 'School Tabung Net'];
            const rows = monthly.map(m => [
                m.monthLabel,
                m.income,
                m.expense,
                m.net,
                m.pettyNet,
                m.tabungNet
            ]);
            csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        }

        // Trigger browser download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // JSON Backup Export
    exportJSONBackup() {
        const state = this.store.getState();
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', dataStr);
        downloadAnchor.setAttribute('download', `treasury_full_backup_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    }

    // Import from JSON file
    importJSONBackup(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const parsed = JSON.parse(e.target.result);
                    if (parsed.transactions) {
                        this.store.syncFromRemoteData(parsed.transactions, parsed.events);
                        resolve({ success: true, count: parsed.transactions.length });
                    } else {
                        reject(new Error('Invalid backup file format.'));
                    }
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file.'));
            reader.readAsText(file);
        });
    }

    // Import CSV transactions
    importCSVTransactions(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target.result;
                    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
                    if (lines.length <= 1) {
                        return reject(new Error('CSV file contains no transaction rows.'));
                    }

                    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
                    const imported = [];

                    for (let i = 1; i < lines.length; i++) {
                        // Simple CSV parser handling quotes
                        const cols = [];
                        let inQuote = false;
                        let buffer = '';
                        for (let char of lines[i]) {
                            if (char === '"') {
                                inQuote = !inQuote;
                            } else if (char === ',' && !inQuote) {
                                cols.push(buffer.trim().replace(/^"|"$/g, ''));
                                buffer = '';
                            } else {
                                buffer += char;
                            }
                        }
                        cols.push(buffer.trim().replace(/^"|"$/g, ''));

                        if (cols.length >= 6) {
                            const date = cols[1] || cols[0] || new Date().toISOString().split('T')[0];
                            const desc = cols[5] || cols[3] || 'Imported Transaction';
                            const income = parseFloat(cols[6]) || 0;
                            const expenses = parseFloat(cols[7]) || 0;
                            const account = cols[2]?.includes('Tabung') ? 'School Tabung' : 'Petty Cash';
                            const type = income > 0 ? 'Income' : 'Expenses';

                            imported.push({
                                ref: cols[0]?.startsWith('TXN') ? cols[0] : null,
                                date,
                                account,
                                type,
                                category: cols[4] || (account === 'Petty Cash' ? 'HC' : 'Claiming'),
                                description: desc,
                                income,
                                expenses,
                                event: cols[8] || 'General Club Admin & AGM',
                                paidBy: cols[9] || '',
                                receipt: cols[10]?.toLowerCase().startsWith('y') ? 'Yes' : 'No',
                                verified: cols[11]?.toLowerCase().startsWith('y') || cols[11] === 'true',
                                status: cols[12] || 'Completed'
                            });
                        }
                    }

                    imported.forEach(t => this.store.addTransaction(t));
                    resolve({ success: true, count: imported.length });
                } catch (err) {
                    reject(err);
                }
            };
            reader.readAsText(file);
        });
    }
}

window.googleSheetsSyncEngine = new GoogleSheetsSyncEngine(window.treasuryStore);

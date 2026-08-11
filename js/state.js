/**
 * Society Club Treasurer - State Management & Calculation Engine
 */

const STORAGE_KEY = 'treasurer_club_data_v4';
const SETTINGS_KEY = 'treasurer_club_settings_v4';

// Default initial state for clean manual data entry
const DEFAULT_SETTINGS = {
    currency: 'RM',
    clubName: 'ESUM Tracker (Engineering Society University of Malaya)',
    fiscalYear: '2025/2026',
    googleAppsScriptUrl: '',
    autoSync: false,
    lastSyncTime: null,
    theme: 'dark'
};

const DEFAULT_EVENTS = [];

const SEED_TRANSACTIONS = [];

class TreasuryStore {
    constructor() {
        this.listeners = [];
        this.loadState();
    }

    loadState() {
        try {
            const savedData = localStorage.getItem(STORAGE_KEY);
            const savedSettings = localStorage.getItem(SETTINGS_KEY);

            this.settings = savedSettings ? { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) } : { ...DEFAULT_SETTINGS };

            if (savedData) {
                const parsed = JSON.parse(savedData);
                this.transactions = parsed.transactions || SEED_TRANSACTIONS;
                this.events = parsed.events || DEFAULT_EVENTS;
            } else {
                this.transactions = [...SEED_TRANSACTIONS];
                this.events = [...DEFAULT_EVENTS];
                this.saveState();
            }
        } catch (e) {
            console.error('Failed to load state from localStorage:', e);
            this.transactions = [...SEED_TRANSACTIONS];
            this.events = [...DEFAULT_EVENTS];
            this.settings = { ...DEFAULT_SETTINGS };
        }
    }

    saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                transactions: this.transactions,
                events: this.events
            }));
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
            this.notify();
        } catch (e) {
            console.error('Failed to save state:', e);
        }
    }

    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    notify() {
        this.listeners.forEach(cb => {
            try {
                cb(this.getState());
            } catch (e) {
                console.error('Listener callback error:', e);
            }
        });
    }

    getState() {
        return {
            transactions: [...this.transactions],
            events: [...this.events],
            settings: { ...this.settings },
            metrics: this.calculateMetrics()
        };
    }

    // Generate Next Reference Number: ESUM-YYYY-00X
    generateNextRef() {
        const year = new Date().getFullYear();
        const prefix = `ESUM-${year}-`;
        const existingRefs = this.transactions
            .map(t => t.ref)
            .filter(r => r && (r.startsWith(prefix) || r.startsWith(`TXN-${year}-`)));
        
        let maxNum = 0;
        existingRefs.forEach(r => {
            const parts = r.split('-');
            const num = parseInt(parts[2], 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        });

        const nextNum = String(maxNum + 1).padStart(3, '0');
        return `ESUM-${year}-${nextNum}`;
    }

    // CRUD Transactions
    addTransaction(transaction) {
        const newTxn = {
            id: 'txn-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            ref: transaction.ref || this.generateNextRef(),
            date: transaction.date || new Date().toISOString().split('T')[0],
            account: transaction.account || 'Petty Cash',
            type: transaction.type || 'Expenses',
            category: transaction.category || 'HC',
            description: transaction.description || '',
            income: parseFloat(transaction.income) || 0,
            expenses: parseFloat(transaction.expenses) || 0,
            event: transaction.event || 'General Club Admin & AGM',
            paidBy: transaction.paidBy || '',
            receipt: transaction.receipt || 'No',
            receiptUrl: transaction.receiptUrl || '',
            verified: Boolean(transaction.verified),
            status: transaction.status || 'Completed',
            notes: transaction.notes || ''
        };

        // For Transfer types, adjust income/expenses cleanly
        if (newTxn.type === 'Transfer') {
            if (newTxn.income > 0 && newTxn.expenses === 0) {
                newTxn.expenses = newTxn.income;
            }
        }

        this.transactions.unshift(newTxn);
        this.saveState();
        return newTxn;
    }

    updateTransaction(id, updatedFields) {
        const index = this.transactions.findIndex(t => t.id === id);
        if (index === -1) return null;

        this.transactions[index] = {
            ...this.transactions[index],
            ...updatedFields,
            income: updatedFields.income !== undefined ? parseFloat(updatedFields.income) || 0 : this.transactions[index].income,
            expenses: updatedFields.expenses !== undefined ? parseFloat(updatedFields.expenses) || 0 : this.transactions[index].expenses
        };

        this.saveState();
        return this.transactions[index];
    }

    deleteTransaction(id) {
        const initialLen = this.transactions.length;
        this.transactions = this.transactions.filter(t => t.id !== id);
        if (this.transactions.length !== initialLen) {
            this.saveState();
            return true;
        }
        return false;
    }

    toggleVerification(id) {
        const txn = this.transactions.find(t => t.id === id);
        if (txn) {
            txn.verified = !txn.verified;
            this.saveState();
            return txn.verified;
        }
        return false;
    }

    // Events & Budgets CRUD
    addEvent(eventData) {
        const newEvent = {
            id: 'evt-' + Date.now(),
            name: eventData.name,
            budget: parseFloat(eventData.budget) || 0,
            color: eventData.color || '#6366f1'
        };
        this.events.push(newEvent);
        this.saveState();
        return newEvent;
    }

    updateEventBudget(id, budget) {
        const evt = this.events.find(e => e.id === id);
        if (evt) {
            evt.budget = parseFloat(budget) || 0;
            this.saveState();
            return evt;
        }
        return null;
    }

    deleteEvent(id) {
        const initialLen = this.events.length;
        this.events = this.events.filter(e => e.id !== id);
        if (this.events.length !== initialLen) {
            this.saveState();
            return true;
        }
        return false;
    }

    // Settings
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveState();
    }

    // Reset to Seed Data
    resetToDefault() {
        this.transactions = [...SEED_TRANSACTIONS];
        this.events = [...DEFAULT_EVENTS];
        this.settings = { ...DEFAULT_SETTINGS };
        this.saveState();
    }

    // Replace all data from Google Sheets Sync
    syncFromRemoteData(remoteTransactions, remoteEvents) {
        if (Array.isArray(remoteTransactions) && remoteTransactions.length > 0) {
            this.transactions = remoteTransactions;
        }
        if (Array.isArray(remoteEvents) && remoteEvents.length > 0) {
            this.events = remoteEvents;
        }
        this.settings.lastSyncTime = new Date().toISOString();
        this.saveState();
    }

    // Core Metrics & Aggregations
    calculateMetrics() {
        let pettyCashIncome = 0;
        let pettyCashExpenses = 0;
        let tabungIncome = 0;
        let tabungExpenses = 0;

        let missingReceiptsCount = 0;
        let pendingClaimsCount = 0;
        let pendingUMFirstCount = 0;
        let pendingReimbursementsCount = 0;

        this.transactions.forEach(t => {
            const inc = parseFloat(t.income) || 0;
            const exp = parseFloat(t.expenses) || 0;

            if (t.account === 'Petty Cash') {
                if (t.type === 'Income') pettyCashIncome += inc;
                if (t.type === 'Expenses' || t.type === 'Transfer') pettyCashExpenses += exp;
            } else if (t.account === 'School Tabung') {
                if (t.type === 'Income') tabungIncome += inc;
                if (t.type === 'Expenses' || t.type === 'Transfer') tabungExpenses += exp;
            }

            // Receipt tracking
            if (t.receipt === 'No' || !t.receipt) {
                missingReceiptsCount++;
            }

            // Pending checks
            if (t.status === 'Pending') {
                if (t.category === 'Claiming') pendingClaimsCount++;
                if (t.category === 'UM First') pendingUMFirstCount++;
                if (t.type === 'Expenses' && t.account === 'Petty Cash') pendingReimbursementsCount++;
            }
        });

        const pettyCashBalance = pettyCashIncome - pettyCashExpenses;
        const tabungBalance = tabungIncome - tabungExpenses;
        const totalAssets = pettyCashBalance + tabungBalance;
        const totalIncome = pettyCashIncome + tabungIncome;
        const totalExpenses = pettyCashExpenses + tabungExpenses;
        const netCashFlow = totalIncome - totalExpenses;

        return {
            pettyCashBalance,
            pettyCashIncome,
            pettyCashExpenses,
            tabungBalance,
            tabungIncome,
            tabungExpenses,
            totalAssets,
            totalIncome,
            totalExpenses,
            netCashFlow,
            missingReceiptsCount,
            pendingClaimsCount,
            pendingUMFirstCount,
            pendingReimbursementsCount
        };
    }

    // Running Balance Ledgers (Ordered Chronologically)
    getLedger(accountName) {
        // Sort chronologically ascending for ledger balance computation
        const sorted = [...this.transactions]
            .filter(t => t.account === accountName)
            .sort((a, b) => new Date(a.date) - new Date(b.date) || a.ref.localeCompare(b.ref));

        let currentBalance = 0;
        return sorted.map(t => {
            const inc = parseFloat(t.income) || 0;
            const exp = parseFloat(t.expenses) || 0;

            if (t.type === 'Income') {
                currentBalance += inc;
            } else if (t.type === 'Expenses' || t.type === 'Transfer') {
                currentBalance -= exp;
            }

            return {
                ...t,
                runningBalance: currentBalance
            };
        });
    }

    // Monthly Report Aggregator
    getMonthlyBreakdown() {
        const map = {};

        this.transactions.forEach(t => {
            const dateObj = new Date(t.date);
            if (isNaN(dateObj.getTime())) return;
            const monthKey = t.date.substring(0, 7); // YYYY-MM

            if (!map[monthKey]) {
                map[monthKey] = {
                    monthKey,
                    monthLabel: dateObj.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
                    income: 0,
                    expense: 0,
                    pettyCashIncome: 0,
                    pettyCashExpense: 0,
                    tabungIncome: 0,
                    tabungExpense: 0
                };
            }

            const inc = parseFloat(t.income) || 0;
            const exp = parseFloat(t.expenses) || 0;

            if (t.type === 'Income') {
                map[monthKey].income += inc;
                if (t.account === 'Petty Cash') map[monthKey].pettyCashIncome += inc;
                if (t.account === 'School Tabung') map[monthKey].tabungIncome += inc;
            } else if (t.type === 'Expenses' || t.type === 'Transfer') {
                map[monthKey].expense += exp;
                if (t.account === 'Petty Cash') map[monthKey].pettyCashExpense += exp;
                if (t.account === 'School Tabung') map[monthKey].tabungExpense += exp;
            }
        });

        return Object.values(map).sort((a, b) => a.monthKey.localeCompare(b.monthKey)).map(m => ({
            ...m,
            net: m.income - m.expense,
            pettyNet: m.pettyCashIncome - m.pettyCashExpense,
            tabungNet: m.tabungIncome - m.tabungExpense
        }));
    }

    // Category / Department Breakdown
    getCategoryBreakdown() {
        const categories = {};
        const pettyDepartments = {
            'HC': 0,
            'EP': 0,
            'IR': 0,
            'PD': 0,
            'C&M': 0
        };
        const tabungExpenses = {
            'Claiming': 0,
            'UM First': 0
        };

        this.transactions.forEach(t => {
            const exp = parseFloat(t.expenses) || 0;
            const cat = t.category || 'Uncategorized';

            if (t.type === 'Expenses' || t.type === 'Transfer') {
                categories[cat] = (categories[cat] || 0) + exp;

                if (t.account === 'Petty Cash' && pettyDepartments[cat] !== undefined) {
                    pettyDepartments[cat] += exp;
                }

                if (t.account === 'School Tabung') {
                    if (cat.includes('Claim') || cat === 'Claiming') {
                        tabungExpenses['Claiming'] += exp;
                    } else if (cat.includes('UM First') || cat === 'UM First') {
                        tabungExpenses['UM First'] += exp;
                    }
                }
            }
        });

        return {
            allCategories: categories,
            pettyDepartments,
            tabungExpenses
        };
    }

    // Event Budget Summary
    getBudgetSummary() {
        return this.events.map(evt => {
            const eventExpenses = this.transactions
                .filter(t => t.event === evt.name && (t.type === 'Expenses' || t.type === 'Transfer'))
                .reduce((sum, t) => sum + (parseFloat(t.expenses) || 0), 0);

            const remaining = evt.budget - eventExpenses;
            const pctUsed = evt.budget > 0 ? (eventExpenses / evt.budget) * 100 : 0;

            // Conditional formatting: Green < 75%, Yellow 75% - 95%, Red > 95%
            let health = 'green'; // Safe
            if (pctUsed > 95) {
                health = 'red'; // Overbudget or critical
            } else if (pctUsed >= 75) {
                health = 'yellow'; // Attention / Warning
            }

            return {
                id: evt.id,
                name: evt.name,
                budget: evt.budget,
                actualExpense: eventExpenses,
                remaining,
                pctUsed: Math.min(Math.round(pctUsed * 10) / 10, 999),
                health,
                color: evt.color
            };
        });
    }

    // Transfer Log
    getTransferLog() {
        return this.transactions
            .filter(t => t.type === 'Transfer' || t.category.includes('Transfer') || t.category.includes('->'))
            .map(t => {
                let fromAcc = t.account;
                let toAcc = t.account === 'Petty Cash' ? 'School Tabung' : 'Petty Cash';

                if (t.category.includes('->')) {
                    const parts = t.category.split('->').map(p => p.trim());
                    fromAcc = parts[0];
                    toAcc = parts[1] || toAcc;
                }

                return {
                    id: t.id,
                    date: t.date,
                    ref: t.ref,
                    from: fromAcc,
                    to: toAcc,
                    amount: parseFloat(t.expenses) || parseFloat(t.income) || 0,
                    description: t.description,
                    status: t.status,
                    receipt: t.receipt,
                    verified: t.verified
                };
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }
}

// Global Singleton Store
window.treasuryStore = new TreasuryStore();

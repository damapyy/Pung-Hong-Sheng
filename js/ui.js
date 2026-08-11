/**
 * UI Rendering Helpers, Modals, Badges, and Toast Notification Engine
 */

class TreasuryUIManager {
    constructor(store) {
        this.store = store;
        this.activeModal = null;
    }

    formatCurrency(amount, customCurrency) {
        const curr = customCurrency || this.store.settings.currency || 'RM';
        const num = parseFloat(amount) || 0;
        return `${curr} ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    formatDate(dateStr) {
        if (!dateStr) return '-';
        try {
            const [y, m, d] = dateStr.split('-');
            if (y && m && d) {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
            }
            return dateStr;
        } catch (e) {
            return dateStr;
        }
    }

    getStatusBadge(status) {
        const s = (status || 'Completed').toLowerCase();
        if (s === 'completed') {
            return `<span class="badge badge-success"><i class="icon-check"></i> Completed</span>`;
        } else if (s === 'pending') {
            return `<span class="badge badge-warning"><i class="icon-clock"></i> Pending</span>`;
        } else if (s === 'cancelled') {
            return `<span class="badge badge-danger"><i class="icon-x"></i> Cancelled</span>`;
        }
        return `<span class="badge badge-secondary">${status}</span>`;
    }

    getAccountBadge(account) {
        if (account === 'Petty Cash') {
            return `<span class="badge badge-petty"><i class="icon-wallet"></i> Petty Cash</span>`;
        } else if (account === 'School Tabung') {
            return `<span class="badge badge-tabung"><i class="icon-building"></i> School Tabung</span>`;
        }
        return `<span class="badge badge-secondary">${account}</span>`;
    }

    getTypeBadge(type) {
        if (type === 'Income') {
            return `<span class="badge badge-income"><i class="icon-arrow-down-left"></i> Income</span>`;
        } else if (type === 'Expenses') {
            return `<span class="badge badge-expense"><i class="icon-arrow-up-right"></i> Expense</span>`;
        } else if (type === 'Transfer') {
            return `<span class="badge badge-transfer"><i class="icon-repeat"></i> Transfer</span>`;
        }
        return `<span class="badge badge-secondary">${type}</span>`;
    }

    getCategoryBadge(category, account) {
        const cat = category || 'General';
        let cls = 'badge-cat-general';
        
        // 5 Petty Cash Departments
        if (cat === 'HC') cls = 'badge-cat-hc';
        else if (cat === 'EP') cls = 'badge-cat-ep';
        else if (cat === 'IR') cls = 'badge-cat-ir';
        else if (cat === 'PD') cls = 'badge-cat-pd';
        else if (cat === 'C&M') cls = 'badge-cat-cm';
        
        // School Tabung
        else if (cat.includes('Claim') || cat === 'Claiming') cls = 'badge-cat-claim';
        else if (cat.includes('UM First') || cat === 'UM First') cls = 'badge-cat-umfirst';
        else if (cat.includes('Faculty') || cat === 'Faculty Subsidy') cls = 'badge-cat-faculty';
        else if (cat.includes('Sponsor') || cat === 'Sponsorship') cls = 'badge-cat-sponsor';
        else if (cat.includes('Participant') || cat === 'Participant Fees') cls = 'badge-cat-fees';

        return `<span class="badge ${cls}">${cat}</span>`;
    }

    getReceiptBadge(hasReceipt, isVerified, txnId) {
        const has = hasReceipt === 'Yes' || hasReceipt === true;
        const verified = isVerified === true;

        if (has && verified) {
            return `<span class="badge badge-receipt-verified" title="Receipt uploaded & verified by Treasurer" onclick="window.treasuryUI.openReceiptModal('${txnId}')">
                <i class="icon-check-circle"></i> Verified
            </span>`;
        } else if (has && !verified) {
            return `<span class="badge badge-receipt-uploaded" title="Receipt uploaded, awaiting Treasurer verification" onclick="window.treasuryUI.openReceiptModal('${txnId}')">
                <i class="icon-file-text"></i> Attached (Pending)
            </span>`;
        } else {
            return `<span class="badge badge-receipt-missing" title="Missing Receipt! Click to attach" onclick="window.treasuryUI.openReceiptModal('${txnId}')">
                <i class="icon-alert-triangle"></i> MISSING
            </span>`;
        }
    }

    showToast(message, type = 'success', duration = 3500) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type} animate-slide-in`;
        
        let icon = '✓';
        if (type === 'error') icon = '✕';
        if (type === 'warning') icon = '⚠';
        if (type === 'info') icon = 'ℹ';

        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-message">${message}</div>
            <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 400);
        }, duration);
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            this.activeModal = modalId;
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modalId) {
        const id = modalId || this.activeModal;
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.remove('active');
            this.activeModal = null;
            document.body.style.overflow = '';
        }
    }

    // Modal: Add / Edit Transaction
    openTransactionModal(txnId = null) {
        const state = this.store.getState();
        const modal = document.getElementById('modal-transaction');
        const form = document.getElementById('form-transaction');
        const titleEl = document.getElementById('modal-transaction-title');
        
        if (!modal || !form) return;

        form.reset();
        
        // Populate Event options dynamically
        const eventSelect = document.getElementById('txn-event');
        if (eventSelect) {
            eventSelect.innerHTML = state.events.map(e => `<option value="${e.name}">${e.name}</option>`).join('');
            eventSelect.innerHTML += `<option value="General Club Admin & AGM">General Club Admin & AGM</option>`;
            eventSelect.innerHTML += `<option value="Other / Non-Event">Other / Non-Event</option>`;
        }

        if (txnId) {
            const txn = state.transactions.find(t => t.id === txnId);
            if (txn) {
                titleEl.textContent = 'Edit Transaction (' + txn.ref + ')';
                document.getElementById('txn-id').value = txn.id;
                document.getElementById('txn-ref').value = txn.ref;
                document.getElementById('txn-date').value = txn.date;
                document.getElementById('txn-account').value = txn.account;
                document.getElementById('txn-type').value = txn.type;
                this.updateCategoryDropdown(txn.account, txn.type);
                document.getElementById('txn-category').value = txn.category;
                document.getElementById('txn-desc').value = txn.description;
                document.getElementById('txn-income').value = txn.income > 0 ? txn.income : '';
                document.getElementById('txn-expenses').value = txn.expenses > 0 ? txn.expenses : '';
                document.getElementById('txn-event').value = txn.event;
                document.getElementById('txn-paidby').value = txn.paidBy;
                document.getElementById('txn-receipt').value = txn.receipt;
                document.getElementById('txn-receipt-url').value = txn.receiptUrl || '';
                document.getElementById('txn-verified').checked = txn.verified;
                document.getElementById('txn-status').value = txn.status;
                document.getElementById('txn-notes').value = txn.notes || '';
            }
        } else {
            titleEl.textContent = 'Add New Transaction';
            document.getElementById('txn-id').value = '';
            document.getElementById('txn-ref').value = this.store.generateNextRef();
            document.getElementById('txn-date').value = new Date().toISOString().split('T')[0];
            document.getElementById('txn-account').value = 'Petty Cash';
            document.getElementById('txn-type').value = 'Expenses';
            this.updateCategoryDropdown('Petty Cash', 'Expenses');
            document.getElementById('txn-receipt').value = 'No';
            document.getElementById('txn-verified').checked = false;
            document.getElementById('txn-status').value = 'Completed';
        }

        this.toggleAmountFields();
        this.openModal('modal-transaction');
    }

    updateCategoryDropdown(account, type) {
        const catSelect = document.getElementById('txn-category');
        if (!catSelect) return;

        let options = [];
        if (type === 'Transfer') {
            options = [
                { val: 'Petty Cash -> Tabung', label: 'Transfer: Petty Cash ➔ School Tabung' },
                { val: 'Tabung -> Petty Cash', label: 'Transfer: School Tabung ➔ Petty Cash' }
            ];
        } else if (account === 'Petty Cash') {
            if (type === 'Income') {
                options = [
                    { val: 'Sponsorship', label: 'Sponsorship (Corporate / External)' },
                    { val: 'Participant Fees', label: 'Participant Fees (Tickets / Registration)' },
                    { val: 'Merchandise Sale', label: 'Club Merchandise & Sales' },
                    { val: 'Other Income', label: 'Other Miscellaneous Income' }
                ];
            } else {
                // 5 Departments Expenses: HC, EP, IR, PD, C&M
                options = [
                    { val: 'HC', label: 'HC - High Committee' },
                    { val: 'EP', label: 'EP - Events & Projects' },
                    { val: 'IR', label: 'IR - Industrial Relations' },
                    { val: 'PD', label: 'PD - Partnership Development' },
                    { val: 'C&M', label: 'C&M - Content and Marketing' }
                ];
            }
        } else if (account === 'School Tabung') {
            if (type === 'Income') {
                options = [
                    { val: 'Faculty Subsidy', label: 'Faculty Subsidy / University Grant' },
                    { val: 'Sponsorship', label: 'Official Institutional Sponsorship' }
                ];
            } else {
                options = [
                    { val: 'Claiming', label: 'Claiming / Official Reimbursement' },
                    { val: 'UM First', label: 'UM First (Internal Portal System)' }
                ];
            }
        }

        catSelect.innerHTML = options.map(o => `<option value="${o.val}">${o.label}</option>`).join('');
    }

    toggleAmountFields() {
        const type = document.getElementById('txn-type').value;
        const incomeGroup = document.getElementById('group-income');
        const expenseGroup = document.getElementById('group-expenses');
        
        if (type === 'Income') {
            if (incomeGroup) incomeGroup.style.display = 'block';
            if (expenseGroup) expenseGroup.style.display = 'none';
        } else if (type === 'Expenses') {
            if (incomeGroup) incomeGroup.style.display = 'none';
            if (expenseGroup) expenseGroup.style.display = 'block';
        } else if (type === 'Transfer') {
            if (incomeGroup) incomeGroup.style.display = 'none';
            if (expenseGroup) expenseGroup.style.display = 'block';
            const expLabel = expenseGroup.querySelector('label');
            if (expLabel) expLabel.textContent = 'Transfer Amount (' + this.store.settings.currency + ') *';
        }
    }

    // Modal: Receipt Viewer & Verifier
    openReceiptModal(txnId) {
        const txn = this.store.transactions.find(t => t.id === txnId);
        if (!txn) return;

        const modal = document.getElementById('modal-receipt');
        if (!modal) return;

        document.getElementById('receipt-modal-ref').textContent = txn.ref;
        document.getElementById('receipt-modal-desc').textContent = txn.description;
        document.getElementById('receipt-modal-amount').textContent = this.formatCurrency(txn.expenses || txn.income);
        document.getElementById('receipt-modal-vendor').textContent = txn.paidBy || 'Not specified';
        document.getElementById('receipt-modal-event').textContent = txn.event;
        document.getElementById('receipt-modal-date').textContent = this.formatDate(txn.date);

        const imgContainer = document.getElementById('receipt-modal-image-container');
        const uploadBox = document.getElementById('receipt-modal-upload-box');
        const verifyBtn = document.getElementById('btn-receipt-verify-toggle');

        if (txn.receipt === 'Yes' && txn.receiptUrl) {
            imgContainer.innerHTML = `<img src="${txn.receiptUrl}" alt="Receipt Document" class="receipt-preview-img" onerror="this.src='https://via.placeholder.com/600x400?text=Receipt+Image+Unavailable'">`;
            imgContainer.style.display = 'block';
            uploadBox.style.display = 'none';
        } else {
            imgContainer.style.display = 'none';
            uploadBox.style.display = 'block';
        }

        // Verify button state
        if (verifyBtn) {
            verifyBtn.innerHTML = txn.verified ? 
                '<i class="icon-x-circle"></i> Unmark Verified' : 
                '<i class="icon-check-circle"></i> Verify as Treasurer';
            verifyBtn.className = txn.verified ? 'btn btn-secondary' : 'btn btn-success';
            verifyBtn.onclick = () => {
                const newVerified = this.store.toggleVerification(txn.id);
                this.showToast(newVerified ? 'Receipt marked as Verified by Treasurer!' : 'Verification removed.', newVerified ? 'success' : 'info');
                this.closeModal('modal-receipt');
                window.treasuryApp.renderCurrentPage();
            };
        }

        document.getElementById('receipt-modal-txn-id').value = txn.id;
        this.openModal('modal-receipt');
    }

    // Modal: Google Sheets Sync Guide & Connect
    openSyncModal() {
        const state = this.store.getState();
        const urlInput = document.getElementById('sync-apps-script-url');
        const autoCheck = document.getElementById('sync-auto-toggle');
        if (urlInput) {
            urlInput.value = state.settings.googleAppsScriptUrl || '';
        }
        if (autoCheck) {
            autoCheck.checked = state.settings.autoSync !== false;
        }
        this.openModal('modal-sync');
    }

    // Modal: Budget / Event Manager
    openBudgetModal(eventId = null) {
        const state = this.store.getState();
        const form = document.getElementById('form-budget-event');
        const titleEl = document.getElementById('modal-budget-title');
        
        if (!form) return;
        form.reset();

        if (eventId) {
            const evt = state.events.find(e => e.id === eventId);
            if (evt) {
                titleEl.textContent = 'Edit Event Budget';
                document.getElementById('evt-id').value = evt.id;
                document.getElementById('evt-name').value = evt.name;
                document.getElementById('evt-budget').value = evt.budget;
            }
        } else {
            titleEl.textContent = 'Create New Event Budget';
            document.getElementById('evt-id').value = '';
        }

        this.openModal('modal-budget');
    }
}

window.treasuryUI = new TreasuryUIManager(window.treasuryStore);

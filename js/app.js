/**
 * Application Main Controller & 9 Pages Router
 */

class TreasuryApplication {
    constructor() {
        this.currentPage = 'dashboard';
        this.tableFilters = {
            search: '',
            account: 'all',
            type: 'all',
            category: 'all',
            status: 'all',
            receipt: 'all',
            page: 1,
            pageSize: 15
        };
        this.receiptFilter = 'all'; // all, missing, pending, verified
    }

    init() {
        // Subscribe to store updates
        window.treasuryStore.subscribe((state) => {
            this.updateHeaderMetrics(state);
            this.renderCurrentPage();
        });

        this.bindGlobalEvents();
        this.setupRouting();
        this.updateHeaderMetrics(window.treasuryStore.getState());
        this.navigateTo('dashboard');
    }

    bindGlobalEvents() {
        // Navigation links
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.getAttribute('data-page');
                if (page) this.navigateTo(page);
            });
        });

        // Theme toggle
        const themeBtn = document.getElementById('btn-toggle-theme');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                const isDark = document.body.classList.toggle('dark-theme');
                document.body.classList.toggle('light-theme', !isDark);
                themeBtn.innerHTML = isDark ? '<i class="icon-sun"></i> Light Mode' : '<i class="icon-moon"></i> Dark Mode';
                window.treasuryStore.updateSettings({ theme: isDark ? 'dark' : 'light' });
                window.treasuryCharts.destroyAll();
                this.renderCurrentPage();
            });
        }

        // Add Transaction Button (Global Header)
        const btnAddTxn = document.getElementById('btn-global-add-txn');
        if (btnAddTxn) {
            btnAddTxn.addEventListener('click', () => {
                window.treasuryUI.openTransactionModal();
            });
        }

        // Google Sheets Sync Button
        const btnSync = document.getElementById('btn-global-sync');
        if (btnSync) {
            btnSync.addEventListener('click', () => {
                window.treasuryUI.openSyncModal();
            });
        }

        // Quick Sync Now (Push)
        const btnQuickSync = document.getElementById('btn-quick-sync-push');
        if (btnQuickSync) {
            btnQuickSync.addEventListener('click', async () => {
                btnQuickSync.classList.add('loading');
                btnQuickSync.innerHTML = '<i class="icon-refresh spin"></i> Syncing...';
                try {
                    const res = await window.googleSheetsSyncEngine.pushToSheets();
                    window.treasuryUI.showToast(res.message || 'Synced to Google Sheets!', res.success ? 'success' : 'warning');
                } catch (e) {
                    window.treasuryUI.showToast('Sync error: ' + e.message, 'error');
                } finally {
                    btnQuickSync.classList.remove('loading');
                    btnQuickSync.innerHTML = '<i class="icon-cloud-upload"></i> Sync Sheets';
                }
            });
        }

        // Transaction Form Submit
        const formTxn = document.getElementById('form-transaction');
        if (formTxn) {
            formTxn.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSaveTransaction();
            });
        }

        // Budget Event Form Submit
        const formBudget = document.getElementById('form-budget-event');
        if (formBudget) {
            formBudget.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSaveBudget();
            });
        }

        // Account & Type changes in Transaction Modal
        const accSelect = document.getElementById('txn-account');
        const typeSelect = document.getElementById('txn-type');
        if (accSelect && typeSelect) {
            const updateCats = () => {
                window.treasuryUI.updateCategoryDropdown(accSelect.value, typeSelect.value);
                window.treasuryUI.toggleAmountFields();
            };
            accSelect.addEventListener('change', updateCats);
            typeSelect.addEventListener('change', updateCats);
        }

        // Google Sheets URL Save & Test Form
        const btnSaveSync = document.getElementById('btn-save-sync-settings');
        if (btnSaveSync) {
            btnSaveSync.addEventListener('click', async () => {
                const url = document.getElementById('sync-apps-script-url').value.trim();
                const auto = document.getElementById('sync-auto-toggle').checked;
                window.treasuryStore.updateSettings({ googleAppsScriptUrl: url, autoSync: auto });
                
                if (url) {
                    window.treasuryUI.showToast('Testing Google Apps Script endpoint...', 'info');
                    const testRes = await window.googleSheetsSyncEngine.testConnection(url);
                    window.treasuryUI.showToast(testRes.message, testRes.success ? 'success' : 'warning');
                } else {
                    window.treasuryUI.showToast('Settings saved in Local Storage.', 'success');
                }
                window.treasuryUI.closeModal('modal-sync');
            });
        }

        // Pull from Google Sheets Button
        const btnPull = document.getElementById('btn-pull-from-sheets');
        if (btnPull) {
            btnPull.addEventListener('click', async () => {
                try {
                    btnPull.disabled = true;
                    btnPull.innerHTML = '<i class="icon-refresh spin"></i> Loading...';
                    const res = await window.googleSheetsSyncEngine.pullFromSheets();
                    window.treasuryUI.showToast(`Loaded ${res.count} transactions from Google Sheets!`, 'success');
                    window.treasuryUI.closeModal('modal-sync');
                } catch (e) {
                    window.treasuryUI.showToast('Pull failed: ' + e.message, 'error');
                } finally {
                    btnPull.disabled = false;
                    btnPull.innerHTML = '<i class="icon-cloud-download"></i> Pull from Google Sheets';
                }
            });
        }

        // Copy Apps Script Code Button
        const btnCopyCode = document.getElementById('btn-copy-apps-script');
        if (btnCopyCode) {
            btnCopyCode.addEventListener('click', async () => {
                const codeBlock = document.getElementById('apps-script-code-block');
                if (codeBlock) {
                    try {
                        await navigator.clipboard.writeText(codeBlock.innerText);
                        btnCopyCode.innerHTML = '<i class="icon-check"></i> Copied to Clipboard!';
                        setTimeout(() => {
                            btnCopyCode.innerHTML = '<i class="icon-copy"></i> Copy Code.gs Script';
                        }, 2500);
                        window.treasuryUI.showToast('Code.gs copied! Paste it in Google Sheets Extensions > Apps Script.', 'success');
                    } catch (err) {
                        window.treasuryUI.showToast('Failed to copy. Please select and copy manually.', 'error');
                    }
                }
            });
        }

        // Close modal buttons
        document.querySelectorAll('.modal-close, .btn-modal-cancel').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal-overlay');
                if (modal) modal.classList.remove('active');
            });
        });
    }

    setupRouting() {
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.replace('#', '') || 'dashboard';
            this.navigateTo(hash, false);
        });
    }

    navigateTo(pageName, updateHash = true) {
        this.currentPage = pageName;
        if (updateHash) {
            window.location.hash = pageName;
        }

        // Update active class on nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            const isMatch = item.getAttribute('data-page') === pageName;
            item.classList.toggle('active', isMatch);
        });

        // Hide all page containers and show the target
        document.querySelectorAll('.page-view').forEach(view => {
            view.style.display = 'none';
        });

        const targetView = document.getElementById(`page-${pageName}`);
        if (targetView) {
            targetView.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        this.renderCurrentPage();
    }

    updateHeaderMetrics(state) {
        const m = state.metrics;
        const pettyEl = document.getElementById('header-petty-balance');
        const tabungEl = document.getElementById('header-tabung-balance');
        const totalEl = document.getElementById('header-total-balance');

        if (pettyEl) pettyEl.textContent = window.treasuryUI.formatCurrency(m.pettyCashBalance);
        if (tabungEl) tabungEl.textContent = window.treasuryUI.formatCurrency(m.tabungBalance);
        if (totalEl) totalEl.textContent = window.treasuryUI.formatCurrency(m.totalAssets);
    }

    renderCurrentPage() {
        switch (this.currentPage) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'transactions':
                this.renderTransactions();
                break;
            case 'petty-cash':
                this.renderPettyCashLedger();
                break;
            case 'school-tabung':
                this.renderSchoolTabungLedger();
                break;
            case 'transfers':
                this.renderTransferLog();
                break;
            case 'budget-tracker':
                this.renderBudgetTracker();
                break;
            case 'monthly-report':
                this.renderMonthlyReport();
                break;
            case 'category-summary':
                this.renderCategorySummary();
                break;
            case 'receipt-tracker':
                this.renderReceiptTracker();
                break;
            default:
                this.renderDashboard();
        }
    }

    // ==========================================
    // PAGE 1: DASHBOARD
    // ==========================================
    renderDashboard() {
        const state = window.treasuryStore.getState();
        const m = state.metrics;
        const monthly = window.treasuryStore.getMonthlyBreakdown();
        const budgets = window.treasuryStore.getBudgetSummary();

        // 1. Overview Metric Cards
        const cardPetty = document.getElementById('dash-petty-balance');
        const cardTabung = document.getElementById('dash-tabung-balance');
        const cardTotal = document.getElementById('dash-total-assets');
        const cardNet = document.getElementById('dash-net-cashflow');

        if (cardPetty) cardPetty.textContent = window.treasuryUI.formatCurrency(m.pettyCashBalance);
        if (cardTabung) cardTabung.textContent = window.treasuryUI.formatCurrency(m.tabungBalance);
        if (cardTotal) cardTotal.textContent = window.treasuryUI.formatCurrency(m.totalAssets);
        if (cardNet) {
            cardNet.textContent = window.treasuryUI.formatCurrency(m.netCashFlow);
            cardNet.className = m.netCashFlow >= 0 ? 'metric-val text-success' : 'metric-val text-danger';
        }

        // Sub-metrics
        const pettyIn = document.getElementById('dash-petty-inflow');
        const pettyOut = document.getElementById('dash-petty-outflow');
        const tabungIn = document.getElementById('dash-tabung-inflow');
        const tabungOut = document.getElementById('dash-tabung-outflow');
        if (pettyIn) pettyIn.textContent = `In: ${window.treasuryUI.formatCurrency(m.pettyCashIncome)}`;
        if (pettyOut) pettyOut.textContent = `Out: ${window.treasuryUI.formatCurrency(m.pettyCashExpenses)}`;
        if (tabungIn) tabungIn.textContent = `In: ${window.treasuryUI.formatCurrency(m.tabungIncome)}`;
        if (tabungOut) tabungOut.textContent = `Out: ${window.treasuryUI.formatCurrency(m.tabungExpenses)}`;

        // 2. Pending Items Alerts
        const pendingContainer = document.getElementById('dash-pending-grid');
        if (pendingContainer) {
            pendingContainer.innerHTML = `
                <div class="pending-item-card ${m.missingReceiptsCount > 0 ? 'alert-critical' : 'alert-ok'}" onclick="window.treasuryApp.navigateTo('receipt-tracker')">
                    <div class="pending-icon badge-icon-receipt">🧾</div>
                    <div class="pending-info">
                        <div class="pending-label">Missing Receipts</div>
                        <div class="pending-num">${m.missingReceiptsCount} Transactions</div>
                        <div class="pending-subtext">${m.missingReceiptsCount > 0 ? 'Requires vendor invoice attachment' : 'All receipts verified'}</div>
                    </div>
                </div>
                <div class="pending-item-card ${m.pendingClaimsCount > 0 ? 'alert-warning' : 'alert-ok'}" onclick="window.treasuryApp.navigateTo('school-tabung')">
                    <div class="pending-icon badge-icon-claims">🏛️</div>
                    <div class="pending-info">
                        <div class="pending-label">School Tabung Claims</div>
                        <div class="pending-num">${m.pendingClaimsCount} In Progress</div>
                        <div class="pending-subtext">${m.pendingClaimsCount > 0 ? 'Waiting for Bursary cheque release' : 'No pending bursary claims'}</div>
                    </div>
                </div>
                <div class="pending-item-card ${m.pendingUMFirstCount > 0 ? 'alert-warning' : 'alert-ok'}" onclick="window.treasuryApp.navigateTo('school-tabung')">
                    <div class="pending-icon badge-icon-umfirst">💻</div>
                    <div class="pending-info">
                        <div class="pending-label">UM First Deductions</div>
                        <div class="pending-num">${m.pendingUMFirstCount} Pending</div>
                        <div class="pending-subtext">${m.pendingUMFirstCount > 0 ? 'Portal verification in progress' : 'No pending portal deductions'}</div>
                    </div>
                </div>
                <div class="pending-item-card ${m.pendingReimbursementsCount > 0 ? 'alert-warning' : 'alert-ok'}" onclick="window.treasuryApp.navigateTo('petty-cash')">
                    <div class="pending-icon badge-icon-reimburse">👥</div>
                    <div class="pending-info">
                        <div class="pending-label">Committee Reimbursements</div>
                        <div class="pending-num">${m.pendingReimbursementsCount} Pending</div>
                        <div class="pending-subtext">${m.pendingReimbursementsCount > 0 ? 'Petty cash claims awaiting payout' : 'No pending committee claims'}</div>
                    </div>
                </div>
            `;
        }

        // 3. Monthly Cash Flow Summary Table
        const monthlyTableBody = document.getElementById('dash-monthly-tbody');
        if (monthlyTableBody) {
            if (monthly.length === 0) {
                monthlyTableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center py-4 text-muted">
                            No monthly records yet. Click '+ Add Transaction' to start recording cash flow.
                        </td>
                    </tr>
                `;
            } else {
                monthlyTableBody.innerHTML = monthly.map(m => `
                    <tr>
                        <td class="fw-bold">${m.monthLabel}</td>
                        <td class="text-success">${window.treasuryUI.formatCurrency(m.income)}</td>
                        <td class="text-danger">${window.treasuryUI.formatCurrency(m.expense)}</td>
                        <td class="${m.net >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}">
                            ${m.net >= 0 ? '+' : ''}${window.treasuryUI.formatCurrency(m.net)}
                        </td>
                        <td>
                            <span class="badge ${m.net >= 0 ? 'badge-success' : 'badge-danger'}">
                                ${m.net >= 0 ? 'Surplus' : 'Deficit'}
                            </span>
                        </td>
                    </tr>
                `).join('');
            }
        }

        // 4. Event Budget Health Preview (with Green / Yellow / Red conditional formatting)
        const budgetGrid = document.getElementById('dash-budget-grid');
        if (budgetGrid) {
            if (budgets.length === 0) {
                budgetGrid.innerHTML = `
                    <div class="text-muted p-4 text-center w-100" style="grid-column: 1 / -1; background: rgba(255,255,255,0.02); border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
                        <p style="margin-bottom: 10px; font-size: 0.88rem;">No event budgets created yet.</p>
                        <button class="btn btn-secondary btn-sm" onclick="window.treasuryUI.openBudgetModal()">+ Create Event Budget</button>
                    </div>
                `;
            } else {
                budgetGrid.innerHTML = budgets.map(b => {
                    let badgeClass = 'badge-budget-green';
                    let barClass = 'progress-bar-green';
                    let statusText = 'Healthy (<75%)';

                    if (b.health === 'red') {
                        badgeClass = 'badge-budget-red';
                        barClass = 'progress-bar-red';
                        statusText = 'Critical (>95%)';
                    } else if (b.health === 'yellow') {
                        badgeClass = 'badge-budget-yellow';
                        barClass = 'progress-bar-yellow';
                        statusText = 'Attention (75-95%)';
                    }

                    return `
                        <div class="dash-budget-card border-${b.health}">
                            <div class="budget-card-header">
                                <span class="event-name-title">${b.name}</span>
                                <span class="badge ${badgeClass}">${statusText}</span>
                            </div>
                            <div class="budget-card-figures">
                                <div>
                                    <span class="fig-label">Budget:</span>
                                    <span class="fig-val">${window.treasuryUI.formatCurrency(b.budget)}</span>
                                </div>
                                <div>
                                    <span class="fig-label">Used:</span>
                                    <span class="fig-val text-danger">${window.treasuryUI.formatCurrency(b.actualExpense)}</span>
                                </div>
                                <div>
                                    <span class="fig-label">Remaining:</span>
                                    <span class="fig-val ${b.remaining >= 0 ? 'text-success' : 'text-danger'} fw-bold">
                                        ${window.treasuryUI.formatCurrency(b.remaining)}
                                    </span>
                                </div>
                            </div>
                            <div class="progress-track">
                                <div class="progress-bar ${barClass}" style="width: ${Math.min(b.pctUsed, 100)}%"></div>
                            </div>
                            <div class="budget-card-footer">
                                <span>${b.pctUsed}% utilized</span>
                                <a href="#budget-tracker" onclick="window.treasuryApp.navigateTo('budget-tracker')" class="link-small">View Breakdown &rarr;</a>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }

        // Initialize Charts
        window.treasuryCharts.initDashboardCharts();
    }

    // =======================================================
    // PAGE 2: TRANSACTIONS (THE ONLY MANUAL DATA ENTRY PAGE)
    // =======================================================
    renderTransactions() {
        const state = window.treasuryStore.getState();
        const searchInput = document.getElementById('table-search-input');
        const filterAcc = document.getElementById('filter-account-select');
        const filterType = document.getElementById('filter-type-select');
        const filterStatus = document.getElementById('filter-status-select');
        const filterReceipt = document.getElementById('filter-receipt-select');

        // Apply filters
        let filtered = [...state.transactions];

        const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : '';
        if (searchVal) {
            filtered = filtered.filter(t => 
                (t.ref && t.ref.toLowerCase().includes(searchVal)) ||
                (t.description && t.description.toLowerCase().includes(searchVal)) ||
                (t.paidBy && t.paidBy.toLowerCase().includes(searchVal)) ||
                (t.category && t.category.toLowerCase().includes(searchVal)) ||
                (t.event && t.event.toLowerCase().includes(searchVal))
            );
        }

        if (filterAcc && filterAcc.value !== 'all') {
            filtered = filtered.filter(t => t.account === filterAcc.value);
        }
        if (filterType && filterType.value !== 'all') {
            filtered = filtered.filter(t => t.type === filterType.value);
        }
        if (filterStatus && filterStatus.value !== 'all') {
            filtered = filtered.filter(t => t.status === filterStatus.value);
        }
        if (filterReceipt && filterReceipt.value !== 'all') {
            filtered = filtered.filter(t => t.receipt === filterReceipt.value);
        }

        // Render Table Body
        const tbody = document.getElementById('transactions-table-tbody');
        const countEl = document.getElementById('transactions-count-label');
        if (countEl) countEl.textContent = `Showing ${filtered.length} of ${state.transactions.length} records`;

        if (tbody) {
            if (filtered.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="12" class="text-center py-5 text-muted">
                            <div class="empty-state">
                                <i class="icon-inbox text-muted" style="font-size: 2rem;"></i>
                                <p class="mt-2">No matching transactions found.</p>
                                <button class="btn btn-primary btn-sm mt-2" onclick="window.treasuryUI.openTransactionModal()">
                                    <i class="icon-plus"></i> + Add Transaction
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            } else {
                tbody.innerHTML = filtered.map(t => `
                    <tr id="row-${t.id}" onclick="window.treasuryUI.openTransactionModal('${t.id}')" title="Click to edit transaction ${t.ref}">
                        <td>
                            <div class="font-mono fw-bold" style="color: var(--text-primary); font-size: 0.88rem;">${t.ref}</div>
                            <small class="font-mono text-muted" style="font-size: 0.75rem;">${window.treasuryUI.formatDate(t.date)}</small>
                        </td>
                        <td>${window.treasuryUI.getAccountBadge(t.account)}</td>
                        <td>${window.treasuryUI.getTypeBadge(t.type)}</td>
                        <td>${window.treasuryUI.getCategoryBadge(t.category, t.account)}</td>
                        <td class="desc-cell" title="${t.description}">
                            <div class="desc-text">${t.description}</div>
                            ${t.notes ? `<small class="text-muted"><i class="icon-message-square"></i> ${t.notes}</small>` : ''}
                        </td>
                        <td class="text-success font-mono fw-bold text-end">
                            ${t.income > 0 ? window.treasuryUI.formatCurrency(t.income) : '-'}
                        </td>
                        <td class="text-danger font-mono fw-bold text-end">
                            ${t.expenses > 0 ? window.treasuryUI.formatCurrency(t.expenses) : '-'}
                        </td>
                        <td><span class="badge badge-event">${t.event}</span></td>
                        <td>${t.paidBy || '<span class="text-muted">-</span>'}</td>
                        <td class="text-center" onclick="event.stopPropagation();">
                            ${window.treasuryUI.getReceiptBadge(t.receipt, t.verified, t.id)}
                        </td>
                        <td class="text-center">
                            ${window.treasuryUI.getStatusBadge(t.status)}
                        </td>
                        <td class="sticky-actions-col text-end" onclick="event.stopPropagation();">
                            <div class="table-actions d-flex gap-1 justify-content-end">
                                <button class="btn-icon" title="Edit Transaction" onclick="window.treasuryUI.openTransactionModal('${t.id}')">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                </button>
                                <button class="btn-icon btn-icon-danger" title="Delete Transaction" onclick="window.treasuryApp.handleDeleteTransaction('${t.id}')">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('');
            }
        }
    }

    scrollTable(containerId, offset) {
        const el = document.getElementById(containerId);
        if (el) {
            el.scrollBy({ left: offset, behavior: 'smooth' });
        }
    }

    // ==========================================
    // PAGE 3: PETTY CASH LEDGER
    // ==========================================
    renderPettyCashLedger() {
        const ledger = window.treasuryStore.getLedger('Petty Cash');
        const state = window.treasuryStore.getState();
        const breakdown = window.treasuryStore.getCategoryBreakdown();
        const depts = breakdown.pettyDepartments;

        // Metric summary
        const balEl = document.getElementById('petty-ledger-balance');
        const inEl = document.getElementById('petty-ledger-income');
        const outEl = document.getElementById('petty-ledger-expense');
        if (balEl) balEl.textContent = window.treasuryUI.formatCurrency(state.metrics.pettyCashBalance);
        if (inEl) inEl.textContent = window.treasuryUI.formatCurrency(state.metrics.pettyCashIncome);
        if (outEl) outEl.textContent = window.treasuryUI.formatCurrency(state.metrics.pettyCashExpenses);

        // 5 Departments Expense Breakdown Cards (HC, EP, IR, PD, C&M)
        const deptCardsContainer = document.getElementById('petty-departments-grid');
        if (deptCardsContainer) {
            const deptMeta = [
                { key: 'HC', title: 'HC - High Committee', desc: 'Leadership, administrative, and committee welfare', color: '#6366f1' },
                { key: 'EP', title: 'EP - Events & Projects', desc: 'Logistics, venues, audio equipment, catering', color: '#ec4899' },
                { key: 'IR', title: 'IR - Industrial Relations', desc: 'Industry partner gifts, protocol, liaisons', color: '#06b6d4' },
                { key: 'PD', title: 'PD - Partnership Development', desc: 'Sponsorship acquisition, guest honorariums', color: '#f59e0b' },
                { key: 'C&M', title: 'C&M - Content and Marketing', desc: 'Promotional banners, social ads, merch', color: '#10b981' }
            ];

            const totalPettyExp = state.metrics.pettyCashExpenses || 1;

            deptCardsContainer.innerHTML = deptMeta.map(d => {
                const spent = depts[d.key] || 0;
                const pct = ((spent / totalPettyExp) * 100).toFixed(1);
                return `
                    <div class="dept-stat-card" style="border-top: 3px solid ${d.color};">
                        <div class="dept-code" style="color: ${d.color};">${d.key}</div>
                        <div class="dept-title">${d.title}</div>
                        <div class="dept-spent">${window.treasuryUI.formatCurrency(spent)}</div>
                        <div class="dept-desc">${d.desc}</div>
                        <div class="progress-track mt-2">
                            <div class="progress-bar" style="width: ${pct}%; background-color: ${d.color};"></div>
                        </div>
                        <small class="text-muted mt-1 d-block">${pct}% of petty cash expenses</small>
                    </div>
                `;
            }).join('');
        }

        // Ledger Table
        const tbody = document.getElementById('petty-ledger-tbody');
        if (tbody) {
            if (ledger.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center py-4 text-muted">
                            No Petty Cash transactions recorded yet. Click '+ Add Transaction' to record petty cash.
                        </td>
                    </tr>
                `;
            } else {
                tbody.innerHTML = ledger.map(t => `
                    <tr onclick="window.treasuryUI.openTransactionModal('${t.id}')" title="Click to view/edit ${t.ref}">
                        <td class="font-mono text-muted">${window.treasuryUI.formatDate(t.date)}</td>
                        <td class="font-mono fw-bold">${t.ref}</td>
                        <td>${window.treasuryUI.getCategoryBadge(t.category, 'Petty Cash')}</td>
                        <td class="desc-cell">${t.description}</td>
                        <td class="text-success font-mono text-end fw-bold">
                            ${t.income > 0 ? window.treasuryUI.formatCurrency(t.income) : '-'}
                        </td>
                        <td class="text-danger font-mono text-end fw-bold">
                            ${t.expenses > 0 ? window.treasuryUI.formatCurrency(t.expenses) : '-'}
                        </td>
                        <td class="font-mono text-end fw-bold text-petty">
                            ${window.treasuryUI.formatCurrency(t.runningBalance)}
                        </td>
                        <td class="text-center">${window.treasuryUI.getStatusBadge(t.status)}</td>
                    </tr>
                `).join('');
            }
        }
    }

    // ==========================================
    // PAGE 4: SCHOOL TABUNG LEDGER
    // ==========================================
    renderSchoolTabungLedger() {
        const ledger = window.treasuryStore.getLedger('School Tabung');
        const state = window.treasuryStore.getState();
        const breakdown = window.treasuryStore.getCategoryBreakdown();
        const tabung = breakdown.tabungExpenses;

        // Metric summary
        const balEl = document.getElementById('tabung-ledger-balance');
        const inEl = document.getElementById('tabung-ledger-income');
        const outEl = document.getElementById('tabung-ledger-expense');
        if (balEl) balEl.textContent = window.treasuryUI.formatCurrency(state.metrics.tabungBalance);
        if (inEl) inEl.textContent = window.treasuryUI.formatCurrency(state.metrics.tabungIncome);
        if (outEl) outEl.textContent = window.treasuryUI.formatCurrency(state.metrics.tabungExpenses);

        // Special School Tabung Flow Cards (Faculty Subsidy, Sponsorship, Claiming, UM First)
        const tabungFlowGrid = document.getElementById('tabung-flow-grid');
        if (tabungFlowGrid) {
            tabungFlowGrid.innerHTML = `
                <div class="flow-card">
                    <div class="flow-icon bg-blue-subtle"><i class="icon-file-text"></i></div>
                    <div class="flow-info">
                        <span class="flow-label">Claiming / Reimbursements</span>
                        <span class="flow-amount text-danger">${window.treasuryUI.formatCurrency(tabung['Claiming'] || 0)}</span>
                        <span class="flow-sub">Official Bursary voucher processing</span>
                    </div>
                </div>
                <div class="flow-card">
                    <div class="flow-icon bg-purple-subtle"><i class="icon-shield"></i></div>
                    <div class="flow-info">
                        <span class="flow-label">UM First Internal Deductions</span>
                        <span class="flow-amount text-danger">${window.treasuryUI.formatCurrency(tabung['UM First'] || 0)}</span>
                        <span class="flow-sub">Campus facilities, halls & security</span>
                    </div>
                </div>
                <div class="flow-card">
                    <div class="flow-icon bg-emerald-subtle"><i class="icon-award"></i></div>
                    <div class="flow-info">
                        <span class="flow-label">Faculty Subsidies</span>
                        <span class="flow-amount text-success">${window.treasuryUI.formatCurrency(state.metrics.tabungIncome)}</span>
                        <span class="flow-sub">Student affairs grant allocations</span>
                    </div>
                </div>
            `;
        }

        // Ledger Table
        const tbody = document.getElementById('tabung-ledger-tbody');
        if (tbody) {
            if (ledger.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center py-4 text-muted">
                            No School Tabung transactions recorded yet. Click '+ Add Transaction' to record School Tabung money flow.
                        </td>
                    </tr>
                `;
            } else {
                tbody.innerHTML = ledger.map(t => `
                    <tr onclick="window.treasuryUI.openTransactionModal('${t.id}')" title="Click to view/edit ${t.ref}">
                        <td class="font-mono text-muted">${window.treasuryUI.formatDate(t.date)}</td>
                        <td class="font-mono fw-bold">${t.ref}</td>
                        <td>${window.treasuryUI.getCategoryBadge(t.category, 'School Tabung')}</td>
                        <td class="desc-cell">${t.description}</td>
                        <td class="text-success font-mono text-end fw-bold">
                            ${t.income > 0 ? window.treasuryUI.formatCurrency(t.income) : '-'}
                        </td>
                        <td class="text-danger font-mono text-end fw-bold">
                            ${t.expenses > 0 ? window.treasuryUI.formatCurrency(t.expenses) : '-'}
                        </td>
                        <td class="font-mono text-end fw-bold text-tabung">
                            ${window.treasuryUI.formatCurrency(t.runningBalance)}
                        </td>
                        <td class="text-center">${window.treasuryUI.getStatusBadge(t.status)}</td>
                    </tr>
                `).join('');
            }
        }
    }

    // ==========================================
    // PAGE 5: TRANSFER LOG
    // ==========================================
    renderTransferLog() {
        const transfers = window.treasuryStore.getTransferLog();
        const tbody = document.getElementById('transfers-table-tbody');
        const countEl = document.getElementById('transfers-count-label');
        if (countEl) countEl.textContent = `${transfers.length} inter-account transfer(s) logged`;

        if (tbody) {
            if (transfers.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center py-5 text-muted">
                            <i class="icon-repeat" style="font-size: 2rem;"></i>
                            <p class="mt-2">No inter-account transfers detected yet.</p>
                            <small>Create a transaction with Type = "Transfer" to log transfers between Petty Cash and Tabung.</small>
                        </td>
                    </tr>
                `;
            } else {
                tbody.innerHTML = transfers.map(t => `
                    <tr>
                        <td class="font-mono text-muted">${window.treasuryUI.formatDate(t.date)}</td>
                        <td class="font-mono fw-bold">${t.ref}</td>
                        <td>${window.treasuryUI.getAccountBadge(t.from)}</td>
                        <td>
                            <i class="icon-arrow-right text-muted mx-1"></i>
                            ${window.treasuryUI.getAccountBadge(t.to)}
                        </td>
                        <td class="font-mono fw-bold text-transfer text-end">
                            ${window.treasuryUI.formatCurrency(t.amount)}
                        </td>
                        <td class="desc-cell">${t.description}</td>
                        <td class="text-center">${window.treasuryUI.getStatusBadge(t.status)}</td>
                    </tr>
                `).join('');
            }
        }
    }

    // ==========================================
    // PAGE 6: BUDGET TRACKER
    // ==========================================
    renderBudgetTracker() {
        const budgets = window.treasuryStore.getBudgetSummary();
        const tbody = document.getElementById('budget-tracker-tbody');
        const state = window.treasuryStore.getState();

        const totalAllocated = budgets.reduce((sum, b) => sum + b.budget, 0);
        const totalSpent = budgets.reduce((sum, b) => sum + b.actualExpense, 0);
        const totalRemaining = totalAllocated - totalSpent;

        const elAlloc = document.getElementById('budget-total-allocated');
        const elSpent = document.getElementById('budget-total-spent');
        const elRem = document.getElementById('budget-total-remaining');
        if (elAlloc) elAlloc.textContent = window.treasuryUI.formatCurrency(totalAllocated);
        if (elSpent) elSpent.textContent = window.treasuryUI.formatCurrency(totalSpent);
        if (elRem) {
            elRem.textContent = window.treasuryUI.formatCurrency(totalRemaining);
            elRem.className = totalRemaining >= 0 ? 'metric-val text-success' : 'metric-val text-danger';
        }

        if (tbody) {
            if (budgets.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center py-5 text-muted">
                            <p style="font-size: 0.95rem; margin-bottom: 8px;">No event budgets created yet.</p>
                            <button class="btn btn-primary btn-sm" onclick="window.treasuryUI.openBudgetModal()">+ Add New Event Budget</button>
                        </td>
                    </tr>
                `;
            } else {
                tbody.innerHTML = budgets.map(b => {
                    let badgeClass = 'badge-budget-green';
                    let barClass = 'progress-bar-green';
                    let statusLabel = '🟢 Healthy (<75%)';

                    if (b.health === 'red') {
                        badgeClass = 'badge-budget-red';
                        barClass = 'progress-bar-red';
                        statusLabel = '🔴 Critical (>95%)';
                    } else if (b.health === 'yellow') {
                        badgeClass = 'badge-budget-yellow';
                        barClass = 'progress-bar-yellow';
                        statusLabel = '🟡 Warning (75-95%)';
                    }

                    return `
                        <tr>
                            <td class="fw-bold">${b.name}</td>
                            <td class="font-mono text-end">${window.treasuryUI.formatCurrency(b.budget)}</td>
                            <td class="font-mono text-danger text-end fw-bold">${window.treasuryUI.formatCurrency(b.actualExpense)}</td>
                            <td class="font-mono ${b.remaining >= 0 ? 'text-success' : 'text-danger'} text-end fw-bold">
                                ${window.treasuryUI.formatCurrency(b.remaining)}
                            </td>
                            <td style="min-width: 180px;">
                                <div class="d-flex justify-content-between text-muted mb-1" style="font-size: 0.75rem;">
                                    <span>Utilization</span>
                                    <span class="fw-bold">${b.pctUsed}%</span>
                                </div>
                                <div class="progress-track">
                                    <div class="progress-bar ${barClass}" style="width: ${Math.min(b.pctUsed, 100)}%"></div>
                                </div>
                            </td>
                            <td class="text-center">
                                <span class="badge ${badgeClass}">${statusLabel}</span>
                            </td>
                            <td class="text-end">
                                <div class="table-actions d-flex gap-1 justify-content-end">
                                    <button class="btn-icon" title="Edit Event Budget" onclick="window.treasuryUI.openBudgetModal('${b.id}')">
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                    </button>
                                    <button class="btn-icon btn-icon-danger" title="Delete Event" onclick="window.treasuryApp.handleDeleteEvent('${b.id}', '${b.name.replace(/'/g, "\\'")}')">
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        }
    }

    // ==========================================
    // PAGE 7: MONTHLY REPORT
    // ==========================================
    renderMonthlyReport() {
        const monthly = window.treasuryStore.getMonthlyBreakdown();
        const tbody = document.getElementById('monthly-report-tbody');

        if (tbody) {
            if (monthly.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center py-4 text-muted">
                            No monthly records available yet. Add transactions to see monthly revenue vs expense trajectory.
                        </td>
                    </tr>
                `;
            } else {
                tbody.innerHTML = monthly.map(m => `
                    <tr>
                        <td class="fw-bold">${m.monthLabel}</td>
                        <td class="text-success font-mono text-end fw-bold">${window.treasuryUI.formatCurrency(m.income)}</td>
                        <td class="text-danger font-mono text-end fw-bold">${window.treasuryUI.formatCurrency(m.expense)}</td>
                        <td class="font-mono text-end fw-bold ${m.net >= 0 ? 'text-success' : 'text-danger'}">
                            ${m.net >= 0 ? '+' : ''}${window.treasuryUI.formatCurrency(m.net)}
                        </td>
                        <td class="font-mono text-end ${m.pettyNet >= 0 ? 'text-petty' : 'text-danger'}">
                            ${window.treasuryUI.formatCurrency(m.pettyNet)}
                        </td>
                        <td class="font-mono text-end ${m.tabungNet >= 0 ? 'text-tabung' : 'text-danger'}">
                            ${window.treasuryUI.formatCurrency(m.tabungNet)}
                        </td>
                        <td class="text-center">
                            <span class="badge ${m.net >= 0 ? 'badge-success' : 'badge-danger'}">
                                ${m.net >= 0 ? 'Net Positive' : 'Deficit'}
                            </span>
                        </td>
                    </tr>
                `).join('');
            }
        }
    }

    // ==========================================
    // PAGE 8: CATEGORY SUMMARY
    // ==========================================
    renderCategorySummary() {
        const breakdown = window.treasuryStore.getCategoryBreakdown();
        const depts = breakdown.pettyDepartments;
        const tabung = breakdown.tabungExpenses;
        const allCats = breakdown.allCategories;

        // Render Summary Tables
        const tbodyPetty = document.getElementById('category-petty-tbody');
        const totalPetty = Object.values(depts).reduce((a, b) => a + b, 0) || 1;

        if (tbodyPetty) {
            const deptMeta = [
                { key: 'HC', name: 'High Committee' },
                { key: 'EP', name: 'Events & Projects' },
                { key: 'IR', name: 'Industrial Relations' },
                { key: 'PD', name: 'Partnership Development' },
                { key: 'C&M', name: 'Content and Marketing' }
            ];

            tbodyPetty.innerHTML = deptMeta.map(d => {
                const spent = depts[d.key] || 0;
                const share = ((spent / totalPetty) * 100).toFixed(1);
                return `
                    <tr>
                        <td>${window.treasuryUI.getCategoryBadge(d.key, 'Petty Cash')}</td>
                        <td>${d.name}</td>
                        <td class="font-mono text-danger text-end fw-bold">${window.treasuryUI.formatCurrency(spent)}</td>
                        <td class="font-mono text-end">${share}%</td>
                    </tr>
                `;
            }).join('');
        }

        const tbodyTabung = document.getElementById('category-tabung-tbody');
        const totalTabung = (tabung['Claiming'] || 0) + (tabung['UM First'] || 0) || 1;
        if (tbodyTabung) {
            tbodyTabung.innerHTML = `
                <tr>
                    <td>${window.treasuryUI.getCategoryBadge('Claiming', 'School Tabung')}</td>
                    <td>Official Bursary Voucher Claiming</td>
                    <td class="font-mono text-danger text-end fw-bold">${window.treasuryUI.formatCurrency(tabung['Claiming'] || 0)}</td>
                    <td class="font-mono text-end">${(((tabung['Claiming'] || 0) / totalTabung) * 100).toFixed(1)}%</td>
                </tr>
                <tr>
                    <td>${window.treasuryUI.getCategoryBadge('UM First', 'School Tabung')}</td>
                    <td>UM First Internal University System</td>
                    <td class="font-mono text-danger text-end fw-bold">${window.treasuryUI.formatCurrency(tabung['UM First'] || 0)}</td>
                    <td class="font-mono text-end">${(((tabung['UM First'] || 0) / totalTabung) * 100).toFixed(1)}%</td>
                </tr>
            `;
        }

        window.treasuryCharts.initCategoryCharts();
    }

    // ==========================================
    // PAGE 9: RECEIPT TRACKER
    // ==========================================
    renderReceiptTracker() {
        const state = window.treasuryStore.getState();
        const tbody = document.getElementById('receipt-tracker-tbody');
        const countMissing = document.getElementById('receipt-missing-count');
        const countVerified = document.getElementById('receipt-verified-count');

        let list = state.transactions.filter(t => t.type === 'Expenses' || t.type === 'Transfer');

        if (this.receiptFilter === 'missing') {
            list = list.filter(t => t.receipt === 'No' || !t.receipt);
        } else if (this.receiptFilter === 'pending') {
            list = list.filter(t => t.receipt === 'Yes' && !t.verified);
        } else if (this.receiptFilter === 'verified') {
            list = list.filter(t => t.verified === true);
        }

        const missingTotal = state.transactions.filter(t => (t.type === 'Expenses' || t.type === 'Transfer') && (t.receipt === 'No' || !t.receipt)).length;
        const verifiedTotal = state.transactions.filter(t => t.verified === true).length;

        if (countMissing) countMissing.textContent = missingTotal;
        if (countVerified) countVerified.textContent = verifiedTotal;

        if (tbody) {
            if (list.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center py-4 text-muted">
                            No expense transactions found for receipt tracking.
                        </td>
                    </tr>
                `;
            } else {
                tbody.innerHTML = list.map(t => {
                    const hasReceipt = t.receipt === 'Yes';
                    const isVerified = t.verified === true;

                    let rowAlert = 'row-verified';
                    if (!hasReceipt) rowAlert = 'row-missing-receipt';
                    else if (!isVerified) rowAlert = 'row-pending-verify';

                    return `
                        <tr class="${rowAlert}" onclick="window.treasuryUI.openReceiptModal('${t.id}')" title="Click to view/verify receipt for ${t.ref}">
                            <td class="font-mono fw-bold">${t.ref}</td>
                            <td class="font-mono text-muted">${window.treasuryUI.formatDate(t.date)}</td>
                            <td>${t.paidBy || t.description}</td>
                            <td class="font-mono text-danger fw-bold text-end">${window.treasuryUI.formatCurrency(t.expenses || t.income)}</td>
                            <td><span class="badge badge-event">${t.event}</span></td>
                            <td class="text-center">
                                <span class="badge ${hasReceipt ? 'badge-receipt-uploaded' : 'badge-receipt-missing'}">
                                    ${hasReceipt ? '<i class="icon-file-text"></i> Attached' : '<i class="icon-alert-triangle"></i> MISSING'}
                                </span>
                            </td>
                            <td class="text-center" onclick="event.stopPropagation();">
                                <label class="custom-checkbox">
                                    <input type="checkbox" ${isVerified ? 'checked' : ''} onchange="window.treasuryApp.toggleVerifyRow('${t.id}')">
                                    <span class="checkmark"></span>
                                </label>
                            </td>
                            <td class="text-end" onclick="event.stopPropagation();">
                                <button class="btn-icon" title="View / Upload Receipt" onclick="window.treasuryUI.openReceiptModal('${t.id}')">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        }
    }

    setReceiptFilter(filter) {
        this.receiptFilter = filter;
        document.querySelectorAll('.btn-receipt-filter').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-filter') === filter);
        });
        this.renderReceiptTracker();
    }

    toggleVerifyRow(txnId) {
        const isVerified = window.treasuryStore.toggleVerification(txnId);
        window.treasuryUI.showToast(isVerified ? 'Transaction verified by Treasurer!' : 'Verification untoggled.', isVerified ? 'success' : 'info');
        this.renderReceiptTracker();
    }

    // CRUD Handlers
    handleSaveTransaction() {
        const id = document.getElementById('txn-id').value;
        const ref = document.getElementById('txn-ref').value.trim();
        const date = document.getElementById('txn-date').value;
        const account = document.getElementById('txn-account').value;
        const type = document.getElementById('txn-type').value;
        const category = document.getElementById('txn-category').value;
        const description = document.getElementById('txn-desc').value.trim();
        const income = parseFloat(document.getElementById('txn-income').value) || 0;
        const expenses = parseFloat(document.getElementById('txn-expenses').value) || 0;
        const event = document.getElementById('txn-event').value;
        const paidBy = document.getElementById('txn-paidby').value.trim();
        const receipt = document.getElementById('txn-receipt').value;
        const receiptUrl = document.getElementById('txn-receipt-url').value.trim();
        const verified = document.getElementById('txn-verified').checked;
        const status = document.getElementById('txn-status').value;
        const notes = document.getElementById('txn-notes').value.trim();

        if (!description) {
            window.treasuryUI.showToast('Please enter a description for the transaction.', 'warning');
            return;
        }

        const txnData = {
            ref,
            date,
            account,
            type,
            category,
            description,
            income,
            expenses,
            event,
            paidBy,
            receipt,
            receiptUrl,
            verified,
            status,
            notes
        };

        if (id) {
            window.treasuryStore.updateTransaction(id, txnData);
            window.treasuryUI.showToast(`Updated transaction ${ref} successfully!`, 'success');
        } else {
            window.treasuryStore.addTransaction(txnData);
            window.treasuryUI.showToast(`New transaction ${ref} recorded!`, 'success');
        }

        window.treasuryUI.closeModal('modal-transaction');

        // Auto-sync if enabled
        if (window.treasuryStore.settings.autoSync && window.treasuryStore.settings.googleAppsScriptUrl) {
            window.googleSheetsSyncEngine.pushToSheets();
        }
    }

    handleDeleteTransaction(id) {
        const txn = window.treasuryStore.transactions.find(t => t.id === id);
        if (!txn) return;

        if (confirm(`Are you sure you want to delete transaction ${txn.ref} (${txn.description})?`)) {
            window.treasuryStore.deleteTransaction(id);
            window.treasuryUI.showToast(`Deleted transaction ${txn.ref}.`, 'info');
        }
    }

    handleSaveBudget() {
        const id = document.getElementById('evt-id').value;
        const name = document.getElementById('evt-name').value.trim();
        const budget = parseFloat(document.getElementById('evt-budget').value) || 0;

        if (!name) {
            window.treasuryUI.showToast('Please enter an event name.', 'warning');
            return;
        }

        if (id) {
            window.treasuryStore.updateEventBudget(id, budget);
            window.treasuryUI.showToast(`Budget for "${name}" updated!`, 'success');
        } else {
            window.treasuryStore.addEvent({ name, budget });
            window.treasuryUI.showToast(`New event budget "${name}" created!`, 'success');
        }

        window.treasuryUI.closeModal('modal-budget');
    }

    handleDeleteEvent(id, name) {
        if (confirm(`Are you sure you want to delete the event budget "${name}"? Existing transactions linked to this event will remain safe.`)) {
            window.treasuryStore.deleteEvent(id);
            window.treasuryUI.showToast(`Deleted event budget "${name}".`, 'info');
            this.renderBudgetTracker();
            this.renderDashboard();
        }
    }

    toggleSidebar() {
        const sidebar = document.getElementById('app-sidebar');
        const backdrop = document.getElementById('sidebar-backdrop');
        if (sidebar) {
            sidebar.classList.toggle('open');
            if (backdrop) backdrop.classList.toggle('active');
        }
    }

    closeSidebar() {
        const sidebar = document.getElementById('app-sidebar');
        const backdrop = document.getElementById('sidebar-backdrop');
        if (sidebar) sidebar.classList.remove('open');
        if (backdrop) backdrop.classList.remove('active');
    }
}

// Instantiate and start app on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.treasuryApp = new TreasuryApplication();
    window.treasuryApp.init();
});

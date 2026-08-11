/**
 * Interactive Charts & Visualizations Engine
 */

class TreasuryChartsManager {
    constructor(store) {
        this.store = store;
        this.charts = {};
    }

    destroyAll() {
        Object.values(this.charts).forEach(c => {
            if (c && typeof c.destroy === 'function') {
                c.destroy();
            }
        });
        this.charts = {};
    }

    initDashboardCharts() {
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not yet loaded, retrying shortly...');
            setTimeout(() => this.initDashboardCharts(), 200);
            return;
        }

        const state = this.store.getState();
        const metrics = state.metrics;
        const monthly = this.store.getMonthlyBreakdown();

        // 1. Income vs Expense Comparison Chart
        const incomeExpenseCanvas = document.getElementById('chart-income-vs-expense');
        if (incomeExpenseCanvas) {
            if (this.charts['incomeVsExpense']) this.charts['incomeVsExpense'].destroy();

            const isDark = document.body.classList.contains('dark-theme') || !document.body.classList.contains('light-theme');
            const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
            const textColor = isDark ? '#94a3b8' : '#64748b';

            this.charts['incomeVsExpense'] = new Chart(incomeExpenseCanvas, {
                type: 'bar',
                data: {
                    labels: ['Petty Cash (Personal)', 'School Tabung', 'Combined Total'],
                    datasets: [
                        {
                            label: 'Total Inflow (Income)',
                            data: [metrics.pettyCashIncome, metrics.tabungIncome, metrics.totalIncome],
                            backgroundColor: '#10b981',
                            borderRadius: 8,
                            borderSkipped: false,
                            barPercentage: 0.6
                        },
                        {
                            label: 'Total Outflow (Expenses)',
                            data: [metrics.pettyCashExpenses, metrics.tabungExpenses, metrics.totalExpenses],
                            backgroundColor: '#ef4444',
                            borderRadius: 8,
                            borderSkipped: false,
                            barPercentage: 0.6
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                color: textColor,
                                font: { family: "'Plus Jakarta Sans', sans-serif", weight: '600', size: 12 },
                                usePointStyle: true,
                                padding: 16
                            }
                        },
                        tooltip: {
                            backgroundColor: '#1e293b',
                            titleColor: '#ffffff',
                            bodyColor: '#cbd5e1',
                            padding: 12,
                            cornerRadius: 8,
                            callbacks: {
                                label: function(context) {
                                    return ` ${context.dataset.label}: ${window.treasuryUI.formatCurrency(context.raw)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: { color: textColor, font: { family: "'Plus Jakarta Sans', sans-serif" } }
                        },
                        y: {
                            grid: { color: gridColor },
                            ticks: {
                                color: textColor,
                                font: { family: "'Plus Jakarta Sans', sans-serif" },
                                callback: function(val) {
                                    return 'RM ' + (val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val);
                                }
                            }
                        }
                    }
                }
            });
        }

        // 2. Cash Flow Monthly Trend Chart
        const cashFlowCanvas = document.getElementById('chart-monthly-cashflow');
        if (cashFlowCanvas && monthly.length > 0) {
            if (this.charts['monthlyCashflow']) this.charts['monthlyCashflow'].destroy();

            const isDark = document.body.classList.contains('dark-theme') || !document.body.classList.contains('light-theme');
            const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
            const textColor = isDark ? '#94a3b8' : '#64748b';

            this.charts['monthlyCashflow'] = new Chart(cashFlowCanvas, {
                type: 'line',
                data: {
                    labels: monthly.map(m => m.monthLabel),
                    datasets: [
                        {
                            label: 'Monthly Income',
                            data: monthly.map(m => m.income),
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            fill: true,
                            tension: 0.35,
                            borderWidth: 3,
                            pointRadius: 5,
                            pointHoverRadius: 7
                        },
                        {
                            label: 'Monthly Expense',
                            data: monthly.map(m => m.expense),
                            borderColor: '#ef4444',
                            backgroundColor: 'rgba(239, 68, 68, 0.12)',
                            fill: true,
                            tension: 0.35,
                            borderWidth: 3,
                            pointRadius: 5,
                            pointHoverRadius: 7
                        },
                        {
                            label: 'Net Cash Flow',
                            data: monthly.map(m => m.net),
                            borderColor: '#6366f1',
                            borderDash: [5, 5],
                            borderWidth: 2,
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            fill: false
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                color: textColor,
                                font: { family: "'Plus Jakarta Sans', sans-serif", weight: '600', size: 12 },
                                usePointStyle: true,
                                padding: 16
                            }
                        },
                        tooltip: {
                            backgroundColor: '#1e293b',
                            padding: 12,
                            cornerRadius: 8,
                            callbacks: {
                                label: function(context) {
                                    return ` ${context.dataset.label}: ${window.treasuryUI.formatCurrency(context.raw)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: { color: textColor, font: { family: "'Plus Jakarta Sans', sans-serif" } }
                        },
                        y: {
                            grid: { color: gridColor },
                            ticks: {
                                color: textColor,
                                font: { family: "'Plus Jakarta Sans', sans-serif" },
                                callback: function(val) {
                                    return 'RM ' + (val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val);
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    initCategoryCharts() {
        if (typeof Chart === 'undefined') return;

        const breakdown = this.store.getCategoryBreakdown();
        const depts = breakdown.pettyDepartments;
        const tabung = breakdown.tabungExpenses;

        const isDark = document.body.classList.contains('dark-theme') || !document.body.classList.contains('light-theme');
        const textColor = isDark ? '#cbd5e1' : '#475569';

        // 1. Petty Cash 5 Departments Doughnut Chart
        const pettyCanvas = document.getElementById('chart-petty-dept-doughnut');
        if (pettyCanvas) {
            if (this.charts['pettyDept']) this.charts['pettyDept'].destroy();

            const deptLabels = ['HC - High Committee', 'EP - Events & Projects', 'IR - Industrial Relations', 'PD - Partnership Development', 'C&M - Content and Marketing'];
            const deptValues = [depts['HC'] || 0, depts['EP'] || 0, depts['IR'] || 0, depts['PD'] || 0, depts['C&M'] || 0];

            this.charts['pettyDept'] = new Chart(pettyCanvas, {
                type: 'doughnut',
                data: {
                    labels: deptLabels,
                    datasets: [{
                        data: deptValues,
                        backgroundColor: [
                            '#6366f1', // HC Indigo
                            '#ec4899', // EP Pink
                            '#06b6d4', // IR Cyan
                            '#f59e0b', // PD Amber
                            '#10b981'  // C&M Emerald
                        ],
                        borderWidth: 2,
                        borderColor: isDark ? '#0f172a' : '#ffffff',
                        hoverOffset: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '68%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: textColor,
                                font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: '500' },
                                padding: 14,
                                usePointStyle: true
                            }
                        },
                        tooltip: {
                            backgroundColor: '#0f172a',
                            padding: 12,
                            cornerRadius: 8,
                            callbacks: {
                                label: function(context) {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const val = context.raw;
                                    const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                                    return ` ${context.label}: ${window.treasuryUI.formatCurrency(val)} (${pct}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }

        // 2. School Tabung Expense Breakdown Doughnut Chart
        const tabungCanvas = document.getElementById('chart-tabung-dept-doughnut');
        if (tabungCanvas) {
            if (this.charts['tabungDept']) this.charts['tabungDept'].destroy();

            const tabungLabels = ['Claiming / Reimbursements', 'UM First'];
            const tabungValues = [tabung['Claiming'] || 0, tabung['UM First'] || 0];

            this.charts['tabungDept'] = new Chart(tabungCanvas, {
                type: 'doughnut',
                data: {
                    labels: tabungLabels,
                    datasets: [{
                        data: tabungValues,
                        backgroundColor: [
                            '#3b82f6', // Claiming Blue
                            '#8b5cf6'  // UM First Purple
                        ],
                        borderWidth: 2,
                        borderColor: isDark ? '#0f172a' : '#ffffff',
                        hoverOffset: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '68%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: textColor,
                                font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: '500' },
                                padding: 14,
                                usePointStyle: true
                            }
                        },
                        tooltip: {
                            backgroundColor: '#0f172a',
                            padding: 12,
                            cornerRadius: 8,
                            callbacks: {
                                label: function(context) {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const val = context.raw;
                                    const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                                    return ` ${context.label}: ${window.treasuryUI.formatCurrency(val)} (${pct}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }
    }
}

window.treasuryCharts = new TreasuryChartsManager(window.treasuryStore);

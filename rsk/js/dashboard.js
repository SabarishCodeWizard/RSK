// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', async function () {
    // Set default dates
    const today = new Date();
    document.getElementById('endDate').value = today.toISOString().split('T')[0];
    const startDate = new Date(today);
    startDate.setMonth(today.getMonth() - 1);
    document.getElementById('startDate').value = startDate.toISOString().split('T')[0];

    // Initialize charts
    const salesTrendCtx = document.getElementById('salesTrendChart').getContext('2d');
    const customerDistributionCtx = document.getElementById('customerDistributionChart').getContext('2d');
    const taxBreakdownCtx = document.getElementById('taxBreakdownChart').getContext('2d');
    const productPerformanceCtx = document.getElementById('productPerformanceChart').getContext('2d');

    const salesTrendChart = new Chart(salesTrendCtx, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: getLineChartOptions('Sales Value (₹)')
    });

    const customerDistributionChart = new Chart(customerDistributionCtx, {
        type: 'doughnut',
        data: { labels: [], datasets: [] },
        options: getDoughnutChartOptions()
    });

    const taxBreakdownChart = new Chart(taxBreakdownCtx, {
        type: 'bar',
        data: { labels: [], datasets: [] },
        options: getBarChartOptions('Tax Amount (₹)')
    });

    const productPerformanceChart = new Chart(productPerformanceCtx, {
        type: 'bar',
        data: { labels: [], datasets: [] },
        options: getBarChartOptions('Quantity')
    });

    // Event listeners for filter controls
    document.getElementById('timePeriod').addEventListener('change', function () {
        document.getElementById('customRangeGroup').style.display =
            this.value === 'custom' ? 'flex' : 'none';
    });

    document.getElementById('applyFilters').addEventListener('click', async function () {
        await loadDashboardData();
    });

    document.getElementById('resetFilters').addEventListener('click', function () {
        document.getElementById('timePeriod').value = 'month';
        document.getElementById('customRangeGroup').style.display = 'none';
        document.getElementById('customerFilter').value = 'all';
        loadDashboardData();
    });

    // Event listeners for chart options
    document.querySelectorAll('.sales-trend .chart-option').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.sales-trend .chart-option').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            loadSalesTrendChart(this.dataset.period);
        });
    });

    document.querySelectorAll('.product-performance .chart-option').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.product-performance .chart-option').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            loadProductPerformanceChart(this.dataset.metric);
        });
    });

    // Initial data load
    await loadDashboardData();

    // Logout functionality
    document.getElementById('logoutBtn').addEventListener('click', function () {
        sessionStorage.removeItem('isLoggedIn');
        window.location.href = 'login.html';
    });
});

// Chart configuration functions
function getLineChartOptions(title) {
    return {
        responsive: true,
        plugins: {
            legend: { position: 'top' },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        return '₹' + context.raw.toLocaleString('en-IN');
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function (value) {
                        return '₹' + value.toLocaleString('en-IN');
                    }
                }
            }
        }
    };
}

function getBarChartOptions(title) {
    return {
        responsive: true,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        if (context.dataset.label === 'Revenue') {
                            return '₹' + context.raw.toLocaleString('en-IN');
                        }
                        return context.raw;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function (value) {
                        if (title.includes('₹')) {
                            return '₹' + value.toLocaleString('en-IN');
                        }
                        return value;
                    }
                }
            }
        }
    };
}

function getDoughnutChartOptions() {
    return {
        responsive: true,
        plugins: {
            legend: { position: 'right' },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        const total = context.dataset.total || 1;
                        const percentage = Math.round((value / total) * 100);
                        return `${label}: ₹${value.toLocaleString('en-IN')} (${percentage}%)`;
                    }
                }
            }
        }
    };
}

// Helper function to get invoice total amount regardless of property name
function getInvoiceAmount(invoice) {
    // Try all possible property names where the total might be stored
    const total = parseFloat(invoice.total) ||
        parseFloat(invoice.grandTotal) ||
        parseFloat(invoice.totalAmount) ||
        0;
    return isNaN(total) ? 0 : total;
}

// Main data loading function
async function loadDashboardData() {
    try {
        // Show loading state
        document.querySelectorAll('.card-value').forEach(el => {
            el.classList.add('loading');
            el.textContent = '--';
        });

        // Get filter values
        const timePeriod = document.getElementById('timePeriod').value;
        const customerFilter = document.getElementById('customerFilter').value;
        let startDate, endDate;

        if (timePeriod === 'custom') {
            startDate = document.getElementById('startDate').value;
            endDate = document.getElementById('endDate').value;
            if (!startDate || !endDate) {
                throw new Error('Please select both start and end dates');
            }
        } else {
            const dateRange = getDateRange(timePeriod);
            startDate = dateRange.start;
            endDate = dateRange.end;
        }

        // Get invoices from database
        const invoices = await getFilteredInvoices(startDate, endDate, customerFilter);

        // Examine first invoice for debugging
        if (invoices.length > 0) {
            console.log('First invoice data structure:', invoices[0]);
        }

        if (!invoices || invoices.length === 0) {
            showNoDataMessage();
            return;
        }

        // Update all dashboard components
        updateSummaryCards(invoices, timePeriod);
        loadSalesTrendChart('day', invoices);
        loadCustomerDistributionChart(invoices);
        loadTaxBreakdownChart(invoices);
        loadProductPerformanceChart('quantity', invoices);
        updateRecentInvoicesTable(invoices);

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showErrorMessage('Error loading dashboard data: ' + error.message);
    } finally {
        // Remove loading state
        document.querySelectorAll('.loading').forEach(el => {
            el.classList.remove('loading');
        });
    }
}

function showNoDataMessage() {
    alert('No invoice data found for the selected filters');
    // You could also update the UI to show a "no data" message
}

function showErrorMessage(message) {
    // Create or show an error message element in your UI
    const errorElement = document.getElementById('error-message') || createErrorMessageElement();
    errorElement.textContent = message;
    errorElement.style.display = 'block';

    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 5000);
}

function createErrorMessageElement() {
    const div = document.createElement('div');
    div.id = 'error-message';
    div.style.position = 'fixed';
    div.style.top = '20px';
    div.style.right = '20px';
    div.style.padding = '15px';
    div.style.backgroundColor = '#ff4444';
    div.style.color = 'white';
    div.style.borderRadius = '5px';
    div.style.zIndex = '1000';
    div.style.display = 'none';
    document.body.appendChild(div);
    return div;
}

// Debugging helper - log invoice structure
function logInvoiceStructure() {
    getAllInvoices().then(invoices => {
        if (invoices.length > 0) {
            console.log('Sample invoice structure:', invoices[0]);
            console.log('Available properties:', Object.keys(invoices[0]));
        } else {
            console.log('No invoices found in database');
        }
    });
}

// Call this from browser console if needed
// window.debugInvoices = logInvoiceStructure;

// Get date range based on selected period
function getDateRange(period) {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of day

    let startDate = new Date(today);

    switch (period) {
        case 'today':
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'week':
            startDate.setDate(today.getDate() - 6);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'month':
            startDate.setMonth(today.getMonth() - 1);
            startDate.setDate(today.getDate() + 1);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'quarter':
            startDate.setMonth(today.getMonth() - 3);
            startDate.setDate(today.getDate() + 1);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'year':
            startDate.setFullYear(today.getFullYear() - 1);
            startDate.setDate(today.getDate() + 1);
            startDate.setHours(0, 0, 0, 0);
            break;
    }

    return {
        start: startDate.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0]
    };
}

// Get filtered invoices from database
async function getFilteredInvoices(startDate, endDate, customerFilter) {
    const allInvoices = await getAllInvoices();

    return allInvoices.filter(invoice => {
        const invoiceDate = new Date(invoice.date);
        const filterStartDate = new Date(startDate);
        const filterEndDate = new Date(endDate);

        // Check date range
        if (invoiceDate < filterStartDate || invoiceDate > filterEndDate) {
            return false;
        }

        // Check customer filter
        if (customerFilter !== 'all' && invoice.customerName !== customerFilter) {
            return false;
        }

        return true;
    });
}

// Update summary cards
function updateSummaryCards(invoices, currentPeriod) {
    // Calculate current period metrics
    const currentTotalSales = invoices.reduce((sum, invoice) => {
        // Use our helper function to get the total amount regardless of property name
        return sum + getInvoiceAmount(invoice);
    }, 0);

    const currentInvoiceCount = invoices.length;
    const currentAvgInvoice = currentInvoiceCount > 0 ? currentTotalSales / currentInvoiceCount : 0;

    // Find top customer
    const customerSales = {};
    invoices.forEach(invoice => {
        const customerName = invoice.customerName || 'Unknown Customer';
        const amount = getInvoiceAmount(invoice);
        customerSales[customerName] = (customerSales[customerName] || 0) + amount;
    });

    let topCustomer = '-';
    let topCustomerSales = 0;

    if (Object.keys(customerSales).length > 0) {
        const sortedCustomers = Object.entries(customerSales).sort((a, b) => b[1] - a[1]);
        topCustomer = sortedCustomers[0][0];
        topCustomerSales = sortedCustomers[0][1];
    }

    // Get previous period for comparison
    let previousPeriod;
    switch (currentPeriod) {
        case 'today': previousPeriod = 'yesterday'; break;
        case 'week': previousPeriod = 'last week'; break;
        case 'month': previousPeriod = 'last month'; break;
        case 'quarter': previousPeriod = 'last quarter'; break;
        case 'year': previousPeriod = 'last year'; break;
        default: previousPeriod = null;
    }

    // Update DOM
    document.getElementById('totalSales').textContent = formatCurrency(currentTotalSales);
    document.getElementById('totalInvoices').textContent = currentInvoiceCount;
    document.getElementById('avgInvoice').textContent = formatCurrency(currentAvgInvoice);
    document.getElementById('topCustomer').textContent = topCustomer;
    document.getElementById('topCustomerSales').textContent = formatCurrency(topCustomerSales);

    // TODO: Implement comparison with previous period
    // For now, we'll just show the current values
    document.getElementById('totalSalesChange').textContent = 'No comparison data';
    document.getElementById('totalInvoicesChange').textContent = 'No comparison data';
    document.getElementById('avgInvoiceChange').textContent = 'No comparison data';

    // Populate customer filter dropdown
    const customerFilter = document.getElementById('customerFilter');
    customerFilter.innerHTML = '<option value="all">All Customers</option>';

    Object.keys(customerSales).sort().forEach(customer => {
        const option = document.createElement('option');
        option.value = customer;
        option.textContent = customer;
        customerFilter.appendChild(option);
    });
}

// Format currency for display
function formatCurrency(amount) {
    return '₹' + Math.round(amount).toLocaleString('en-IN');
}

// Load sales trend chart
function loadSalesTrendChart(granularity, invoices) {
    // Group sales by time period
    const salesData = {};
    const labels = [];

    invoices.forEach(invoice => {
        const date = new Date(invoice.date);
        let key;

        switch (granularity) {
            case 'day':
                key = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                break;
            case 'week':
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
                key = `Week of ${weekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
                break;
            case 'month':
                key = date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
                break;
        }

        salesData[key] = (salesData[key] || 0) + getInvoiceAmount(invoice);
        if (!labels.includes(key)) {
            labels.push(key);
        }
    });

    // Sort labels chronologically
    if (granularity === 'day' || granularity === 'week') {
        // For day and week views, we need to sort by actual date
        labels.sort((a, b) => {
            const dateA = new Date(a);
            const dateB = new Date(b);
            return dateA - dateB;
        });
    }

    // Prepare chart data
    const data = labels.map(label => salesData[label] || 0);

    // Update chart
    const chart = Chart.getChart('salesTrendChart');
    chart.data.labels = labels;
    chart.data.datasets = [{
        label: 'Sales',
        data: data,
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        tension: 0.3,
        fill: true
    }];
    chart.update();
}

// Load customer distribution chart
function loadCustomerDistributionChart(invoices) {
    // Group sales by customer
    const customerData = {};

    invoices.forEach(invoice => {
        const customerName = invoice.customerName || 'Unknown Customer';
        customerData[customerName] = (customerData[customerName] || 0) + getInvoiceAmount(invoice);
    });

    // Sort customers by sales (descending)
    const sortedCustomers = Object.entries(customerData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5); // Top 5 customers

    const labels = sortedCustomers.map(item => item[0]);
    const data = sortedCustomers.map(item => item[1]);
    const totalSales = data.reduce((sum, val) => sum + val, 0);

    // Generate colors
    const backgroundColors = [
        'rgba(255, 99, 132, 0.7)',
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 206, 86, 0.7)',
        'rgba(75, 192, 192, 0.7)',
        'rgba(153, 102, 255, 0.7)'
    ];

    // Update chart
    const chart = Chart.getChart('customerDistributionChart');
    chart.data.labels = labels;
    chart.data.datasets = [{
        data: data,
        backgroundColor: backgroundColors,
        total: totalSales
    }];
    chart.update();
}

// Load tax breakdown chart
function loadTaxBreakdownChart(invoices) {
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;

    invoices.forEach(invoice => {
        // Try multiple possible structures for tax data
        if (invoice.taxData) {
            cgstTotal += parseFloat(invoice.taxData.cgstAmount || 0) || 0;
            sgstTotal += parseFloat(invoice.taxData.sgstAmount || 0) || 0;
            igstTotal += parseFloat(invoice.taxData.igstAmount || 0) || 0;
        } else {
            // Alternative structure
            cgstTotal += parseFloat(invoice.cgstAmount || 0) || 0;
            sgstTotal += parseFloat(invoice.sgstAmount || 0) || 0;
            igstTotal += parseFloat(invoice.igstAmount || 0) || 0;
        }
    });

    // Update chart
    const chart = Chart.getChart('taxBreakdownChart');
    chart.data.labels = ['CGST', 'SGST', 'IGST'];
    chart.data.datasets = [{
        label: 'Tax Amount',
        data: [cgstTotal, sgstTotal, igstTotal],
        backgroundColor: [
            'rgba(255, 99, 132, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 206, 86, 0.7)'
        ]
    }];
    chart.update();
}

// Load product performance chart
function loadProductPerformanceChart(metric, invoices) {
    const productData = {};

    invoices.forEach(invoice => {
        // Try to handle different property names and structures
        let products = [];

        // Check for products in various possible properties
        if (Array.isArray(invoice.products)) {
            products = invoice.products;
        } else if (invoice.items && typeof invoice.items === 'object') {
            products = Object.values(invoice.items);
        } else if (invoice.productData && Array.isArray(invoice.productData)) {
            products = invoice.productData;
        }

        // If we still couldn't find products, log a warning
        if (products.length === 0) {
            console.warn('No product data found in invoice:', invoice.invoiceNo);
            return; // Skip this invoice
        }

        products.forEach(product => {
            const description = product.description ||
                product.productDescription ||
                product.product ||
                'Unnamed Product';

            const qty = parseFloat(product.qty || product.quantity || 0) || 0;
            const rate = parseFloat(product.rate || product.unitPrice || 0) || 0;
            const amount = parseFloat(product.amount || (qty * rate) || 0) || 0;

            if (!productData[description]) {
                productData[description] = { quantity: 0, revenue: 0 };
            }

            productData[description].quantity += qty;
            productData[description].revenue += amount;
        });
    });

    // Sort products by selected metric
    const sortedProducts = Object.entries(productData)
        .sort((a, b) => b[1][metric] - a[1][metric])
        .slice(0, 5); // Top 5 products

    const labels = sortedProducts.map(item => item[0]);
    const data = sortedProducts.map(item => item[1][metric]);
    const label = metric === 'quantity' ? 'Quantity' : 'Revenue';

    // Update chart
    const chart = Chart.getChart('productPerformanceChart');
    chart.data.labels = labels;
    chart.data.datasets = [{
        label: label,
        data: data,
        backgroundColor: 'rgba(75, 192, 192, 0.7)'
    }];

    // Update options based on metric
    if (metric === 'revenue') {
        chart.options.scales.y.ticks.callback = function (value) {
            return '₹' + value.toLocaleString('en-IN');
        };
    } else {
        chart.options.scales.y.ticks.callback = function (value) {
            return value;
        };
    }

    chart.update();
}

// Update recent invoices table
function updateRecentInvoicesTable(invoices) {
    const tbody = document.querySelector('#recentInvoicesTable tbody');
    tbody.innerHTML = '';

    // Sort invoices by date (newest first)
    const sortedInvoices = [...invoices].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

    if (sortedInvoices.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="no-data">No recent invoices found</td>
            </tr>
        `;
        return;
    }

    sortedInvoices.forEach(invoice => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${invoice.invoiceNo}</td>
            <td>${new Date(invoice.date).toLocaleDateString('en-IN')}</td>
            <td>${invoice.customerName || 'Unknown'}</td>
            <td>${formatCurrency(getInvoiceAmount(invoice))}</td>
            <td>${invoice.status || 'Pending'}</td>
            <td>
                <button class="view-btn" data-invoice="${invoice.invoiceNo}">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Add event listeners to view buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const invoiceNo = this.getAttribute('data-invoice');
            window.location.href = `invoice-history.html?invoice=${invoiceNo}`;
        });
    });
}

// Database functions (same as in script.js)
const DB_NAME = 'InvoiceDB';
const DB_VERSION = 1;
const STORE_NAME = 'invoices';

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = function (event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                store.createIndex('invoiceNo', 'invoiceNo', { unique: true });
                store.createIndex('customerName', 'customerName', { unique: false });
                store.createIndex('date', 'date', { unique: false });
                // Add new indexes for the new fields
                store.createIndex('paidAmount', 'paidAmount', { unique: false });
                store.createIndex('status', 'status', { unique: false });
            }
        };

        request.onsuccess = function (event) {
            resolve(event.target.result);
        };

        request.onerror = function (event) {
            reject('Database error: ' + event.target.errorCode);
        };
    });
}

async function getAllInvoices() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);

        const request = store.getAll();

        request.onsuccess = function () {
            resolve(request.result);
        };

        request.onerror = function (event) {
            reject('Error getting invoices: ' + event.target.errorCode);
        };
    });
}
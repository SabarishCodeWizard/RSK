// Check if user is logged in
if (sessionStorage.getItem('isLoggedIn') !== 'true') {
    window.location.href = 'login.html';
}


// Database initialization
let db;

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('PRFabricsInvoicesDB', 1);

        request.onerror = function (event) {
            console.error('Database error:', event.target.error);
            reject('Database error');
        };

        request.onupgradeneeded = function (event) {
            db = event.target.result;

            // Create an object store for invoices
            const invoiceStore = db.createObjectStore('invoices', { keyPath: 'invoiceNo' });

            // Create indexes for searching
            invoiceStore.createIndex('customerName', 'customerName', { unique: false });
            invoiceStore.createIndex('invoiceDate', 'invoiceDate', { unique: false });
        };

        request.onsuccess = function (event) {
            db = event.target.result;
            resolve();
        };
    });
}

// Function to save invoice to database
function saveInvoiceToDB() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database not initialized');
            return;
        }

        const transaction = db.transaction(['invoices'], 'readwrite');
        const invoiceStore = transaction.objectStore('invoices');

        const invoiceData = getInvoiceData();

        const request = invoiceStore.put(invoiceData);

        request.onsuccess = function () {
            resolve();
        };

        request.onerror = function (event) {
            console.error('Error saving invoice:', event.target.error);
            reject('Error saving invoice');
        };
    });
}

// Function to get all invoice data
function getInvoiceData() {
    const invoiceNo = document.getElementById('invoiceNo').value;
    const invoiceDate = document.getElementById('invoiceDate').value;
    const customerName = document.getElementById('customerName').value;
    const customerAddress = document.getElementById('customerAddress').value;
    const customerGSTIN = document.getElementById('customerGSTIN').value;
    const state = document.getElementById('state').value;
    const stateCode = document.getElementById('stateCode').value;
    const transportMode = document.getElementById('transportMode').value;
    const vehicleNumber = document.getElementById('vehicleNumber').value;
    const supplyDate = document.getElementById('supplyDate').value;
    const placeOfSupply = document.getElementById('placeOfSupply').value;
    const reverseCharge = document.getElementById('reverseCharge').value;
    const grandTotal = document.getElementById('grandTotal').textContent;
    const amountInWords = document.getElementById('amountInWords').textContent;

    // Get product data
    const products = [];
    const rows = document.getElementById('productTableBody').rows;
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        products.push({
            sno: row.cells[0].textContent,
            description: row.querySelector('.product-description').value,
            hsnCode: row.querySelector('.hsn-code').value,
            qty: row.querySelector('.qty').value,
            rate: row.querySelector('.rate').value,
            amount: row.querySelector('.amount').textContent,
            taxableValue: row.querySelector('.taxable-value').textContent
        });
    }

    // Get tax data
    const taxData = {
        subTotal: document.getElementById('subTotal').textContent,
        cgstRate: document.getElementById('cgstRate').value,
        cgstAmount: document.getElementById('cgstAmount').textContent,
        sgstRate: document.getElementById('sgstRate').value,
        sgstAmount: document.getElementById('sgstAmount').textContent,
        igstRate: document.getElementById('igstRate').value,
        igstAmount: document.getElementById('igstAmount').textContent,
        totalTaxAmount: document.getElementById('totalTaxAmount').textContent,
        roundOff: document.getElementById('roundOff').textContent,
        grandTotal: grandTotal
    };

    return {
        invoiceNo,
        invoiceDate,
        customerName,
        customerAddress,
        customerGSTIN,
        state,
        stateCode,
        transportMode,
        vehicleNumber,
        supplyDate,
        placeOfSupply,
        reverseCharge,
        products,
        taxData,
        grandTotal,
        amountInWords,
        createdAt: new Date().toISOString()
    };
}

// Function to search invoices
function searchInvoices() {
    const invoiceNo = document.getElementById('searchInvoiceNo').value.trim();
    const customerName = document.getElementById('searchCustomer').value.trim();
    const dateFrom = document.getElementById('searchDateFrom').value;
    const dateTo = document.getElementById('searchDateTo').value;

    const transaction = db.transaction(['invoices'], 'readonly');
    const invoiceStore = transaction.objectStore('invoices');

    let request;

    if (invoiceNo) {
        // Search by exact invoice number
        request = invoiceStore.get(invoiceNo);
        request.onsuccess = function (event) {
            const result = event.target.result;
            displaySearchResults(result ? [result] : []);
        };
    } else {
        // Search by other criteria
        const results = [];
        let index;

        if (customerName) {
            index = invoiceStore.index('customerName');
            request = index.openCursor(IDBKeyRange.only(customerName));
        } else if (dateFrom || dateTo) {
            index = invoiceStore.index('invoiceDate');
            const range = dateFrom && dateTo
                ? IDBKeyRange.bound(dateFrom, dateTo)
                : dateFrom
                    ? IDBKeyRange.lowerBound(dateFrom)
                    : IDBKeyRange.upperBound(dateTo);
            request = index.openCursor(range);
        } else {
            // Get all invoices if no search criteria
            request = invoiceStore.openCursor();
        }

        request.onsuccess = function (event) {
            const cursor = event.target.result;
            if (cursor) {
                results.push(cursor.value);
                cursor.continue();
            } else {
                displaySearchResults(results);
            }
        };
    }

    request.onerror = function (event) {
        console.error('Search error:', event.target.error);
    };
}

// Function to display search results
function displaySearchResults(invoices) {
    const tbody = document.getElementById('invoiceResultsBody');
    tbody.innerHTML = '';

    if (invoices.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="5">No invoices found</td>';
        tbody.appendChild(row);
        return;
    }

    invoices.forEach(invoice => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${invoice.invoiceNo}</td>
            <td>${formatDate(invoice.invoiceDate)}</td>
            <td>${invoice.customerName}</td>
            <td>₹${invoice.grandTotal}</td>
            <td><button class="view-invoice-btn" data-invoice="${invoice.invoiceNo}">View</button></td>
        `;
        tbody.appendChild(row);
    });

    // Add event listeners to view buttons
    document.querySelectorAll('.view-invoice-btn').forEach(button => {
        button.addEventListener('click', function () {
            loadInvoice(this.getAttribute('data-invoice'));
        });
    });
}

// Function to load an invoice from DB
function loadInvoice(invoiceNo) {
    const transaction = db.transaction(['invoices'], 'readonly');
    const invoiceStore = transaction.objectStore('invoices');
    const request = invoiceStore.get(invoiceNo);

    request.onsuccess = function (event) {
        const invoice = event.target.result;
        if (invoice) {
            populateInvoiceForm(invoice);
        } else {
            alert('Invoice not found');
        }
    };

    request.onerror = function (event) {
        console.error('Error loading invoice:', event.target.error);
        alert('Error loading invoice');
    };
}

// Function to populate form with invoice data
function populateInvoiceForm(invoice) {
    // Basic info
    document.getElementById('invoiceNo').value = invoice.invoiceNo;
    document.getElementById('invoiceDate').value = invoice.invoiceDate;
    document.getElementById('customerName').value = invoice.customerName;
    document.getElementById('customerAddress').value = invoice.customerAddress;
    document.getElementById('customerGSTIN').value = invoice.customerGSTIN;
    document.getElementById('state').value = invoice.state;
    document.getElementById('stateCode').value = invoice.stateCode;
    document.getElementById('transportMode').value = invoice.transportMode;
    document.getElementById('vehicleNumber').value = invoice.vehicleNumber;
    document.getElementById('supplyDate').value = invoice.supplyDate;
    document.getElementById('placeOfSupply').value = invoice.placeOfSupply;
    document.getElementById('reverseCharge').value = invoice.reverseCharge;

    // Clear existing product rows
    const tbody = document.getElementById('productTableBody');
    tbody.innerHTML = '';

    // Add product rows
    invoice.products.forEach((product, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><input type="text" class="product-description" value="${product.description}"></td>
            <td><input type="text" class="hsn-code" value="${product.hsnCode}"></td>
            <td><input type="number" class="qty" value="${product.qty}"></td>
            <td><input type="number" class="rate" value="${product.rate}" step="0.01"></td>
            <td class="amount">${product.amount}</td>
            <td class="taxable-value">${product.taxableValue}</td>
            <td><button class="remove-row">X</button></td>
        `;
        tbody.appendChild(row);
    });

    // Add tax data
    document.getElementById('cgstRate').value = invoice.taxData.cgstRate;
    document.getElementById('sgstRate').value = invoice.taxData.sgstRate;
    document.getElementById('igstRate').value = invoice.taxData.igstRate;

    // Update calculated fields
    document.getElementById('subTotal').textContent = invoice.taxData.subTotal;
    document.getElementById('cgstAmount').textContent = invoice.taxData.cgstAmount;
    document.getElementById('sgstAmount').textContent = invoice.taxData.sgstAmount;
    document.getElementById('igstAmount').textContent = invoice.taxData.igstAmount;
    document.getElementById('totalTaxAmount').textContent = invoice.taxData.totalTaxAmount;
    document.getElementById('roundOff').textContent = invoice.taxData.roundOff;
    document.getElementById('grandTotal').textContent = invoice.taxData.grandTotal;
    document.getElementById('amountInWords').textContent = invoice.amountInWords;
}

// Helper function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN');
}

// Update the DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', async function () {
    // Set current date as default for invoice date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoiceDate').value = today;
    document.getElementById('supplyDate').value = today;
    document.getElementById('searchDateFrom').value = today;
    document.getElementById('searchDateTo').value = today;

    // Initialize database
    try {
        await initDB();
        console.log('Database initialized');
    } catch (error) {
        console.error('Failed to initialize database:', error);
    }

    // Event listeners for buttons
    document.getElementById('addRow').addEventListener('click', addProductRow);
    document.getElementById('resetForm').addEventListener('click', resetForm);
    document.getElementById('generatePDF').addEventListener('click', async function () {
        try {
            await saveInvoiceToDB();
            generatePDF();
        } catch (error) {
            console.error('Error saving invoice:', error);
            // Still generate PDF even if save fails
            generatePDF();
        }
    });
    document.getElementById('searchInvoices').addEventListener('click', searchInvoices);

    // Event delegation for table row actions
    document.getElementById('productTable').addEventListener('click', function (e) {
        if (e.target.classList.contains('remove-row')) {
            removeProductRow(e.target);
        }
    });

    // Event delegation for calculations
    document.getElementById('productTable').addEventListener('input', function (e) {
        if (e.target.classList.contains('qty') || e.target.classList.contains('rate')) {
            const row = e.target.closest('tr');
            calculateRowTotal(row);
            updateTotals();
        }
    });

    // Event listeners for tax rate changes
    document.getElementById('cgstRate').addEventListener('input', updateTotals);
    document.getElementById('sgstRate').addEventListener('input', updateTotals);
    document.getElementById('igstRate').addEventListener('input', updateTotals);

    // Add one row by default
    addProductRow();
});

// ... (keep all your existing functions like addProductRow, removeProductRow, etc.)

// Add this function to handle invoice deletion
function deleteInvoice(invoiceNo) {
    if (confirm(`Are you sure you want to delete invoice ${invoiceNo}? This action cannot be undone.`)) {
        const transaction = db.transaction(['invoices'], 'readwrite');
        const invoiceStore = transaction.objectStore('invoices');
        const request = invoiceStore.delete(invoiceNo);

        request.onsuccess = function () {
            alert(`Invoice ${invoiceNo} deleted successfully`);
            searchInvoices(); // Refresh the results
        };

        request.onerror = function (event) {
            console.error('Error deleting invoice:', event.target.error);
            alert('Error deleting invoice');
        };
    }
}

// Update the displaySearchResults function to include the remove button
function displaySearchResults(invoices) {
    const tbody = document.getElementById('invoiceResultsBody');
    tbody.innerHTML = '';

    if (invoices.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="5">No invoices found</td>';
        tbody.appendChild(row);
        return;
    }

    invoices.forEach(invoice => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${invoice.invoiceNo}</td>
            <td>${formatDate(invoice.invoiceDate)}</td>
            <td>${invoice.customerName}</td>
            <td>₹${invoice.grandTotal}</td>
            <td class="actions-cell">
                <button class="view-invoice-btn" data-invoice="${invoice.invoiceNo}">View</button>
                <button class="remove-invoice-btn" data-invoice="${invoice.invoiceNo}">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Add event listeners to view buttons
    document.querySelectorAll('.view-invoice-btn').forEach(button => {
        button.addEventListener('click', function () {
            loadInvoice(this.getAttribute('data-invoice'));
        });
    });

    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-invoice-btn').forEach(button => {
        button.addEventListener('click', function () {
            deleteInvoice(this.getAttribute('data-invoice'));
        });
    });
}
// script.js - Main application logic for index.html
document.addEventListener('DOMContentLoaded', async function () {
    // Initialize database
    await invoiceDB.init();

    // Set current date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoiceDate').value = today;
    document.getElementById('supplyDate').value = today;

    // Generate invoice number
    const invoiceNumber = await Utils.generateInvoiceNumber();
    document.getElementById('invoiceNo').value = invoiceNumber;

    // Auto-fill customer details on phone number input
    document.getElementById('customerPhone').addEventListener('blur', async function () {
        const phone = this.value.trim();

        if (Utils.isValidPhone(phone)) {
            const customer = await invoiceDB.getCustomer(phone);

            if (customer) {
                document.getElementById('customerName').value = customer.name || '';
                document.getElementById('customerAddress').value = customer.address || '';
                document.getElementById('customerGSTIN').value = customer.gstin || '';
            }
        }
    });

    // Save customer details when form is filled
    document.getElementById('customerName').addEventListener('blur', saveCustomerDetails);
    document.getElementById('customerAddress').addEventListener('blur', saveCustomerDetails);
    document.getElementById('customerGSTIN').addEventListener('blur', saveCustomerDetails);

    async function saveCustomerDetails() {
        const phone = document.getElementById('customerPhone').value.trim();
        const name = document.getElementById('customerName').value.trim();
        const address = document.getElementById('customerAddress').value.trim();
        const gstin = document.getElementById('customerGSTIN').value.trim();

        if (Utils.isValidPhone(phone) && name) {
            await invoiceDB.saveCustomer({
                phone,
                name,
                address,
                gstin
            });
        }
    }

    // Product shortcuts autocomplete
    document.addEventListener('input', async function (e) {
        if (e.target.classList.contains('product-description')) {
            const input = e.target.value.trim();

            if (input.length >= 2) {
                const shortcuts = await invoiceDB.getAllShortcuts();
                const matchedShortcut = shortcuts.find(s => s.shortcut === input);

                if (matchedShortcut) {
                    e.target.value = matchedShortcut.description;
                }
            }
        }
    });

    // Calculate row amounts
    document.addEventListener('input', function (e) {
        if (e.target.classList.contains('qty') || e.target.classList.contains('rate')) {
            const row = e.target.closest('tr');
            calculateRowAmount(row);
            calculateTotals();
        }
    });

    // Tax rate changes
    document.addEventListener('input', function (e) {
        if (e.target.classList.contains('tax-rate')) {
            calculateTotals();
        }
    });

    // Add new product row
    document.getElementById('addRow').addEventListener('click', function () {
        addProductRow();
    });

    // Remove product row
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('remove-row')) {
            e.target.closest('tr').remove();
            renumberRows();
            calculateTotals();
        }
    });

    // Generate PDF
    document.getElementById('generatePDF').addEventListener('click', function () {
        generatePDF();
    });

    // Save bill
    document.getElementById('saveBill').addEventListener('click', function () {
        saveBill();
    });

    // Reset form
    document.getElementById('resetForm').addEventListener('click', function () {
        resetForm();
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function () {
        sessionStorage.removeItem('isLoggedIn');
        window.location.href = 'login.html';
    });

    // Initialize with one row
    addProductRow();
});

function addProductRow() {
    const tbody = document.getElementById('productTableBody');
    const rowCount = tbody.children.length + 1;

    const row = document.createElement('tr');
    row.innerHTML = `
    <td>${rowCount}</td>
    <td><input type="text" class="product-description"></td>
    <td><input type="text" class="hsn-code"></td>
    <td><input type="number" class="qty" value="0"></td>
    <td><input type="number" class="rate" value="0.00" step="0.01"></td>
    <td class="amount">0.00</td>
    <td class="taxable-value">0.00</td>
    <td><button class="remove-row">X</button></td>
  `;

    tbody.appendChild(row);
}

function renumberRows() {
    const rows = document.querySelectorAll('#productTableBody tr');
    rows.forEach((row, index) => {
        row.cells[0].textContent = index + 1;
    });
}

function calculateRowAmount(row) {
    const qty = parseFloat(row.querySelector('.qty').value) || 0;
    const rate = parseFloat(row.querySelector('.rate').value) || 0;
    const amount = qty * rate;

    row.querySelector('.amount').textContent = Utils.formatCurrency(amount);
    row.querySelector('.taxable-value').textContent = Utils.formatCurrency(amount);
}

function calculateTotals() {
    let subTotal = 0;

    document.querySelectorAll('#productTableBody tr').forEach(row => {
        const taxableValue = parseFloat(row.querySelector('.taxable-value').textContent) || 0;
        subTotal += taxableValue;
    });

    const cgstRate = parseFloat(document.getElementById('cgstRate').value) || 0;
    const sgstRate = parseFloat(document.getElementById('sgstRate').value) || 0;
    const igstRate = parseFloat(document.getElementById('igstRate').value) || 0;

    const cgstAmount = (subTotal * cgstRate) / 100;
    const sgstAmount = (subTotal * sgstRate) / 100;
    const igstAmount = (subTotal * igstRate) / 100;

    const totalTaxAmount = cgstAmount + sgstAmount + igstAmount;
    const grandTotal = subTotal + totalTaxAmount;
    const roundOff = Math.round(grandTotal) - grandTotal;
    const finalTotal = grandTotal + roundOff;

    document.getElementById('subTotal').textContent = Utils.formatCurrency(subTotal);
    document.getElementById('cgstAmount').textContent = Utils.formatCurrency(cgstAmount);
    document.getElementById('sgstAmount').textContent = Utils.formatCurrency(sgstAmount);
    document.getElementById('igstAmount').textContent = Utils.formatCurrency(igstAmount);
    document.getElementById('totalTaxAmount').textContent = Utils.formatCurrency(totalTaxAmount);
    document.getElementById('roundOff').textContent = Utils.formatCurrency(roundOff);
    document.getElementById('grandTotal').textContent = Utils.formatCurrency(finalTotal);

    // Update amount in words
    document.getElementById('amountInWords').textContent = Utils.numberToWords(finalTotal);
}

async function saveBill() {
    const invoiceData = collectInvoiceData();

    try {
        await invoiceDB.saveInvoice(invoiceData);
        alert('Bill saved successfully!');
    } catch (error) {
        console.error('Error saving bill:', error);
        alert('Error saving bill. Please try again.');
    }
}

function collectInvoiceData() {
    const products = [];

    document.querySelectorAll('#productTableBody tr').forEach(row => {
        products.push({
            description: row.querySelector('.product-description').value,
            hsnCode: row.querySelector('.hsn-code').value,
            qty: parseFloat(row.querySelector('.qty').value) || 0,
            rate: parseFloat(row.querySelector('.rate').value) || 0,
            amount: parseFloat(row.querySelector('.amount').textContent) || 0,
            taxableValue: parseFloat(row.querySelector('.taxable-value').textContent) || 0
        });
    });

    return {
        invoiceNumber: document.getElementById('invoiceNo').value,
        date: document.getElementById('invoiceDate').value,
        customerPhone: document.getElementById('customerPhone').value,
        customerName: document.getElementById('customerName').value,
        customerAddress: document.getElementById('customerAddress').value,
        customerGSTIN: document.getElementById('customerGSTIN').value,
        state: document.getElementById('state').value,
        stateCode: document.getElementById('stateCode').value,
        transportMode: document.getElementById('transportMode').value,
        vehicleNumber: document.getElementById('vehicleNumber').value,
        supplyDate: document.getElementById('supplyDate').value,
        placeOfSupply: document.getElementById('placeOfSupply').value,
        reverseCharge: document.getElementById('reverseCharge').value,
        products: products,
        subTotal: parseFloat(document.getElementById('subTotal').textContent) || 0,
        cgstRate: parseFloat(document.getElementById('cgstRate').value) || 0,
        sgstRate: parseFloat(document.getElementById('sgstRate').value) || 0,
        igstRate: parseFloat(document.getElementById('igstRate').value) || 0,
        cgstAmount: parseFloat(document.getElementById('cgstAmount').textContent) || 0,
        sgstAmount: parseFloat(document.getElementById('sgstAmount').textContent) || 0,
        igstAmount: parseFloat(document.getElementById('igstAmount').textContent) || 0,
        totalTaxAmount: parseFloat(document.getElementById('totalTaxAmount').textContent) || 0,
        roundOff: parseFloat(document.getElementById('roundOff').textContent) || 0,
        grandTotal: parseFloat(document.getElementById('grandTotal').textContent) || 0,
        amountInWords: document.getElementById('amountInWords').textContent,
        createdAt: new Date().toISOString()
    };
}

function resetForm() {
    if (confirm('Are you sure you want to reset the form? All unsaved data will be lost.')) {
        document.querySelectorAll('input').forEach(input => {
            if (input.type !== 'button' && input.type !== 'submit') {
                input.value = '';
            }
        });

        document.getElementById('invoiceDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('supplyDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('cgstRate').value = 9;
        document.getElementById('sgstRate').value = 9;
        document.getElementById('igstRate').value = 0;
        document.getElementById('reverseCharge').value = 'N';
        document.getElementById('state').value = 'TAMILNADU';
        document.getElementById('stateCode').value = '33';

        // Clear product table
        document.getElementById('productTableBody').innerHTML = '';
        addProductRow();

        // Reset calculations
        calculateTotals();

        // Generate new invoice number
        Utils.generateInvoiceNumber().then(invoiceNumber => {
            document.getElementById('invoiceNo').value = invoiceNumber;
        });
    }
}
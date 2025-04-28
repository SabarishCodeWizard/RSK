// Logout functionality
document.getElementById('logoutBtn').addEventListener('click', function() {
    sessionStorage.removeItem('isLoggedIn');
    window.location.href = 'login.html';
});



// Add this at the top of script.js
const DB_NAME = 'InvoiceDB';
const DB_VERSION = 1;
const STORE_NAME = 'invoices';

// Initialize the database
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                store.createIndex('invoiceNo', 'invoiceNo', { unique: true });
                store.createIndex('customerName', 'customerName', { unique: false });
                store.createIndex('date', 'date', { unique: false });
            }
        };
        
        request.onsuccess = function(event) {
            resolve(event.target.result);
        };
        
        request.onerror = function(event) {
            reject('Database error: ' + event.target.errorCode);
        };
    });
}

// Save invoice to database
async function saveInvoiceToDB(invoiceData) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const request = store.add(invoiceData);
        
        request.onsuccess = function() {
            resolve(request.result);
        };
        
        request.onerror = function(event) {
            reject('Error saving invoice: ' + event.target.errorCode);
        };
    });
}

// Get all invoices from database
async function getAllInvoices() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        
        const request = store.getAll();
        
        request.onsuccess = function() {
            resolve(request.result);
        };
        
        request.onerror = function(event) {
            reject('Error getting invoices: ' + event.target.errorCode);
        };
    });
}

// Search invoices
async function searchInvoices(query) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('customerName');
        
        const request = index.getAll(query);
        
        request.onsuccess = function() {
            resolve(request.result);
        };
        
        request.onerror = function(event) {
            reject('Error searching invoices: ' + event.target.errorCode);
        };
    });
}

// Delete invoice
async function deleteInvoice(id) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const request = store.delete(id);
        
        request.onsuccess = function() {
            resolve(true);
        };
        
        request.onerror = function(event) {
            reject('Error deleting invoice: ' + event.target.errorCode);
        };
    });
}

// Get the last invoice number
async function getLastInvoiceNo() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('invoiceNo');
        
        const request = index.openCursor(null, 'prev');
        let lastInvoiceNo = '001'; // Default
        
        request.onsuccess = function(event) {
            const cursor = event.target.result;
            if (cursor) {
                lastInvoiceNo = cursor.value.invoiceNo;
                resolve(lastInvoiceNo);
            } else {
                resolve(lastInvoiceNo);
            }
        };
        
        request.onerror = function(event) {
            reject('Error getting last invoice: ' + event.target.errorCode);
        };
    });
}




document.addEventListener('DOMContentLoaded', async function () { // Added async here
    // Set current date as default for invoice date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoiceDate').value = today;
    document.getElementById('supplyDate').value = today;

    // Event listeners for buttons
    document.getElementById('addRow').addEventListener('click', addProductRow);
    document.getElementById('resetForm').addEventListener('click', resetForm);
    document.getElementById('generatePDF').addEventListener('click', generatePDF);

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

    try {
        const lastInvoiceNo = await getLastInvoiceNo();
        if (lastInvoiceNo) {
            // Increment invoice number
            const nextNum = parseInt(lastInvoiceNo) + 1;
            document.getElementById('invoiceNo').value = nextNum.toString().padStart(3, '0');
        }
    } catch (error) {
        console.error('Error getting last invoice number:', error);
        // Set a default invoice number if there's an error
        document.getElementById('invoiceNo').value = '001';
    }

    // Add one row by default
    addProductRow();
});

// Function to add new product row
function addProductRow() {
    const tbody = document.getElementById('productTableBody');
    const rowCount = tbody.rows.length + 1;

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

// Function to remove product row
function removeProductRow(button) {
    const row = button.closest('tr');
    if (document.getElementById('productTableBody').rows.length > 1) {
        row.remove();
        updateRowNumbers();
        updateTotals();
    } else {
        alert('Cannot remove the last row');
    }
}

// Function to update row numbers after deletion
function updateRowNumbers() {
    const rows = document.getElementById('productTableBody').rows;
    for (let i = 0; i < rows.length; i++) {
        rows[i].cells[0].textContent = i + 1;
    }
}

// Function to calculate row totals
function calculateRowTotal(row) {
    const qty = parseFloat(row.querySelector('.qty').value) || 0;
    const rate = parseFloat(row.querySelector('.rate').value) || 0;
    const amount = qty * rate;

    row.querySelector('.amount').textContent = amount.toFixed(2);
    row.querySelector('.taxable-value').textContent = amount.toFixed(2);
}

// Function to update all totals
function updateTotals() {
    const rows = document.getElementById('productTableBody').rows;
    let subTotal = 0;

    // Calculate subtotal
    for (let i = 0; i < rows.length; i++) {
        const amount = parseFloat(rows[i].querySelector('.amount').textContent) || 0;
        subTotal += amount;
    }

    // Update subtotal display
    document.getElementById('subTotal').textContent = subTotal.toFixed(2);

    // Calculate tax amounts
    const cgstRate = parseFloat(document.getElementById('cgstRate').value) || 0;
    const sgstRate = parseFloat(document.getElementById('sgstRate').value) || 0;
    const igstRate = parseFloat(document.getElementById('igstRate').value) || 0;

    const cgstAmount = (subTotal * cgstRate) / 100;
    const sgstAmount = (subTotal * sgstRate) / 100;
    const igstAmount = (subTotal * igstRate) / 100;

    // Update tax amount displays
    document.getElementById('cgstAmount').textContent = cgstAmount.toFixed(2);
    document.getElementById('sgstAmount').textContent = sgstAmount.toFixed(2);
    document.getElementById('igstAmount').textContent = igstAmount.toFixed(2);

    // Calculate total tax
    const totalTaxAmount = cgstAmount + sgstAmount + igstAmount;
    document.getElementById('totalTaxAmount').textContent = totalTaxAmount.toFixed(2);

    // Calculate grand total
    const grandTotalExact = subTotal + totalTaxAmount;
    const grandTotal = Math.round(grandTotalExact);

    // Calculate round off
    const roundOff = grandTotal - grandTotalExact;
    document.getElementById('roundOff').textContent = roundOff.toFixed(2);

    // Update grand total
    document.getElementById('grandTotal').textContent = grandTotal.toFixed(2);

    // Update amount in words
    document.getElementById('amountInWords').textContent = numberToWords(grandTotal) + ' rupees only';
}

// Function to reset the form
function resetForm() {
    if (confirm('Are you sure you want to reset the form? All data will be lost.')) {
        const tbody = document.getElementById('productTableBody');
        tbody.innerHTML = '';

        // Reset invoice details
        document.getElementById('invoiceNo').value = '';
        document.getElementById('customerName').value = '';
        document.getElementById('customerAddress').value = '';
        document.getElementById('customerGSTIN').value = '';
        document.getElementById('transportMode').value = '';
        document.getElementById('vehicleNumber').value = '';
        document.getElementById('placeOfSupply').value = '';

        // Reset calculation fields
        document.getElementById('cgstRate').value = '2.5';
        document.getElementById('sgstRate').value = '2.5';
        document.getElementById('igstRate').value = '0';

        // Add one empty row
        addProductRow();

        // Update totals
        updateTotals();
    }
}

// Modify the generatePDF function to save data to DB
async function generatePDF() {
    // Hide buttons before generating PDF
    const removeButtons = document.querySelectorAll('.remove-row');
    const addRowButton = document.getElementById('addRow');

    removeButtons.forEach(button => {
        button.style.display = 'none';
    });

    addRowButton.style.display = 'none';

    // Use html2canvas to convert the invoice to an image
    html2canvas(document.getElementById('invoice')).then(async canvas => {
        const imgData = canvas.toDataURL('image/png');

        // Initialize jsPDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        // Calculate dimensions
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = canvas.height * imgWidth / canvas.width;

        // Add image to PDF
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

        // Get invoice data
        const invoiceNo = document.getElementById('invoiceNo').value || 'Invoice';
        const customerName = document.getElementById('customerName').value || 'Customer';
        const invoiceDate = document.getElementById('invoiceDate').value;
        const grandTotal = document.getElementById('grandTotal').textContent;

        // Save to database
        const invoiceData = {
            invoiceNo,
            customerName,
            date: invoiceDate,
            total: grandTotal,
            pdfData: imgData, // Storing the image data for preview
            timestamp: new Date().getTime()
        };

        try {
            await saveInvoiceToDB(invoiceData);
            // Save the PDF
            pdf.save(`${invoiceNo}_${customerName}.pdf`);
        } catch (error) {
            console.error('Error saving invoice:', error);
            alert('Error saving invoice to database');
        }

        // Show buttons again
        removeButtons.forEach(button => {
            button.style.display = 'inline-block';
        });

        addRowButton.style.display = 'inline-block';
    });
}
// Function to convert number to words
function numberToWords(num) {
    const units = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
        'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    if (num === 0) return 'zero';

    function convertLessThanOneThousand(num) {
        if (num < 20) {
            return units[num];
        }

        const digit = num % 10;
        if (num < 100) {
            return tens[Math.floor(num / 10)] + (digit ? '-' + units[digit] : '');
        }

        return units[Math.floor(num / 100)] + ' hundred' + (num % 100 ? ' and ' + convertLessThanOneThousand(num % 100) : '');
    }

    let result = '';

    // Handle lakhs (100,000s)
    if (num >= 100000) {
        result += convertLessThanOneThousand(Math.floor(num / 100000)) + ' lakh ';
        num %= 100000;
    }

    // Handle thousands
    if (num >= 1000) {
        result += convertLessThanOneThousand(Math.floor(num / 1000)) + ' thousand ';
        num %= 1000;
    }

    // Handle hundreds and remainder
    if (num > 0) {
        result += convertLessThanOneThousand(num);
    }

    return result.trim();
}

// Logout functionality
document.getElementById('logoutBtn').addEventListener('click', function() {
    sessionStorage.removeItem('isLoggedIn');
    window.location.href = 'login.html';
});
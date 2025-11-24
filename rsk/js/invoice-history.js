// invoice-history.js - Invoice history page functionality
document.addEventListener('DOMContentLoaded', async function () {
    await invoiceDB.init();
    loadInvoices();

    // Filter functionality
    document.getElementById('filterBtn').addEventListener('click', loadInvoices);
    document.getElementById('clearFilters').addEventListener('click', clearFilters);

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function () {
        sessionStorage.removeItem('isLoggedIn');
        window.location.href = 'login.html';
    });

    // Modal close buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function () {
            this.closest('.modal').style.display = 'none';
        });
    });
});

async function loadInvoices() {
    const invoices = await invoiceDB.getAllInvoices();
    const filteredInvoices = filterInvoices(invoices);
    displayInvoices(filteredInvoices);
}

function filterInvoices(invoices) {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;

    return invoices.filter(invoice => {
        // Search filter
        const matchesSearch = !searchTerm ||
            invoice.invoiceNumber.toLowerCase().includes(searchTerm) ||
            invoice.customerName.toLowerCase().includes(searchTerm) ||
            invoice.customerPhone.includes(searchTerm);

        // Date filter
        const invoiceDate = new Date(invoice.date);
        const fromDate = dateFrom ? new Date(dateFrom) : null;
        const toDate = dateTo ? new Date(dateTo) : null;

        const matchesDate = (!fromDate || invoiceDate >= fromDate) &&
            (!toDate || invoiceDate <= toDate);

        return matchesSearch && matchesDate;
    });
}

function displayInvoices(invoices) {
    const invoiceList = document.getElementById('invoiceList');

    if (invoices.length === 0) {
        invoiceList.innerHTML = '<p>No invoices found.</p>';
        return;
    }

    invoiceList.innerHTML = invoices.map(invoice => `
    <div class="invoice-card">
      <div class="invoice-header">
        <h3>Invoice #${invoice.invoiceNumber}</h3>
        <span class="invoice-date">${Utils.formatDate(invoice.date)}</span>
      </div>
      <div class="invoice-details">
        <p><strong>Customer:</strong> ${invoice.customerName}</p>
        <p><strong>Phone:</strong> ${invoice.customerPhone}</p>
        <p><strong>Amount:</strong> ₹${Utils.formatCurrency(invoice.grandTotal)}</p>
      </div>
      <div class="invoice-actions">
        <button class="btn-view" onclick="viewInvoice(${invoice.id})">View</button>
        <button class="btn-edit" onclick="editInvoice(${invoice.id})">Edit</button>
        <button class="btn-share" onclick="shareInvoice(${invoice.id})">Share</button>
        <button class="btn-delete" onclick="confirmDelete(${invoice.id}, '${invoice.invoiceNumber}')">Delete</button>
      </div>
    </div>
  `).join('');
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    loadInvoices();
}

async function viewInvoice(id) {
    const invoice = await invoiceDB.getInvoice(id);

    // Create a view-only version of the invoice
    const invoiceHTML = generateInvoiceHTML(invoice, true);

    const newWindow = window.open('', '_blank');
    newWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice ${invoice.invoiceNumber}</title>
      <link rel="stylesheet" href="css/styles.css">
    </head>
    <body>
      ${invoiceHTML}
      <script>
        window.print();
      </script>
    </body>
    </html>
  `);
    newWindow.document.close();
}

async function editInvoice(id) {
    const invoice = await invoiceDB.getInvoice(id);
    const modal = document.getElementById('editInvoiceModal');
    const form = document.getElementById('editInvoiceForm');

    form.innerHTML = generateEditForm(invoice);
    modal.style.display = 'block';

    // Set up save button
    document.getElementById('saveEditedInvoice').addEventListener('click', async function () {
        await saveEditedInvoice(id);
    });
}

function generateEditForm(invoice) {
    return `
    <form id="invoiceEditForm">
      <div class="form-group">
        <label for="editCustomerName">Customer Name:</label>
        <input type="text" id="editCustomerName" value="${invoice.customerName}">
      </div>
      <div class="form-group">
        <label for="editCustomerPhone">Phone:</label>
        <input type="text" id="editCustomerPhone" value="${invoice.customerPhone}">
      </div>
      <div class="form-group">
        <label for="editCustomerAddress">Address:</label>
        <input type="text" id="editCustomerAddress" value="${invoice.customerAddress}">
      </div>
      <div class="form-group">
        <label for="editGrandTotal">Total Amount:</label>
        <input type="number" id="editGrandTotal" value="${invoice.grandTotal}" step="0.01">
      </div>
      <button type="button" id="saveEditedInvoice" class="btn-primary">Save Changes</button>
    </form>
  `;
}

async function saveEditedInvoice(id) {
    const invoice = await invoiceDB.getInvoice(id);

    // Update invoice with edited values
    invoice.customerName = document.getElementById('editCustomerName').value;
    invoice.customerPhone = document.getElementById('editCustomerPhone').value;
    invoice.customerAddress = document.getElementById('editCustomerAddress').value;
    invoice.grandTotal = parseFloat(document.getElementById('editGrandTotal').value);

    await invoiceDB.saveInvoice(invoice);

    document.getElementById('editInvoiceModal').style.display = 'none';
    loadInvoices();
    alert('Invoice updated successfully!');
}

function confirmDelete(id, invoiceNumber) {
    const modal = document.getElementById('deleteModal');
    document.getElementById('invoiceToDelete').textContent = invoiceNumber;
    document.getElementById('confirmInvoiceNumber').value = '';
    modal.style.display = 'block';

    // Set up delete confirmation
    document.getElementById('confirmDelete').onclick = function () {
        const enteredNumber = document.getElementById('confirmInvoiceNumber').value;

        if (enteredNumber === invoiceNumber) {
            deleteInvoice(id);
        } else {
            alert('Invoice number does not match. Please try again.');
        }
    };

    document.getElementById('cancelDelete').onclick = function () {
        modal.style.display = 'none';
    };
}

async function deleteInvoice(id) {
    await invoiceDB.deleteInvoice(id);
    document.getElementById('deleteModal').style.display = 'none';
    loadInvoices();
    alert('Invoice moved to recycle bin.');
}

async function shareInvoice(id) {
    const invoice = await invoiceDB.getInvoice(id);

    const message = `Invoice #${invoice.invoiceNumber}
  
Customer: ${invoice.customerName}
Date: ${Utils.formatDate(invoice.date)}
Total Amount: ₹${Utils.formatCurrency(invoice.grandTotal)}

Thank you for your business!
RSK ENTERPRISES`;

    Utils.shareOnWhatsApp(invoice.customerPhone, message);
}

function generateInvoiceHTML(invoice, isViewOnly = false) {
    // This would generate the HTML for the invoice similar to index.html
    // Implementation would be similar to the invoice structure in index.html
    // but with the data from the invoice object
    return `
    <div class="invoice-container">
      <!-- Invoice HTML structure with invoice data -->
    </div>
  `;
}
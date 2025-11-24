// recycle-bin.js - Recycle bin page functionality
document.addEventListener('DOMContentLoaded', async function () {
    await invoiceDB.init();
    loadDeletedInvoices();

    // Empty bin button
    document.getElementById('emptyBin').addEventListener('click', emptyRecycleBin);

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function () {
        sessionStorage.removeItem('isLoggedIn');
        window.location.href = 'login.html';
    });
});

async function loadDeletedInvoices() {
    const deletedInvoices = await invoiceDB.getAll(STORES.DELETED_INVOICES);
    displayDeletedInvoices(deletedInvoices);
}

function displayDeletedInvoices(invoices) {
    const container = document.getElementById('deletedInvoices');

    if (invoices.length === 0) {
        container.innerHTML = '<p>Recycle bin is empty.</p>';
        return;
    }

    container.innerHTML = invoices.map(invoice => `
    <div class="deleted-invoice-card">
      <div class="invoice-header">
        <h3>Invoice #${invoice.invoiceNumber}</h3>
        <span class="invoice-date">${Utils.formatDate(invoice.date)}</span>
      </div>
      <div class="invoice-details">
        <p><strong>Customer:</strong> ${invoice.customerName}</p>
        <p><strong>Phone:</strong> ${invoice.customerPhone}</p>
        <p><strong>Amount:</strong> ₹${Utils.formatCurrency(invoice.grandTotal)}</p>
        <p><strong>Deleted on:</strong> ${Utils.formatDate(invoice.deletedAt || invoice.createdAt)}</p>
      </div>
      <div class="invoice-actions">
        <button class="btn-restore" onclick="restoreInvoice(${invoice.id})">Restore</button>
        <button class="btn-delete" onclick="permanentlyDelete(${invoice.id})">Delete Permanently</button>
      </div>
    </div>
  `).join('');
}

async function restoreInvoice(id) {
    const invoice = await invoiceDB.get(STORES.DELETED_INVOICES, id);

    if (invoice) {
        // Restore to main invoices store
        await invoiceDB.saveInvoice(invoice);

        // Remove from deleted store
        await invoiceDB.delete(STORES.DELETED_INVOICES, id);

        loadDeletedInvoices();
        alert('Invoice restored successfully!');
    }
}

async function permanentlyDelete(id) {
    if (confirm('Are you sure you want to permanently delete this invoice? This action cannot be undone.')) {
        await invoiceDB.delete(STORES.DELETED_INVOICES, id);
        loadDeletedInvoices();
        alert('Invoice permanently deleted.');
    }
}

async function emptyRecycleBin() {
    if (confirm('Are you sure you want to empty the recycle bin? All deleted invoices will be permanently lost.')) {
        const deletedInvoices = await invoiceDB.getAll(STORES.DELETED_INVOICES);

        for (const invoice of deletedInvoices) {
            await invoiceDB.delete(STORES.DELETED_INVOICES, invoice.id);
        }

        loadDeletedInvoices();
        alert('Recycle bin emptied successfully!');
    }
}
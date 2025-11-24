// recycle-bin.js - Updated with professional modals
let currentInvoiceId = null;

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

    // Restore modal events
    setupRestoreModal();
    setupDeleteModal();
});

function setupRestoreModal() {
    const modal = document.getElementById('restoreModal');
    const confirmInput = document.getElementById('restoreConfirmInput');
    const confirmBtn = document.getElementById('confirmRestore');
    const cancelBtn = document.getElementById('cancelRestore');

    // Real-time validation
    confirmInput.addEventListener('input', function() {
        const isValid = this.value.trim().toUpperCase() === 'RESTORE';
        confirmBtn.disabled = !isValid;
        
        if (this.value && !isValid) {
            this.classList.add('error');
        } else {
            this.classList.remove('error');
        }
    });

    // Enter key support
    confirmInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !confirmBtn.disabled) {
            confirmBtn.click();
        }
    });

    // Confirm restore
    confirmBtn.addEventListener('click', async function() {
        if (currentInvoiceId) {
            await performRestore(currentInvoiceId);
            modal.style.display = 'none';
        }
    });

    // Cancel restore
    cancelBtn.addEventListener('click', function() {
        modal.style.display = 'none';
        resetModalInputs();
    });

    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
            resetModalInputs();
        }
    });
}

function setupDeleteModal() {
    const modal = document.getElementById('deleteModal');
    const confirmInput = document.getElementById('deleteConfirmInput');
    const confirmBtn = document.getElementById('confirmDelete');
    const cancelBtn = document.getElementById('cancelDelete');

    // Real-time validation
    confirmInput.addEventListener('input', function() {
        const isValid = this.value.trim().toUpperCase() === 'DELETE';
        confirmBtn.disabled = !isValid;
        
        if (this.value && !isValid) {
            this.classList.add('error');
        } else {
            this.classList.remove('error');
        }
    });

    // Enter key support
    confirmInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !confirmBtn.disabled) {
            confirmBtn.click();
        }
    });

    // Confirm delete
    confirmBtn.addEventListener('click', async function() {
        if (currentInvoiceId) {
            await performPermanentDelete(currentInvoiceId);
            modal.style.display = 'none';
        }
    });

    // Cancel delete
    cancelBtn.addEventListener('click', function() {
        modal.style.display = 'none';
        resetModalInputs();
    });

    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
            resetModalInputs();
        }
    });
}

function resetModalInputs() {
    document.getElementById('restoreConfirmInput').value = '';
    document.getElementById('deleteConfirmInput').value = '';
    document.getElementById('confirmRestore').disabled = true;
    document.getElementById('confirmDelete').disabled = true;
    currentInvoiceId = null;
}

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
                <button class="btn-restore" onclick="showRestoreModal(${invoice.id})">
                    <i class="fas fa-trash-restore"></i> Restore
                </button>
                <button class="btn-delete" onclick="showDeleteModal(${invoice.id})">
                    <i class="fas fa-fire-alt"></i> Delete Permanently
                </button>
            </div>
        </div>
    `).join('');
}

async function showRestoreModal(id) {
    const invoice = await invoiceDB.get(STORES.DELETED_INVOICES, id);
    if (!invoice) return;

    currentInvoiceId = id;
    
    // Populate modal with invoice data
    document.getElementById('restoreInvoiceNumber').textContent = invoice.invoiceNumber;
    document.getElementById('restoreCustomerName').textContent = invoice.customerName;
    document.getElementById('restoreInvoiceAmount').textContent = `₹${Utils.formatCurrency(invoice.grandTotal)}`;
    
    // Show modal
    document.getElementById('restoreModal').style.display = 'block';
    
    // Focus on input field
    setTimeout(() => {
        document.getElementById('restoreConfirmInput').focus();
    }, 100);
}

async function showDeleteModal(id) {
    const invoice = await invoiceDB.get(STORES.DELETED_INVOICES, id);
    if (!invoice) return;

    currentInvoiceId = id;
    
    // Populate modal with invoice data
    document.getElementById('deleteInvoiceNumber').textContent = invoice.invoiceNumber;
    document.getElementById('deleteCustomerName').textContent = invoice.customerName;
    document.getElementById('deleteInvoiceAmount').textContent = `₹${Utils.formatCurrency(invoice.grandTotal)}`;
    document.getElementById('deleteInvoiceDate').textContent = Utils.formatDate(invoice.deletedAt || invoice.createdAt);
    
    // Show modal
    document.getElementById('deleteModal').style.display = 'block';
    
    // Focus on input field
    setTimeout(() => {
        document.getElementById('deleteConfirmInput').focus();
    }, 100);
}

async function performRestore(id) {
    try {
        const invoice = await invoiceDB.get(STORES.DELETED_INVOICES, id);
        if (!invoice) return;

        // Restore to main invoices store
        await invoiceDB.saveInvoice(invoice);
        // Remove from deleted store
        await invoiceDB.delete(STORES.DELETED_INVOICES, id);

        loadDeletedInvoices();
        showSuccessToast('Invoice restored successfully!', 'success');
    } catch (error) {
        console.error('Error restoring invoice:', error);
        showSuccessToast('Error restoring invoice. Please try again.', 'error');
    }
}

async function performPermanentDelete(id) {
    try {
        await invoiceDB.delete(STORES.DELETED_INVOICES, id);
        loadDeletedInvoices();
        showSuccessToast('Invoice permanently deleted.', 'warning');
    } catch (error) {
        console.error('Error deleting invoice:', error);
        showSuccessToast('Error deleting invoice. Please try again.', 'error');
    }
}

function showSuccessToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    
    let icon = 'fa-check-circle';
    let bgColor = '#28a745';
    
    if (type === 'error') {
        icon = 'fa-exclamation-circle';
        bgColor = '#dc3545';
    } else if (type === 'warning') {
        icon = 'fa-exclamation-triangle';
        bgColor = '#ffc107';
        toast.style.color = '#212529';
    }
    
    toast.style.background = bgColor;
    toast.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
    
    document.body.appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 3000);
}

// Keep the existing emptyRecycleBin function
async function emptyRecycleBin() {
    if (confirm('Are you sure you want to empty the recycle bin? All deleted invoices will be permanently lost.')) {
        const deletedInvoices = await invoiceDB.getAll(STORES.DELETED_INVOICES);
        for (const invoice of deletedInvoices) {
            await invoiceDB.delete(STORES.DELETED_INVOICES, invoice.id);
        }
        loadDeletedInvoices();
        showSuccessToast('Recycle bin emptied successfully!', 'warning');
    }
}
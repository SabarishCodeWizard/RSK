// customer-details.js - Updated with professional modals
let currentCustomerPhone = null;

document.addEventListener('DOMContentLoaded', async function () {
    await invoiceDB.init();
    loadCustomers();
    setupEventListeners();
});

function setupEventListeners() {
    // Search functionality
    document.getElementById('searchCustomer').addEventListener('input', loadCustomers);

    // Add customer button
    document.getElementById('addCustomerBtn').addEventListener('click', function () {
        openCustomerModal();
    });

    // Customer form submission
    document.getElementById('customerForm').addEventListener('submit', saveCustomer);

    // Modal close buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function () {
            this.closest('.modal').style.display = 'none';
        });
    });

    document.getElementById('cancelCustomer').addEventListener('click', function () {
        document.getElementById('customerModal').style.display = 'none';
    });

    // Success modal
    document.getElementById('successModalOk').addEventListener('click', function() {
        document.getElementById('successModal').style.display = 'none';
    });

    // Delete modal events
    setupDeleteModal();

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function () {
        sessionStorage.removeItem('isLoggedIn');
        window.location.href = 'login.html';
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
        if (currentCustomerPhone) {
            await performDeleteCustomer(currentCustomerPhone);
            modal.style.display = 'none';
            resetDeleteModal();
        }
    });

    // Cancel delete
    cancelBtn.addEventListener('click', function() {
        modal.style.display = 'none';
        resetDeleteModal();
    });

    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
            resetDeleteModal();
        }
    });
}

function resetDeleteModal() {
    document.getElementById('deleteConfirmInput').value = '';
    document.getElementById('confirmDelete').disabled = true;
    currentCustomerPhone = null;
}

async function loadCustomers() {
    const customers = await invoiceDB.getAllCustomers();
    const searchTerm = document.getElementById('searchCustomer').value.toLowerCase();

    const filteredCustomers = customers.filter(customer =>
        !searchTerm ||
        customer.name.toLowerCase().includes(searchTerm) ||
        customer.phone.includes(searchTerm) ||
        (customer.gstin && customer.gstin.toLowerCase().includes(searchTerm))
    );

    displayCustomers(filteredCustomers);
}

function displayCustomers(customers) {
    const customerList = document.getElementById('customerList');

    if (customers.length === 0) {
        customerList.innerHTML = '<p>No customers found.</p>';
        return;
    }

    customerList.innerHTML = customers.map(customer => `
        <div class="customer-card">
            <div class="customer-header">
                <h3>${customer.name}</h3>
                <span class="customer-phone">${customer.phone}</span>
            </div>
            <div class="customer-details">
                <p><strong>Address:</strong> ${customer.address || 'Not provided'}</p>
                <p><strong>GSTIN:</strong> ${customer.gstin || 'Not provided'}</p>
            </div>
            <div class="customer-actions">
                <button class="btn-edit" onclick="editCustomer('${customer.phone}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn-delete" onclick="showDeleteModal('${customer.phone}', '${customer.name.replace(/'/g, "\\'")}', '${customer.gstin || ''}')">
                    <i class="fas fa-trash-alt"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

function openCustomerModal(customer = null) {
    const modal = document.getElementById('customerModal');
    const title = document.getElementById('customerModalTitle');
    const form = document.getElementById('customerForm');

    if (customer) {
        title.textContent = 'Edit Customer';
        document.getElementById('modalCustomerPhone').value = customer.phone;
        document.getElementById('modalCustomerName').value = customer.name;
        document.getElementById('modalCustomerAddress').value = customer.address || '';
        document.getElementById('modalCustomerGSTIN').value = customer.gstin || '';

        // Make phone field read-only when editing
        document.getElementById('modalCustomerPhone').readOnly = true;
    } else {
        title.textContent = 'Add New Customer';
        form.reset();
        document.getElementById('modalCustomerPhone').readOnly = false;
    }

    modal.style.display = 'block';
}

async function saveCustomer(e) {
    e.preventDefault();

    const customer = {
        phone: document.getElementById('modalCustomerPhone').value.trim(),
        name: document.getElementById('modalCustomerName').value.trim(),
        address: document.getElementById('modalCustomerAddress').value.trim(),
        gstin: document.getElementById('modalCustomerGSTIN').value.trim()
    };

    if (!Utils.isValidPhone(customer.phone)) {
        showSuccessModal('Error', 'Please enter a valid 10-digit phone number.', 'error');
        return;
    }

    if (!customer.name) {
        showSuccessModal('Error', 'Please enter customer name.', 'error');
        return;
    }

    try {
        await invoiceDB.saveCustomer(customer);
        document.getElementById('customerModal').style.display = 'none';
        loadCustomers();
        showSuccessModal('Success', 'Customer saved successfully!', 'success');
    } catch (error) {
        console.error('Error saving customer:', error);
        showSuccessModal('Error', 'Error saving customer. Please try again.', 'error');
    }
}

async function editCustomer(phone) {
    const customer = await invoiceDB.getCustomer(phone);
    openCustomerModal(customer);
}

function showDeleteModal(phone, name, gstin) {
    currentCustomerPhone = phone;
    
    // Populate modal with customer data
    document.getElementById('deleteCustomerName').textContent = name;
    document.getElementById('deleteCustomerPhone').textContent = phone;
    document.getElementById('deleteCustomerGSTIN').textContent = gstin || 'Not provided';
    
    // Show modal
    document.getElementById('deleteModal').style.display = 'block';
    
    // Focus on input field
    setTimeout(() => {
        document.getElementById('deleteConfirmInput').focus();
    }, 100);
}

async function performDeleteCustomer(phone) {
    try {
        await invoiceDB.delete(STORES.CUSTOMERS, phone);
        loadCustomers();
        showSuccessToast('Customer deleted successfully!', 'warning');
    } catch (error) {
        console.error('Error deleting customer:', error);
        showSuccessToast('Error deleting customer. Please try again.', 'error');
    }
}

function showSuccessModal(title, message, type = 'success') {
    document.getElementById('successModalTitle').textContent = title;
    document.getElementById('successModalMessage').textContent = message;
    
    const modal = document.getElementById('successModal');
    const headerIcon = modal.querySelector('.modal-header i');
    
    if (type === 'error') {
        headerIcon.className = 'fas fa-exclamation-circle fa-lg';
        modal.className = 'confirmation-modal error-modal';
    } else {
        headerIcon.className = 'fas fa-check-circle fa-lg';
        modal.className = 'confirmation-modal success-modal';
    }
    
    modal.style.display = 'block';
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
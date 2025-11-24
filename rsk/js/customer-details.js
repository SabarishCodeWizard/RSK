// customer-details.js - Customer details page functionality
document.addEventListener('DOMContentLoaded', async function () {
    await invoiceDB.init();
    loadCustomers();

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

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function () {
        sessionStorage.removeItem('isLoggedIn');
        window.location.href = 'login.html';
    });
});

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
        <button class="btn-edit" onclick="editCustomer('${customer.phone}')">Edit</button>
        <button class="btn-delete" onclick="deleteCustomer('${customer.phone}', '${customer.name}')">Delete</button>
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
        alert('Please enter a valid 10-digit phone number.');
        return;
    }

    if (!customer.name) {
        alert('Please enter customer name.');
        return;
    }

    try {
        await invoiceDB.saveCustomer(customer);
        document.getElementById('customerModal').style.display = 'none';
        loadCustomers();
        alert('Customer saved successfully!');
    } catch (error) {
        console.error('Error saving customer:', error);
        alert('Error saving customer. Please try again.');
    }
}

async function editCustomer(phone) {
    const customer = await invoiceDB.getCustomer(phone);
    openCustomerModal(customer);
}

function deleteCustomer(phone, name) {
    if (confirm(`Are you sure you want to delete customer "${name}"?`)) {
        invoiceDB.delete(STORES.CUSTOMERS, phone)
            .then(() => {
                loadCustomers();
                alert('Customer deleted successfully!');
            })
            .catch(error => {
                console.error('Error deleting customer:', error);
                alert('Error deleting customer. Please try again.');
            });
    }
}
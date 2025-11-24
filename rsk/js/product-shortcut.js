// product-shortcut.js - Updated with professional modals and edit functionality
let currentShortcutKey = null;
let isEditing = false;

document.addEventListener('DOMContentLoaded', async function () {
    await invoiceDB.init();
    loadShortcuts();
    setupEventListeners();
});

function setupEventListeners() {
    // Form submission
    document.getElementById('shortcutForm').addEventListener('submit', saveShortcut);
    
    // Cancel edit button
    document.getElementById('cancelEdit').addEventListener('click', cancelEdit);
    
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
        if (currentShortcutKey) {
            await performDeleteShortcut(currentShortcutKey);
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
    currentShortcutKey = null;
}

async function loadShortcuts() {
    const shortcuts = await invoiceDB.getAllShortcuts();
    displayShortcuts(shortcuts);
}

function displayShortcuts(shortcuts) {
    const container = document.getElementById('shortcutsContainer');

    if (shortcuts.length === 0) {
        container.innerHTML = '<p>No shortcuts found. Add your first shortcut above.</p>';
        return;
    }

    container.innerHTML = shortcuts.map(shortcut => `
        <div class="shortcut-card">
            <div class="shortcut-info">
                <strong>${shortcut.shortcut}</strong> → ${shortcut.description}
            </div>
            <div class="shortcut-actions">
                <button class="btn-edit" onclick="editShortcut('${shortcut.shortcut}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn-delete" onclick="showDeleteModal('${shortcut.shortcut}', '${shortcut.description.replace(/'/g, "\\'")}')">
                    <i class="fas fa-trash-alt"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

async function saveShortcut(e) {
    e.preventDefault();

    const shortcut = {
        shortcut: document.getElementById('shortcut').value.trim(),
        description: document.getElementById('description').value.trim()
    };

    if (!shortcut.shortcut || !shortcut.description) {
        showSuccessModal('Error', 'Please fill in both fields.', 'error');
        return;
    }

    try {
        if (isEditing) {
            // Update existing shortcut - get the original shortcut key
            const oldShortcutKey = document.getElementById('editShortcutId').value;
            await invoiceDB.updateShortcut(oldShortcutKey, shortcut);
            showSuccessModal('Success', 'Shortcut updated successfully!', 'success');
            cancelEdit();
        } else {
            // Add new shortcut
            await invoiceDB.saveShortcut(shortcut);
            showSuccessModal('Success', 'Shortcut saved successfully!', 'success');
            document.getElementById('shortcutForm').reset();
        }
        
        loadShortcuts();
    } catch (error) {
        console.error('Error saving shortcut:', error);
        showSuccessModal('Error', 'Error saving shortcut. Please try again.', 'error');
    }
}
function editShortcut(shortcutKey) {
    invoiceDB.getShortcut(shortcutKey).then(shortcut => {
        if (shortcut) {
            isEditing = true;
            document.getElementById('editShortcutId').value = shortcut.shortcut;
            document.getElementById('shortcut').value = shortcut.shortcut;
            document.getElementById('description').value = shortcut.description;
            document.getElementById('formTitle').textContent = 'Edit Shortcut';
            document.getElementById('submitBtn').textContent = 'Update Shortcut';
            document.getElementById('cancelEdit').style.display = 'inline-block';
            document.getElementById('shortcut').focus();
        }
    });
}

function cancelEdit() {
    isEditing = false;
    document.getElementById('editShortcutId').value = '';
    document.getElementById('shortcutForm').reset();
    document.getElementById('formTitle').textContent = 'Add New Shortcut';
    document.getElementById('submitBtn').textContent = 'Add Shortcut';
    document.getElementById('cancelEdit').style.display = 'none';
}

function showDeleteModal(shortcutKey, description) {
    currentShortcutKey = shortcutKey;
    
    // Populate modal with shortcut data
    document.getElementById('deleteShortcutKey').textContent = shortcutKey;
    document.getElementById('deleteShortcutDesc').textContent = description;
    
    // Show modal
    document.getElementById('deleteModal').style.display = 'block';
    
    // Focus on input field
    setTimeout(() => {
        document.getElementById('deleteConfirmInput').focus();
    }, 100);
}

async function performDeleteShortcut(shortcutKey) {
    try {
        await invoiceDB.deleteShortcut(shortcutKey);
        loadShortcuts();
        showSuccessToast('Shortcut deleted successfully!', 'warning');
    } catch (error) {
        console.error('Error deleting shortcut:', error);
        showSuccessToast('Error deleting shortcut. Please try again.', 'error');
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
// product-shortcut.js - Product shortcuts page functionality
document.addEventListener('DOMContentLoaded', async function () {
    await invoiceDB.init();
    loadShortcuts();

    // Form submission
    document.getElementById('shortcutForm').addEventListener('submit', saveShortcut);

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function () {
        sessionStorage.removeItem('isLoggedIn');
        window.location.href = 'login.html';
    });
});

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
      <button class="btn-delete" onclick="deleteShortcut('${shortcut.shortcut}')">Delete</button>
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
        alert('Please fill in both fields.');
        return;
    }

    try {
        await invoiceDB.saveShortcut(shortcut);
        document.getElementById('shortcutForm').reset();
        loadShortcuts();
        alert('Shortcut saved successfully!');
    } catch (error) {
        console.error('Error saving shortcut:', error);
        alert('Error saving shortcut. Please try again.');
    }
}

async function deleteShortcut(shortcut) {
    if (confirm(`Are you sure you want to delete the shortcut "${shortcut}"?`)) {
        await invoiceDB.deleteShortcut(shortcut);
        loadShortcuts();
        alert('Shortcut deleted successfully!');
    }
}
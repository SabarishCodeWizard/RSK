// db.js - IndexedDB setup and operations
const DB_NAME = 'InvoiceDB';
const DB_VERSION = 1;

// Object stores
const STORES = {
    INVOICES: 'invoices',
    CUSTOMERS: 'customers',
    PRODUCT_SHORTCUTS: 'product_shortcuts',
    DELETED_INVOICES: 'deleted_invoices',
    SETTINGS: 'settings'
};

class InvoiceDB {
    constructor() {
        this.db = null;
    }

    // Initialize database
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object stores if they don't exist
                if (!db.objectStoreNames.contains(STORES.INVOICES)) {
                    const invoiceStore = db.createObjectStore(STORES.INVOICES, { keyPath: 'id', autoIncrement: true });
                    invoiceStore.createIndex('invoiceNumber', 'invoiceNumber', { unique: true });
                    invoiceStore.createIndex('date', 'date', { unique: false });
                    invoiceStore.createIndex('customerPhone', 'customerPhone', { unique: false });
                }

                if (!db.objectStoreNames.contains(STORES.CUSTOMERS)) {
                    const customerStore = db.createObjectStore(STORES.CUSTOMERS, { keyPath: 'phone' });
                    customerStore.createIndex('name', 'name', { unique: false });
                }

                if (!db.objectStoreNames.contains(STORES.PRODUCT_SHORTCUTS)) {
                    const shortcutStore = db.createObjectStore(STORES.PRODUCT_SHORTCUTS, { keyPath: 'shortcut' });
                }

                if (!db.objectStoreNames.contains(STORES.DELETED_INVOICES)) {
                    db.createObjectStore(STORES.DELETED_INVOICES, { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
                    db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
                }
            };
        });
    }

    // Customer operations
    async saveCustomer(customer) {
        return this.addOrUpdate(STORES.CUSTOMERS, customer);
    }

    async getCustomer(phone) {
        return this.get(STORES.CUSTOMERS, phone);
    }

    async getAllCustomers() {
        return this.getAll(STORES.CUSTOMERS);
    }

    // Invoice operations
    async saveInvoice(invoice) {
        return this.addOrUpdate(STORES.INVOICES, invoice);
    }

    async getInvoice(id) {
        return this.get(STORES.INVOICES, id);
    }

    async getAllInvoices() {
        return this.getAll(STORES.INVOICES);
    }

    async deleteInvoice(id) {
        const invoice = await this.getInvoice(id);
        await this.addOrUpdate(STORES.DELETED_INVOICES, invoice);
        return this.delete(STORES.INVOICES, id);
    }

    // Product shortcut operations
    async saveShortcut(shortcut) {
        return this.addOrUpdate(STORES.PRODUCT_SHORTCUTS, shortcut);
    }

    async getShortcut(shortcut) {
        return this.get(STORES.PRODUCT_SHORTCUTS, shortcut);
    }

    async getAllShortcuts() {
        return this.getAll(STORES.PRODUCT_SHORTCUTS);
    }

    async deleteShortcut(shortcut) {
        return this.delete(STORES.PRODUCT_SHORTCUTS, shortcut);
    }

    // Settings operations
    async saveSetting(key, value) {
        return this.addOrUpdate(STORES.SETTINGS, { key, value });
    }

    async getSetting(key) {
        return this.get(STORES.SETTINGS, key);
    }

    // Generic database operations
    async addOrUpdate(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async get(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }
}

// Create global database instance
const invoiceDB = new InvoiceDB();
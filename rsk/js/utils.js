// utils.js - Common utility functions
class Utils {
    // Format number to currency
    static formatCurrency(amount) {
        return parseFloat(amount).toFixed(2);
    }

    // Convert number to words
    static numberToWords(num) {
        const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
        const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

        if ((num = num.toString()).length > 9) return 'overflow';
        let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        if (!n) return;

        let str = '';
        str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
        str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
        str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
        str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
        str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Rupees ' : 'Rupees ';

        return str + 'Only';
    }

    // Generate invoice number based on financial year
    static async generateInvoiceNumber() {
        const now = new Date();
        const currentYear = now.getFullYear();
        const financialYearStart = now.getMonth() >= 3 ? currentYear : currentYear - 1;
        const financialYearEnd = financialYearStart + 1;
        const financialYear = `${financialYearStart.toString().slice(-2)}${financialYearEnd.toString().slice(-2)}`;

        // Get last invoice number from settings
        const lastInvoice = await invoiceDB.getSetting('lastInvoiceNumber');
        let nextNumber = 1;

        if (lastInvoice && lastInvoice.value) {
            const lastInvoiceYear = lastInvoice.value.substring(0, 4);
            if (lastInvoiceYear === financialYear) {
                nextNumber = parseInt(lastInvoice.value.substring(4)) + 1;
            }
        }

        const invoiceNumber = `${financialYear}${nextNumber.toString().padStart(3, '0')}`;

        // Save the new invoice number
        await invoiceDB.saveSetting('lastInvoiceNumber', invoiceNumber);

        return invoiceNumber;
    }

    // Validate phone number
    static isValidPhone(phone) {
        return /^\d{10}$/.test(phone);
    }

    // Format date for display
    static formatDate(date) {
        return new Date(date).toLocaleDateString('en-IN');
    }

    // Calculate financial year
    static getFinancialYear(date = new Date()) {
        const year = date.getFullYear();
        const month = date.getMonth();

        if (month >= 3) {
            return `${year}-${year + 1}`;
        } else {
            return `${year - 1}-${year}`;
        }
    }

    // Share on WhatsApp
    static shareOnWhatsApp(phone, message) {
        const encodedMessage = encodeURIComponent(message);
        const url = `https://wa.me/91${phone}?text=${encodedMessage}`;
        window.open(url, '_blank');
    }
}
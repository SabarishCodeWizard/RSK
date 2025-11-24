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

    // Share complete invoice with professional formatting
    static async shareCompleteInvoice(invoice) {
        const message = this.generateProfessionalInvoiceMessage(invoice);
        const encodedMessage = encodeURIComponent(message);
        const url = `https://wa.me/91${invoice.customerPhone}?text=${encodedMessage}`;
        window.open(url, '_blank');
    }

    // Generate professional invoice message
    static generateProfessionalInvoiceMessage(invoice) {
        return `📋 *TAX INVOICE - RSK ENTERPRISES*

┌──────────────────────────────
│ *Invoice Details*
├──────────────────────────────
│ 📄 Invoice No: ${invoice.invoiceNumber}
│ 📅 Invoice Date: ${this.formatDate(invoice.date)}
│ 📦 Supply Date: ${this.formatDate(invoice.supplyDate)}
│ 🚚 Transport: ${invoice.transportMode || 'N/A'} ${invoice.vehicleNumber ? `(${invoice.vehicleNumber})` : ''}
└──────────────────────────────

┌──────────────────────────────
│ *Bill To*
├──────────────────────────────
│ 👤 ${invoice.customerName}
│ 📞 ${invoice.customerPhone}
│ 📍 ${invoice.customerAddress}
│ 🏢 ${invoice.state} (Code: ${invoice.stateCode})
│ 🆔 GSTIN: ${invoice.customerGSTIN || 'N/A'}
└──────────────────────────────

┌──────────────────────────────
│ *Product Details*
├──────────────────────────────
${invoice.products.map(product =>
            `│ ▫️ ${product.description}\n` +
            `│   HSN: ${product.hsnCode || 'N/A'} | ` +
            `Qty: ${product.qty} | ` +
            `Rate: ₹${this.formatCurrency(product.rate)}\n` +
            `│   Amount: ₹${this.formatCurrency(product.amount)}\n` +
            `├──────────────────────────────`
        ).join('\n')}

┌──────────────────────────────
│ *Tax Calculation*
├──────────────────────────────
│ Sub Total:        ₹${this.formatCurrency(invoice.subTotal)}
${invoice.cgstRate > 0 ? `│ CGST (${invoice.cgstRate}%):     ₹${this.formatCurrency(invoice.cgstAmount)}` : ''}
${invoice.sgstRate > 0 ? `│ SGST (${invoice.sgstRate}%):     ₹${this.formatCurrency(invoice.sgstAmount)}` : ''}
${invoice.igstRate > 0 ? `│ IGST (${invoice.igstRate}%):     ₹${this.formatCurrency(invoice.igstAmount)}` : ''}
│ Total Tax:        ₹${this.formatCurrency(invoice.totalTaxAmount)}
│ Round Off:        ₹${this.formatCurrency(invoice.roundOff)}
│ ─────────────────────────────
│ *Grand Total:     ₹${this.formatCurrency(invoice.grandTotal)}*
└──────────────────────────────

💬 *Amount in Words:* ${invoice.amountInWords}

🏦 *Bank Details*
• Account Name: RSK ENTERPRISES
• Bank: CANARA BANK
• A/C No: 120033201829
• IFSC: CNRBOO16563

📞 Contact: 8608127349
📍 Address: 76(3) Padmavathipuram, Angeripalayam Road, Tirupur 641-602

Thank you for your business! 🙏`;
    }

    // Generate simple mobile-friendly format
    static generateSimpleInvoiceMessage(invoice) {
        return `*Invoice #${invoice.invoiceNumber}*

*Customer:* ${invoice.customerName}
*Date:* ${this.formatDate(invoice.date)}
*Phone:* ${invoice.customerPhone}

*Products:*
${invoice.products.map(product =>
            `• ${product.description} - ${product.qty} x ₹${this.formatCurrency(product.rate)} = ₹${this.formatCurrency(product.amount)}`
        ).join('\n')}

*Total: ₹${this.formatCurrency(invoice.grandTotal)}*

*RSK ENTERPRISES*
76(3) Padmavathipuram, Angeripalayam Road
Tirupur 641-602
Phone: 8608127349

Thank you!`;
    }

    // Keep the existing share function for backward compatibility
    static shareOnWhatsApp(phone, message) {
        const encodedMessage = encodeURIComponent(message);
        const url = `https://wa.me/91${phone}?text=${encodedMessage}`;
        window.open(url, '_blank');
    }


    // Financial year utilities
    static getCurrentFinancialYear() {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // January is 0

        // Financial year runs from April to March
        if (currentMonth >= 4) { // April to December
            return {
                start: `${currentYear}-04-01`,
                end: `${currentYear + 1}-03-31`,
                display: `${currentYear}-${(currentYear + 1).toString().slice(2)}`
            };
        } else { // January to March
            return {
                start: `${currentYear - 1}-04-01`,
                end: `${currentYear}-03-31`,
                display: `${currentYear - 1}-${currentYear.toString().slice(2)}`
            };
        }
    }

    static isDateInFinancialYear(date, financialYear) {
        const invoiceDate = new Date(date);
        const startDate = new Date(financialYear.start);
        const endDate = new Date(financialYear.end);

        return invoiceDate >= startDate && invoiceDate <= endDate;
    }

    static parseInvoiceNumber(invoiceNumber) {
        // Handle invoice numbers like "001", "015", etc.
        const match = invoiceNumber.match(/^(\d+)$/);
        if (match) {
            return parseInt(match[1], 10);
        }
        return 0;
    }

    static formatInvoiceNumber(number) {
        return number.toString().padStart(3, '0');
    }
}
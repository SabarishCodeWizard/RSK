// pdf.js - PDF generation functionality
async function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Hide phone number for PDF
    const customerPhone = document.getElementById('customerPhone').value;
    document.getElementById('customerPhone').style.display = 'none';

    // Capture the invoice as an image
    const invoiceElement = document.getElementById('invoice');

    html2canvas(invoiceElement, {
        scale: 2,
        useCORS: true,
        logging: false
    }).then(canvas => {
        // Restore phone number display
        document.getElementById('customerPhone').style.display = '';

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 295; // A4 height in mm
        const imgHeight = canvas.height * imgWidth / canvas.width;
        let heightLeft = imgHeight;

        let position = 0;

        doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // Add new pages if needed
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            doc.addPage();
            doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        // Save the PDF
        const invoiceNumber = document.getElementById('invoiceNo').value;
        doc.save(`Invoice_${invoiceNumber}.pdf`);
    });
}
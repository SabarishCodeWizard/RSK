// pdf.js - PDF generation functionality (Robust version)
async function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    // Elements to hide during PDF generation
    const elementsToHide = [
        { element: document.getElementById('customerPhone'), originalDisplay: '' },
        { element: document.querySelector('.invoice-suggestions'), originalDisplay: '' }
    ];

    // Hide elements
    elementsToHide.forEach(item => {
        if (item.element) {
            item.originalDisplay = item.element.style.display;
            item.element.style.display = 'none';
        }
    });

    const invoiceElement = document.getElementById('invoice');

    // Define A4 size in mm
    const A4_WIDTH_MM = 210;
    const A4_HEIGHT_MM = 297;
    const MARGIN_MM = 10;

    // Calculate effective width for content
    const CONTENT_WIDTH_MM = A4_WIDTH_MM - (2 * MARGIN_MM);

    try {
        const canvas = await html2canvas(invoiceElement, {
            scale: 2,
            useCORS: true,
            logging: false
        });

        // Restore all hidden elements
        elementsToHide.forEach(item => {
            if (item.element) {
                item.element.style.display = item.originalDisplay;
            }
        });

        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const imgHeight = (canvas.height * CONTENT_WIDTH_MM) / canvas.width;
        let heightLeft = imgHeight;
        let position = MARGIN_MM;

        // Add the first page
        doc.addImage(imgData, 'JPEG', MARGIN_MM, position, CONTENT_WIDTH_MM, imgHeight);
        heightLeft -= A4_HEIGHT_MM;

        // Add subsequent pages if needed
        while (heightLeft > -10) {
            position = heightLeft - imgHeight + MARGIN_MM;
            doc.addPage();
            doc.addImage(imgData, 'JPEG', MARGIN_MM, position, CONTENT_WIDTH_MM, imgHeight);
            heightLeft -= A4_HEIGHT_MM;
        }

        // Save the PDF
        const invoiceNumber = document.getElementById('invoiceNo').value || '000';
        doc.save(`Invoice_${invoiceNumber}.pdf`);

    } catch (error) {
        // Ensure elements are restored even if there's an error
        elementsToHide.forEach(item => {
            if (item.element) {
                item.element.style.display = item.originalDisplay;
            }
        });
        console.error('Error generating PDF:', error);
        alert('Error generating PDF. Please try again.');
    }
}
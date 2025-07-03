const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// Get all suppliers
router.get('/', async (req, res) => {
  try {
    const suppliers = await Supplier.find();
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch suppliers' });
  }
});

// Create supplier
router.post('/', async (req, res) => {
  try {
    const supplier = new Supplier(req.body);
    // Calculate price and totalPrice
    supplier.items.forEach(item => {
      item.price = item.quantity * item.unitPrice;
    });
    supplier.totalPrice = supplier.items.reduce((sum, i) => sum + i.price, 0);
    await supplier.save();
    res.status(201).json({ message: 'Supplier added', supplier });
  } catch (err) {
    res.status(400).json({ message: 'Failed to create supplier' });
  }
});

// Update supplier
router.put('/:id', async (req, res) => {
  try {
    const updated = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Supplier not found' });
    res.json({ message: 'Supplier updated', supplier: updated });
  } catch (err) {
    res.status(400).json({ message: 'Failed to update supplier' });
  }
});

// Delete supplier
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Supplier.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Supplier not found' });
    res.json({ message: 'Supplier deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Delete failed' });
  }
});

// Generate PDF Invoice
router.get('/:id/pdf', async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=invoice-${supplier.name}.pdf`);
    doc.pipe(res);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 50;

    // Add Hospital Logo at the top-left if exists
    const logoPath = path.join(__dirname, '../assets/hospital_logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, margin, 30, { width: 100 }); // Adjust size and position if needed
    }

    // Move down after logo to avoid overlap with title
    doc.moveDown(4);

    // Title
    doc.fillColor('black').fontSize(18).text('Medical Supply Invoice', { align: 'center' });
    doc.moveDown();

    // Supplier Info
    doc.fillColor('black').fontSize(12);
    doc.text(`Supplier Name: ${supplier.name}`);
    doc.text(`Contact Person: ${supplier.contactPerson}`);
    doc.text(`Phone: ${supplier.phone}`);
    doc.text(`Email: ${supplier.email}`);
    doc.text(`Address: ${supplier.address}`);
    doc.moveDown();

    // Table setup
    const tableTop = doc.y + 20;
    const rowHeight = 25;

    const columns = [
      { header: 'Code', key: 'code', width: 60 },
      { header: 'Description', key: 'description', width: 180 },
      { header: 'Qty', key: 'quantity', width: 50 },
      { header: 'Unit Price', key: 'unitPrice', width: 70 },
      { header: 'Price', key: 'price', width: 70 },
      { header: 'Date', key: 'date', width: 90 },
    ];

    let startX = margin;
    columns.forEach(col => {
      col.x = startX;
      startX += col.width;
    });

    // Draw table header
    doc.fillColor('black').font('Helvetica-Bold').fontSize(12);
    columns.forEach(col => {
      doc.text(col.header, col.x + 5, tableTop + 5, {
        width: col.width - 10,
        align: 'left',
      });
    });

    doc.lineWidth(1)
      .rect(margin, tableTop, startX - margin, rowHeight)
      .stroke();

    let lineX = margin;
    columns.forEach(col => {
      doc.moveTo(lineX, tableTop).lineTo(lineX, tableTop + rowHeight).stroke();
      lineX += col.width;
    });
    doc.moveTo(lineX, tableTop).lineTo(lineX, tableTop + rowHeight).stroke();

    // Prepare rows
    doc.fillColor('black').font('Helvetica').fontSize(11);
    let y = tableTop + rowHeight;

    const maxRowsPerPage = Math.floor((pageHeight - margin - y - 150) / rowHeight);

    for (let i = 0; i < supplier.items.length; i++) {
      if (i > 0 && i % maxRowsPerPage === 0) {
        doc.addPage();
        y = margin;

        // Redraw table header on new page
        doc.fillColor('black').font('Helvetica-Bold').fontSize(12);
        columns.forEach(col => {
          doc.text(col.header, col.x + 5, y + 5, {
            width: col.width - 10,
            align: 'left',
          });
        });
        doc.lineWidth(1)
          .rect(margin, y, startX - margin, rowHeight)
          .stroke();
        let lineX = margin;
        columns.forEach(col => {
          doc.moveTo(lineX, y).lineTo(lineX, y + rowHeight).stroke();
          lineX += col.width;
        });
        doc.moveTo(lineX, y).lineTo(lineX, y + rowHeight).stroke();

        y += rowHeight;
        doc.fillColor('black').font('Helvetica').fontSize(11);
      }

      const item = supplier.items[i];
      const price = item.quantity * item.unitPrice;

      // Alternate row background
      if (i % 2 === 0) {
        doc.fillOpacity(0.1).fill('#eeeeee').fillOpacity(1);
        doc.rect(margin, y - 3, startX - margin, rowHeight).fill();
      }

      // Draw vertical lines for columns
      let lineX = margin;
      columns.forEach(col => {
        doc.strokeColor('black').lineWidth(0.5);
        doc.moveTo(lineX, y).lineTo(lineX, y + rowHeight).stroke();
        lineX += col.width;
      });
      doc.moveTo(lineX, y).lineTo(lineX, y + rowHeight).stroke();

      // Draw text with black fill color
      columns.forEach(col => {
        doc.fillColor('black');  // make sure text is black
        let text = '';
        switch (col.key) {
          case 'code': text = item.code || ''; break;
          case 'description':
            text = item.description || '';
            if (text.length > 35) text = text.substring(0, 32) + '...';
            break;
          case 'quantity': text = item.quantity.toString(); break;
          case 'unitPrice': text = item.unitPrice.toFixed(2); break;
          case 'price': text = price.toFixed(2); break;
          case 'date': text = new Date(item.date).toLocaleDateString(); break;
        }
        doc.text(text, col.x + 5, y + 7, {
          width: col.width - 10,
          align: 'left',
          ellipsis: true,
        });
      });

      // Draw bottom line for row
      doc.strokeColor('black').lineWidth(0.5);
      doc.moveTo(margin, y + rowHeight).lineTo(startX, y + rowHeight).stroke();

      y += rowHeight;
    }

    // Draw bottom border line for table
    doc.moveTo(margin, y).lineTo(startX, y).stroke();

    // Total Price
    doc.moveDown(2);
    if (y + 50 > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    doc.fillColor('black').font('Helvetica-Bold').fontSize(14);
    doc.text(`Total Price: Rs. ${supplier.totalPrice.toFixed(2)}`, margin, y + 20, { align: 'right' });

    // Signature
    const signaturePath = path.join(__dirname, '../assets/signature.png');
    if (fs.existsSync(signaturePath)) {
      const sigWidth = 120;
      const sigHeight = 60;
      const sigX = pageWidth - margin - sigWidth;
      const sigY = y + 50;

      doc.image(signaturePath, sigX, sigY, { width: sigWidth, height: sigHeight });
      doc.text('Authorized Signature', sigX, sigY + sigHeight + 5, { width: sigWidth, align: 'center' });
    }

    // QR code generation
    const qrData = `Supplier ID: ${supplier._id}`;
    const qrImage = await QRCode.toDataURL(qrData);
    const qrBuffer = Buffer.from(qrImage.split(',')[1], 'base64');

    const qrX = margin;
    const qrY = y + 60;
    const qrSize = 100;
    doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
    doc.fillColor('black').text('Scan for details', qrX, qrY + qrSize + 5);

    doc.end();
  } catch (err) {
    console.error('PDF generation failed:', err);
    res.status(500).json({ message: 'Failed to generate PDF' });
  }
});

module.exports = router;

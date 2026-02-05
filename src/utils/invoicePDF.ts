import jsPDF from 'jspdf';
import { format } from 'date-fns';

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceVehicle {
  vin: string;
  brand?: string;
  model?: string;
}

export interface InvoiceData {
  invoiceNumber: string;
  type: 'invoice' | 'estimate';
  customerName: string;
  customerEmail?: string;
  customerAddress?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes?: string;
  createdAt: string;
  vehicle: InvoiceVehicle;
}

interface PDFOptions {
  returnAsBlob?: boolean;
}

const BLUE_COLOR: [number, number, number] = [2, 132, 199]; // primary-600: #0284c7
const LIGHT_BLUE: [number, number, number] = [241, 245, 249]; // slate-100

export async function generateInvoicePDF(
  invoice: InvoiceData,
  options: PDFOptions = {}
): Promise<string | Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // Blue vertical bar on left
  doc.setFillColor(...BLUE_COLOR);
  doc.rect(margin, yPos, 4, pageHeight - margin * 2, 'F');

  // Company name header
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLUE_COLOR);
  doc.text('OCEANCAR', margin + 8, yPos + 12);
  yPos += 25;

  // Company info section (right side)
  const companyInfoX = pageWidth - margin;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Ocean Garage', companyInfoX, yPos - 18, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const companyInfo = ['Fahrzeugreparatur & Service', 'Schweiz'];
  companyInfo.forEach((line, idx) => {
    doc.text(line, companyInfoX, yPos - 10 + idx * 5, { align: 'right' });
  });

  yPos += 15;

  // Document type (large, blue, top right)
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLUE_COLOR);
  const docType = invoice.type === 'invoice' ? 'RECHNUNG' : 'ANGEBOT';
  doc.text(docType, companyInfoX, yPos, { align: 'right' });
  yPos += 10;

  // Document details box
  const detailBoxY = yPos;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);

  const docNumber = invoice.invoiceNumber.replace('INV-', 'EST-');
  const validUntil = format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'dd.MM.yyyy');

  doc.text(`Offerten-Nr.: ${docNumber}`, companyInfoX, detailBoxY, { align: 'right' });
  doc.text(`Datum: ${format(new Date(invoice.createdAt), 'dd.MM.yyyy')}`, companyInfoX, detailBoxY + 5, { align: 'right' });
  if (invoice.type === 'estimate') {
    doc.text(`Gültig bis: ${validUntil}`, companyInfoX, detailBoxY + 10, { align: 'right' });
  }

  yPos = detailBoxY + 18;

  // Customer info box
  const customerBoxY = yPos;
  doc.setFillColor(...LIGHT_BLUE);
  const customerBoxHeight = invoice.customerAddress ? 35 : invoice.customerEmail ? 28 : 22;
  doc.rect(margin + 8, customerBoxY, 75, customerBoxHeight, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLUE_COLOR);
  doc.text(invoice.customerName, margin + 10, customerBoxY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  let customerLineY = customerBoxY + 11;

  if (invoice.customerEmail) {
    doc.text(invoice.customerEmail, margin + 10, customerLineY);
    customerLineY += 5;
  }
  if (invoice.customerAddress) {
    const addressLines = invoice.customerAddress.split('\n');
    addressLines.forEach((line: string) => {
      doc.text(line, margin + 10, customerLineY);
      customerLineY += 5;
    });
  }

  // Vehicle info box
  const vehicleBoxY = customerBoxY;
  const vehicleBoxHeight = invoice.vehicle?.brand && invoice.vehicle?.model ? 25 : 20;
  doc.setFillColor(250, 250, 250);
  doc.rect(pageWidth - margin - 75, vehicleBoxY, 75, vehicleBoxHeight, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('Fahrzeug:', pageWidth - margin - 73, vehicleBoxY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (invoice.vehicle?.brand && invoice.vehicle?.model) {
    doc.text(`${invoice.vehicle.brand} ${invoice.vehicle.model}`, pageWidth - margin - 73, vehicleBoxY + 11);
    doc.text(`VIN: ${invoice.vehicle.vin}`, pageWidth - margin - 73, vehicleBoxY + 16);
  } else {
    doc.text(`VIN: ${invoice.vehicle?.vin || 'N/A'}`, pageWidth - margin - 73, vehicleBoxY + 11);
  }

  yPos = Math.max(customerBoxY + customerBoxHeight, vehicleBoxY + vehicleBoxHeight) + 15;

  // Introductory text
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(
    invoice.type === 'estimate'
      ? 'Vielen Dank für Ihre Anfrage! Wir freuen uns, Ihnen folgende Offerte zu unterbreiten:'
      : 'Im Folgenden finden Sie die Details zu Ihrer Rechnung:',
    margin + 8,
    yPos
  );
  yPos += 10;

  // Items table header
  doc.setFillColor(...BLUE_COLOR);
  doc.rect(margin + 8, yPos - 4, pageWidth - 2 * margin - 8, 7, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);

  const tableStart = margin + 10;
  const descWidth = 75;
  const qtyWidth = 100;
  const unitWidth = 120;
  const priceWidth = 145;
  const totalWidth = pageWidth - margin - 2;

  doc.text('BESCHREIBUNG', tableStart, yPos);
  doc.text('MENGE', qtyWidth, yPos, { align: 'center' });
  doc.text('EINHEIT', unitWidth, yPos, { align: 'center' });
  doc.text('PREIS', priceWidth, yPos, { align: 'right' });
  doc.text('TOTAL', totalWidth, yPos, { align: 'right' });
  yPos += 8;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  invoice.items.forEach((item: InvoiceItem, idx: number) => {
    if (yPos > pageHeight - 70) {
      doc.addPage();
      yPos = margin + 10;
    }

    // Alternate row colors
    if (idx % 2 === 0) {
      doc.setFillColor(255, 255, 255);
    } else {
      doc.setFillColor(248, 250, 252);
    }
    doc.rect(margin + 8, yPos - 4, pageWidth - 2 * margin - 8, 7, 'F');

    doc.setFontSize(9);
    const descLines = doc.splitTextToSize(item.description, descWidth - 3);
    const firstLine = descLines[0];
    doc.text(firstLine, tableStart, yPos);

    doc.text(item.quantity.toString(), qtyWidth, yPos, { align: 'center' });
    doc.text('Stück', unitWidth, yPos, { align: 'center' });
    doc.text(`CHF ${item.unitPrice.toFixed(2)}`, priceWidth, yPos, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text(`CHF ${item.total.toFixed(2)}`, totalWidth, yPos, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    yPos += 7;

    // Additional description lines
    if (descLines.length > 1) {
      descLines.slice(1).forEach((line: string) => {
        if (yPos > pageHeight - 70) {
          doc.addPage();
          yPos = margin + 10;
        }
        doc.text(line, tableStart, yPos);
        yPos += 4;
      });
    }
  });

  yPos += 5;
  if (yPos > pageHeight - 50) {
    doc.addPage();
    yPos = margin;
  }

  // Totals section
  yPos += 3;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(pageWidth - margin - 75, yPos, pageWidth - margin - 2, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text('Zwischentotal:', pageWidth - margin - 60, yPos, { align: 'right' });
  doc.text(`CHF ${invoice.subtotal.toFixed(2)}`, pageWidth - margin - 2, yPos, { align: 'right' });
  yPos += 7;

  doc.text(`MWST (${invoice.taxRate}%):`, pageWidth - margin - 60, yPos, { align: 'right' });
  doc.text(`CHF ${invoice.taxAmount.toFixed(2)}`, pageWidth - margin - 2, yPos, { align: 'right' });
  yPos += 10;

  // Total with blue emphasis
  doc.setFillColor(...LIGHT_BLUE);
  doc.rect(pageWidth - margin - 85, yPos - 3, 83, 8, 'F');

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(pageWidth - margin - 85, yPos - 3, pageWidth - margin - 2, yPos - 3);
  doc.text('Gesamtbetrag:', pageWidth - margin - 60, yPos + 2, { align: 'right' });
  doc.setTextColor(...BLUE_COLOR);
  doc.text(`CHF ${invoice.total.toFixed(2)}`, pageWidth - margin - 2, yPos + 2, { align: 'right' });
  yPos += 15;

  doc.setTextColor(0, 0, 0);

  // Closing message
  if (invoice.type === 'estimate') {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Bei Fragen stehen wir Ihnen jederzeit gerne zur Verfügung.', margin + 8, yPos);
    yPos += 8;
  }

  // Notes
  if (invoice.notes) {
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = margin;
    }
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Bemerkungen:', margin, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    const notesLines = doc.splitTextToSize(invoice.notes, pageWidth - 2 * margin);
    notesLines.forEach((line: string) => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(line, margin, yPos);
      yPos += 5;
    });
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(`Seite ${i} von ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text('Ocean Garage - Fahrzeugreparatur & Service', pageWidth / 2, pageHeight - 5, { align: 'center' });
  }

  // Return as data URL or Blob
  if (options.returnAsBlob) {
    return doc.output('blob');
  }
  return doc.output('dataurlstring');
}

export function downloadInvoicePDF(invoice: InvoiceData): void {
  const doc = new jsPDF();
  // Use same generation logic but save directly
  generateInvoicePDF(invoice).then((dataUrl) => {
    if (typeof dataUrl === 'string') {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${invoice.invoiceNumber}.pdf`;
      link.click();
    }
  });
}

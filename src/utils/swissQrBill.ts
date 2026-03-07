import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export interface QrBillData {
  // Creditor
  creditorName: string;
  creditorStreet: string;
  creditorZip: string;
  creditorCity: string;
  creditorCountry: string;
  iban: string;

  // Payment
  amount: number;
  currency: string;

  // Reference
  referenceType: 'SCOR' | 'NON';
  reference?: string;

  // Debtor (customer)
  debtorName?: string;
  debtorStreet?: string;
  debtorZip?: string;
  debtorCity?: string;
  debtorCountry?: string;

  // Additional info
  additionalInfo?: string;
}

const SWISS_CROSS_SIZE_MM = 7;
const QR_CODE_SIZE_MM = 46;

/**
 * Renders the complete Swiss QR bill payment slip (210 x 105 mm)
 * at the bottom of the current page in the jsPDF document.
 */
export async function renderQrBillOnPdf(
  doc: jsPDF,
  data: QrBillData,
  swissCrossBase64: string,
): Promise<void> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const billHeight = 105;
  const receiptWidth = 62;
  const paymentPartWidth = 148;

  const billTop = pageHeight - billHeight;

  drawSeparationLine(doc, billTop, pageWidth);
  drawReceipt(doc, data, 0, billTop, receiptWidth, billHeight);
  drawVerticalSeparation(doc, receiptWidth, billTop, billHeight);
  await drawPaymentPart(
    doc,
    data,
    receiptWidth,
    billTop,
    paymentPartWidth,
    billHeight,
    swissCrossBase64,
  );
}

function drawSeparationLine(
  doc: jsPDF,
  y: number,
  width: number,
): void {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(0, y, width, y);
  doc.setLineDashPattern([], 0);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text('Vor der Einzahlung abzutrennen', width / 2, y - 2, {
    align: 'center',
  });
}

function drawVerticalSeparation(
  doc: jsPDF,
  x: number,
  top: number,
  height: number,
): void {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(x, top, x, top + height);
  doc.setLineDashPattern([], 0);
}

function drawReceipt(
  doc: jsPDF,
  data: QrBillData,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const leftMargin = x + 5;
  let currentY = y + 7;

  // Title
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Empfangsschein', leftMargin, currentY);
  currentY += 8;

  // "Konto / Zahlbar an"
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('Konto / Zahlbar an', leftMargin, currentY);
  currentY += 3;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(formatIban(data.iban), leftMargin, currentY);
  currentY += 3.5;
  doc.text(data.creditorName, leftMargin, currentY);
  currentY += 3.5;
  doc.text(data.creditorStreet, leftMargin, currentY);
  currentY += 3.5;
  doc.text(`${data.creditorZip} ${data.creditorCity}`, leftMargin, currentY);
  currentY += 5;

  // Reference
  if (data.referenceType === 'SCOR' && data.reference) {
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('Referenz', leftMargin, currentY);
    currentY += 3;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(formatCreditorReference(data.reference), leftMargin, currentY);
    currentY += 5;
  }

  // "Zahlbar durch"
  if (data.debtorName) {
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('Zahlbar durch', leftMargin, currentY);
    currentY += 3;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(data.debtorName, leftMargin, currentY);
    currentY += 3.5;
    if (data.debtorStreet) {
      doc.text(data.debtorStreet, leftMargin, currentY);
      currentY += 3.5;
    }
    if (data.debtorZip && data.debtorCity) {
      doc.text(`${data.debtorZip} ${data.debtorCity}`, leftMargin, currentY);
    }
  } else {
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('Zahlbar durch (Name/Adresse)', leftMargin, currentY);
    currentY += 2;
    drawCornerMarks(doc, leftMargin, currentY, 52, 20);
  }

  // Currency and Amount at bottom
  const bottomY = y + height - 7;
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('Währung', leftMargin, bottomY - 5);
  doc.text('Betrag', leftMargin + 18, bottomY - 5);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(data.currency, leftMargin, bottomY);
  doc.text(formatAmount(data.amount), leftMargin + 18, bottomY);

  // "Annahmestelle" at bottom right
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('Annahmestelle', x + width - 5, y + height - 7, {
    align: 'right',
  });
}

async function drawPaymentPart(
  doc: jsPDF,
  data: QrBillData,
  x: number,
  y: number,
  _width: number,
  _height: number,
  swissCrossBase64: string,
): Promise<void> {
  const leftMargin = x + 5;
  let currentY = y + 7;

  // Title
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Zahlteil', leftMargin, currentY);
  currentY += 5;

  // QR Code
  const qrX = leftMargin;
  const qrY = currentY;
  const qrPayload = buildQrPayload(data);
  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    errorCorrectionLevel: 'M',
    margin: 0,
    width: 460,
    color: { dark: '#000000', light: '#FFFFFF' },
  });

  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, QR_CODE_SIZE_MM, QR_CODE_SIZE_MM);

  // Swiss cross overlay in center of QR code
  const crossX = qrX + (QR_CODE_SIZE_MM - SWISS_CROSS_SIZE_MM) / 2;
  const crossY = qrY + (QR_CODE_SIZE_MM - SWISS_CROSS_SIZE_MM) / 2;
  doc.addImage(
    swissCrossBase64,
    'PNG',
    crossX,
    crossY,
    SWISS_CROSS_SIZE_MM,
    SWISS_CROSS_SIZE_MM,
  );

  // Currency and Amount below QR code
  const belowQrY = qrY + QR_CODE_SIZE_MM + 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Währung', leftMargin, belowQrY);
  doc.text('Betrag', leftMargin + 25, belowQrY);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(data.currency, leftMargin, belowQrY + 5);
  doc.text(formatAmount(data.amount), leftMargin + 25, belowQrY + 5);

  // Right side: text information
  const infoX = x + 67;
  let infoY = y + 7;

  // "Konto / Zahlbar an"
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Konto / Zahlbar an', infoX, infoY);
  infoY += 4;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(formatIban(data.iban), infoX, infoY);
  infoY += 4;
  doc.text(data.creditorName, infoX, infoY);
  infoY += 4;
  doc.text(data.creditorStreet, infoX, infoY);
  infoY += 4;
  doc.text(`${data.creditorZip} ${data.creditorCity}`, infoX, infoY);
  infoY += 6;

  // Reference
  if (data.referenceType === 'SCOR' && data.reference) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Referenz', infoX, infoY);
    infoY += 4;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(formatCreditorReference(data.reference), infoX, infoY);
    infoY += 6;
  }

  // Additional information
  if (data.additionalInfo) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Zusätzliche Informationen', infoX, infoY);
    infoY += 4;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(data.additionalInfo, infoX, infoY);
    infoY += 6;
  }

  // "Zahlbar durch"
  if (data.debtorName) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Zahlbar durch', infoX, infoY);
    infoY += 4;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(data.debtorName, infoX, infoY);
    infoY += 4;
    if (data.debtorStreet) {
      doc.text(data.debtorStreet, infoX, infoY);
      infoY += 4;
    }
    if (data.debtorZip && data.debtorCity) {
      doc.text(`${data.debtorZip} ${data.debtorCity}`, infoX, infoY);
    }
  } else {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Zahlbar durch (Name/Adresse)', infoX, infoY);
    infoY += 2;
    drawCornerMarks(doc, infoX, infoY, 65, 25);
  }
}

/**
 * Builds the Swiss QR Code payload string per SPC format.
 */
function buildQrPayload(data: QrBillData): string {
  const lines: string[] = [
    'SPC', // QR Type
    '0200', // Version
    '1', // Coding Type (UTF-8)
    data.iban.replace(/\s/g, ''), // IBAN
    'S', // Creditor Address Type (Structured)
    data.creditorName,
    data.creditorStreet,
    '', // Building Number
    data.creditorZip,
    data.creditorCity,
    data.creditorCountry,
    '', // Ultimate Creditor fields (7 empty lines)
    '',
    '',
    '',
    '',
    '',
    '',
    data.amount.toFixed(2),
    data.currency,
  ];

  // Debtor address
  if (data.debtorName) {
    lines.push('S');
    lines.push(data.debtorName);
    lines.push(data.debtorStreet || '');
    lines.push('');
    lines.push(data.debtorZip || '');
    lines.push(data.debtorCity || '');
    lines.push(data.debtorCountry || 'CH');
  } else {
    lines.push('', '', '', '', '', '', '');
  }

  // Reference
  lines.push(data.referenceType);
  lines.push(data.reference || '');

  // Unstructured message
  lines.push(data.additionalInfo || '');

  // Trailer
  lines.push('EPD');

  return lines.join('\n');
}

function formatIban(iban: string): string {
  const clean = iban.replace(/\s/g, '');
  return clean.replace(/(.{4})/g, '$1 ').trim();
}

function formatAmount(amount: number): string {
  const parts = amount.toFixed(2).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${intPart}.${parts[1]}`;
}

function formatCreditorReference(ref: string): string {
  return ref.replace(/(.{4})/g, '$1 ').trim();
}

function drawCornerMarks(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const markLen = 3;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([], 0);

  // Top-left
  doc.line(x, y, x + markLen, y);
  doc.line(x, y, x, y + markLen);
  // Top-right
  doc.line(x + width, y, x + width - markLen, y);
  doc.line(x + width, y, x + width, y + markLen);
  // Bottom-left
  doc.line(x, y + height, x + markLen, y + height);
  doc.line(x, y + height, x, y + height - markLen);
  // Bottom-right
  doc.line(x + width, y + height, x + width - markLen, y + height);
  doc.line(x + width, y + height, x + width, y + height - markLen);
}

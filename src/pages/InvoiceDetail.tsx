import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Download, Printer, FileText, Edit, Send, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';

interface Invoice {
  id: string;
  invoiceNumber: string;
  type: string;
  status: string;
  customerName: string;
  customerEmail?: string;
  customerAddress?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes?: string;
  createdAt: string;
  vehicle: {
    id: string;
    vin: string;
    brand?: string;
    model?: string;
  };
  createdBy: {
    id: string;
    name?: string;
    email: string;
  };
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get the return path from location state or determine from referrer
  const getReturnPath = () => {
    // Check if we came from a vehicle detail page (via state)
    if (location.state?.fromVehicle && location.state?.vehicleId) {
      return `/vehicles/${location.state.vehicleId}`;
    }
    // Check if referrer contains /vehicles/ (fallback if state not available)
    if (typeof document !== 'undefined' && document.referrer.includes('/vehicles/')) {
      const vehicleIdMatch = document.referrer.match(/\/vehicles\/([^\/\?]+)/);
      if (vehicleIdMatch && vehicleIdMatch[1]) {
        return `/vehicles/${vehicleIdMatch[1]}`;
      }
    }
    // Default to invoices page
    return '/invoices';
  };

  const handleBack = () => {
    navigate(getReturnPath());
  };

  useEffect(() => {
    if (id) {
      fetchInvoice();
    }
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const response = await api.get(`/invoices/${id}`);
      setInvoice(response.data);
    } catch (error) {
      toast.error('Rechnung konnte nicht geladen werden');
      navigate(getReturnPath());
    } finally {
      setIsLoading(false);
    }
  };

  const generatePDF = () => {
    if (!invoice) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = margin;

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('OCEAN GARAGE', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Fahrzeugreparatur & Service', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Invoice Info
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(
      invoice.type === 'invoice' ? 'RECHNUNG' : 'ANGEBOT',
      margin,
      yPos
    );
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Rechnungsnummer: ${invoice.invoiceNumber}`, margin, yPos);
    yPos += 6;
    doc.text(`Datum: ${format(new Date(invoice.createdAt), 'dd.MM.yyyy')}`, margin, yPos);
    yPos += 6;
    doc.text(`Status: ${getStatusText(invoice.status)}`, margin, yPos);
    yPos += 15;

    // Customer Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Rechnungsempfänger:', margin, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.customerName, margin, yPos);
    yPos += 6;
    if (invoice.customerEmail) {
      doc.text(invoice.customerEmail, margin, yPos);
      yPos += 6;
    }
    if (invoice.customerAddress) {
      const addressLines = invoice.customerAddress.split('\n');
      addressLines.forEach((line) => {
        doc.text(line, margin, yPos);
        yPos += 6;
      });
    }
    yPos += 10;

    // Vehicle Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Fahrzeug:', margin, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (invoice.vehicle.brand && invoice.vehicle.model) {
      doc.text(`${invoice.vehicle.brand} ${invoice.vehicle.model}`, margin, yPos);
      yPos += 6;
    }
    doc.text(`VIN: ${invoice.vehicle.vin}`, margin, yPos);
    yPos += 15;

    // Items Table
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Positionen:', margin, yPos);
    yPos += 10;

    // Table header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Beschreibung', margin + 2, yPos);
    doc.text('Menge', margin + 100, yPos);
    doc.text('Einzelpreis', margin + 120, yPos);
    doc.text('Gesamt', pageWidth - margin - 30, yPos, { align: 'right' });
    yPos += 10;

    // Table rows
    doc.setFont('helvetica', 'normal');
    invoice.items.forEach((item) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(item.description.substring(0, 40), margin + 2, yPos);
      doc.text(item.quantity.toString(), margin + 100, yPos);
      doc.text(`CHF ${item.unitPrice.toFixed(2)}`, margin + 120, yPos);
      doc.text(`CHF ${item.total.toFixed(2)}`, pageWidth - margin - 30, yPos, { align: 'right' });
      yPos += 8;
    });

    yPos += 5;
    if (yPos > 250) {
      doc.addPage();
      yPos = margin;
    }

    // Totals
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.text('Zwischensumme:', pageWidth - margin - 50, yPos, { align: 'right' });
    doc.text(`CHF ${invoice.subtotal.toFixed(2)}`, pageWidth - margin - 5, yPos, { align: 'right' });
    yPos += 8;

    doc.text(`MwSt. (${invoice.taxRate}%):`, pageWidth - margin - 50, yPos, { align: 'right' });
    doc.text(`CHF ${invoice.taxAmount.toFixed(2)}`, pageWidth - margin - 5, yPos, { align: 'right' });
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setDrawColor(0, 0, 0);
    doc.line(pageWidth - margin - 60, yPos - 2, pageWidth - margin, yPos - 2);
    doc.text('Gesamtbetrag:', pageWidth - margin - 50, yPos, { align: 'right' });
    doc.text(`CHF ${invoice.total.toFixed(2)}`, pageWidth - margin - 5, yPos, { align: 'right' });
    yPos += 15;

    // Notes
    if (invoice.notes) {
      if (yPos > 250) {
        doc.addPage();
        yPos = margin;
      }
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Bemerkungen:', margin, yPos);
      yPos += 7;
      doc.setFont('helvetica', 'normal');
      const notesLines = doc.splitTextToSize(invoice.notes, pageWidth - 2 * margin);
      notesLines.forEach((line: string) => {
        doc.text(line, margin, yPos);
        yPos += 6;
      });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Seite ${i} von ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    // Save PDF
    doc.save(`${invoice.invoiceNumber}.pdf`);
    toast.success('PDF erfolgreich erstellt');
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Bezahlt';
      case 'sent':
        return 'Gesendet';
      case 'draft':
        return 'Entwurf';
      case 'cancelled':
        return 'Storniert';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'badge-success';
      case 'sent':
        return 'badge-info';
      case 'draft':
        return 'badge-gray';
      case 'cancelled':
        return 'badge-danger';
      default:
        return 'badge-gray';
    }
  };

  const handleStatusUpdate = async (status: string) => {
    if (!invoice) return;
    try {
      await api.patch(`/invoices/${invoice.id}`, { status });
      toast.success('Status erfolgreich aktualisiert');
      fetchInvoice();
    } catch (error) {
      toast.error('Status konnte nicht aktualisiert werden');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary-600 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          className="btn btn-secondary flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={generatePDF}
            className="btn btn-primary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            PDF herunterladen
          </button>
          <button
            onClick={handlePrint}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Drucken
          </button>
        </div>
      </div>

      {/* Invoice Preview */}
      <div className="card-elevated max-w-4xl mx-auto print:shadow-none">
        {/* Company Header */}
        <div className="text-center mb-8 pb-8 border-b border-gray-200">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent mb-2">
            OCEAN GARAGE
          </h1>
          <p className="text-gray-600 font-medium">Fahrzeugreparatur & Service</p>
          <p className="text-sm text-gray-500 mt-1">Schweiz</p>
        </div>

        {/* Invoice Info */}
        <div className="flex flex-col md:flex-row md:justify-between gap-6 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {invoice.type === 'invoice' ? 'RECHNUNG' : 'ANGEBOT'}
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">Rechnungsnummer:</span>
                <span className="text-gray-900">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">Datum:</span>
                <span className="text-gray-900">{format(new Date(invoice.createdAt), 'dd.MM.yyyy')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">Status:</span>
                <span className={`badge ${getStatusColor(invoice.status)}`}>
                  {getStatusText(invoice.status)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h3 className="font-bold text-gray-900 mb-3">Rechnungsempfänger</h3>
            <p className="font-semibold text-gray-900">{invoice.customerName}</p>
            {invoice.customerEmail && (
              <p className="text-sm text-gray-600 mt-1">{invoice.customerEmail}</p>
            )}
            {invoice.customerAddress && (
              <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">
                {invoice.customerAddress}
              </p>
            )}
          </div>
        </div>

        {/* Vehicle Info */}
        <div className="bg-primary-50 rounded-xl p-4 mb-8 border border-primary-100">
          <h3 className="font-bold text-primary-900 mb-2">Fahrzeug</h3>
          <div className="flex flex-wrap gap-4 text-sm">
            {invoice.vehicle.brand && invoice.vehicle.model && (
              <div>
                <span className="text-primary-700 font-semibold">Fahrzeug:</span>
                <span className="text-primary-900 ml-2">
                  {invoice.vehicle.brand} {invoice.vehicle.model}
                </span>
              </div>
            )}
            <div>
              <span className="text-primary-700 font-semibold">VIN:</span>
              <span className="text-primary-900 ml-2 font-mono">{invoice.vehicle.vin}</span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <h3 className="font-bold text-gray-900 mb-4">Positionen</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Beschreibung</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Menge</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Einzelpreis</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Gesamt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoice.items.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm text-gray-900">{item.description}</td>
                    <td className="px-4 py-4 text-sm text-center text-gray-600">{item.quantity}</td>
                    <td className="px-4 py-4 text-sm text-right text-gray-600">
                      CHF {item.unitPrice.toFixed(2)}
                    </td>
                    <td className="px-4 py-4 text-sm text-right font-semibold text-gray-900">
                      CHF {item.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-full md:w-80 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Zwischensumme:</span>
              <span className="font-semibold text-gray-900">CHF {invoice.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">MwSt. ({invoice.taxRate}%):</span>
              <span className="font-semibold text-gray-900">CHF {invoice.taxAmount.toFixed(2)}</span>
            </div>
            <div className="border-t-2 border-gray-300 pt-3 flex justify-between">
              <span className="text-lg font-bold text-gray-900">Gesamtbetrag:</span>
              <span className="text-lg font-bold text-primary-600">CHF {invoice.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="bg-amber-50 rounded-xl p-4 mb-8 border border-amber-100">
            <h3 className="font-bold text-amber-900 mb-2">Bemerkungen</h3>
            <p className="text-sm text-amber-800 whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-6 border-t border-gray-200 print:hidden">
          {invoice.status === 'draft' && (
            <button
              onClick={() => handleStatusUpdate('sent')}
              className="btn btn-primary flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Als gesendet markieren
            </button>
          )}
          {invoice.status === 'sent' && (
            <button
              onClick={() => handleStatusUpdate('paid')}
              className="btn btn-primary flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Als bezahlt markieren
            </button>
          )}
          <button
            onClick={handleBack}
            className="btn btn-secondary flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </button>
        </div>
      </div>
    </div>
  );
}


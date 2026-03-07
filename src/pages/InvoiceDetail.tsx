import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Download, Printer, FileText, Edit, Send, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { generateInvoicePDF } from '../utils/invoicePDF';
import type { InvoiceData, CompanyBankingDetails } from '../utils/invoicePDF';

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
  paymentMethod: 'cash' | 'qr_invoice';
  paymentReference?: string;
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

  const handleDownloadPDF = async () => {
    if (!invoice) return;

    let bankingDetails: CompanyBankingDetails | undefined;
    let swissCrossBase64: string | undefined;

    if (invoice.paymentMethod === 'qr_invoice') {
      try {
        const [bankingRes, crossRes] = await Promise.all([
          api.get('/settings/company-banking'),
          fetch('/swiss-cross.png').then((r) => r.blob()),
        ]);
        bankingDetails = bankingRes.data;
        swissCrossBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(crossRes);
        });
      } catch {
        toast.error('Bankdaten konnten nicht geladen werden');
        return;
      }
    }

    const invoiceData: InvoiceData = {
      invoiceNumber: invoice.invoiceNumber,
      type: invoice.type as 'invoice' | 'estimate',
      customerName: invoice.customerName,
      customerEmail: invoice.customerEmail,
      customerAddress: invoice.customerAddress,
      items: invoice.items,
      subtotal: invoice.subtotal,
      taxRate: invoice.taxRate,
      taxAmount: invoice.taxAmount,
      total: invoice.total,
      notes: invoice.notes,
      createdAt: invoice.createdAt,
      vehicle: invoice.vehicle,
      paymentMethod: invoice.paymentMethod,
      paymentReference: invoice.paymentReference,
    };

    const dataUrl = await generateInvoicePDF(
      invoiceData,
      {},
      bankingDetails,
      swissCrossBase64,
    );

    if (typeof dataUrl === 'string') {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${invoice.invoiceNumber}.pdf`;
      link.click();
    }
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
            onClick={handleDownloadPDF}
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
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">Zahlungsart:</span>
                <span className="text-gray-900">
                  {invoice.paymentMethod === 'qr_invoice' ? 'QR-Rechnung' : 'Barzahlung'}
                </span>
              </div>
              {invoice.paymentReference && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-700">Referenz:</span>
                  <span className="text-gray-900 font-mono">{invoice.paymentReference}</span>
                </div>
              )}
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


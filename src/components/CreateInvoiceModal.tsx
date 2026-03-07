import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Download, Mail, FileText, CreditCard, Banknote, AlertTriangle, MessageCircle } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { generateInvoicePDF } from '../utils/invoicePDF';
import type { InvoiceData, CompanyBankingDetails } from '../utils/invoicePDF';
import type { ServiceTemplate } from '../types';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface ModalVehicle {
  id: string;
  vin: string;
  brand?: string;
  model?: string;
  serviceType?: string;
  serviceTemplateId?: string;
  serviceTemplate?: ServiceTemplate;
  selectedParts?: any;
  status?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

interface CreateInvoiceModalProps {
  isOpen: boolean;
  vehicle: ModalVehicle;
  type: 'estimate' | 'invoice';
  ordinal?: number;
  onClose: () => void;
  onCreated: (invoice: any) => void;
}

export default function CreateInvoiceModal({
  isOpen,
  vehicle,
  type,
  ordinal,
  onClose,
  onCreated,
}: CreateInvoiceModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [isCreating, setIsCreating] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [hoursWarning, setHoursWarning] = useState<string | null>(null);
  const [laborItemIndex, setLaborItemIndex] = useState<number>(-1);

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    taxRate: '7.7',
    notes: '',
    paymentMethod: 'cash' as 'cash' | 'qr_invoice',
    items: [] as InvoiceItem[],
  });

  useEffect(() => {
    if (!isOpen) return;

    setStep(1);
    setCreatedInvoice(null);
    setPdfDataUrl(null);
    setIsCreating(false);
    setHoursWarning(null);
    setLaborItemIndex(-1);

    setFormData({
      customerName: vehicle.customerName || '',
      customerEmail: vehicle.customerEmail || '',
      customerPhone: vehicle.customerPhone || '',
      customerAddress: '',
      taxRate: '7.7',
      notes: '',
      paymentMethod: 'cash',
      items: [],
    });

    loadItems();
  }, [isOpen, vehicle.id, type]);

  const loadItems = async () => {
    const items: InvoiceItem[] = [];
    let template: ServiceTemplate | null = vehicle.serviceTemplate || null;

    // Fetch template if we have an ID but no template object
    if (!template && vehicle.serviceTemplateId) {
      try {
        const res = await api.get(`/service-templates/${vehicle.serviceTemplateId}`);
        template = res.data;
      } catch {
        // Template not found, continue without it
      }
    }

    const hourlyRate = template?.hourlyRate || 120;
    const estimatedHours = template?.estimatedHours || 0;

    try {
      // Add custom articles from template (for both estimates and invoices)
      if (template?.customArticles && template.customArticles.length > 0) {
        for (const article of template.customArticles) {
          items.push({
            description: article.description,
            quantity: article.quantity,
            unitPrice: article.unitPrice,
            total: article.quantity * article.unitPrice,
          });
        }
      }

      if (type === 'estimate') {
        // ESTIMATE mode: use selectedParts (saved Derendinger prices) + estimated hours

        // Add Derendinger parts from saved selectedParts
        const savedParts = vehicle.selectedParts;
        if (savedParts && Array.isArray(savedParts)) {
          for (const part of savedParts) {
            const price = part.price?.net1Price || part.price?.grossPrice || 0;
            if (price > 0) {
              items.push({
                description: `${part.brand || ''} ${part.articleNumber || ''} - ${part.categoryName || part.name || ''}`.trim(),
                quantity: part.quantity || 1,
                unitPrice: price,
                total: (part.quantity || 1) * price,
              });
            }
          }
        }

        // Add estimated labor hours from template
        if (estimatedHours > 0) {
          items.push({
            description: `Arbeitsstunden (geschätzt: ${estimatedHours.toFixed(2)}h)`,
            quantity: estimatedHours,
            unitPrice: hourlyRate,
            total: estimatedHours * hourlyRate,
          });
        }
      } else {
        // INVOICE mode: use real expenses + actual hours + warning

        // Add real expenses
        const expensesRes = await api.get('/expenses', {
          params: { vehicleId: vehicle.id },
        });
        const expenses = expensesRes.data || [];

        for (const expense of expenses) {
          items.push({
            description: expense.description,
            quantity: 1,
            unitPrice: expense.amount,
            total: expense.amount,
          });
        }

        // Add actual logged hours (always add the line — even if 0, so user can fill it in)
        const timeRes = await api.get('/time-logs/total/hours', {
          params: { vehicleId: vehicle.id },
        });
        const totalHours = timeRes.data?.totalHours || 0;

        // Always add the labor line item so the user can edit it
        const laborIdx = items.length;
        items.push({
          description: totalHours > 0
            ? `Arbeitsstunden (${totalHours.toFixed(2)}h erfasst)`
            : `Arbeitsstunden${estimatedHours > 0 ? ` (geschätzt: ${estimatedHours.toFixed(1)}h)` : ''}`,
          quantity: totalHours,
          unitPrice: hourlyRate,
          total: totalHours * hourlyRate,
        });

        // Hours warning — highlight the labor row
        if (totalHours === 0) {
          setLaborItemIndex(laborIdx);
          setHoursWarning(
            estimatedHours > 0
              ? `Keine Arbeitsstunden erfasst! Geschätzte Stunden (${estimatedHours.toFixed(1)}h) wurden eingesetzt — bitte prüfen.`
              : 'Keine Arbeitsstunden erfasst! Bitte Stunden manuell eingeben.'
          );
        } else if (estimatedHours > 0 && totalHours < estimatedHours) {
          setLaborItemIndex(laborIdx);
          setHoursWarning(
            `Erfasste Stunden (${totalHours.toFixed(1)}h) sind weniger als geschätzt (${estimatedHours.toFixed(1)}h)`
          );
        }
      }
    } catch {
      toast.error('Daten konnten nicht geladen werden');
    }

    setFormData((prev) => ({ ...prev, items }));
  };

  const updateItem = (
    index: number,
    field: 'description' | 'quantity' | 'unitPrice',
    value: string | number,
  ) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index], [field]: field === 'description' ? value : parseFloat(value.toString()) || 0 };
    item.total = item.quantity * item.unitPrice;
    newItems[index] = item;
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { description: '', quantity: 1, unitPrice: 0, total: 0 },
      ],
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
  const taxRate = parseFloat(formData.taxRate) || 7.7;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const handleCreate = async () => {
    if (!formData.customerName.trim()) {
      toast.error('Bitte geben Sie den Kundennamen ein');
      return;
    }
    if (formData.items.length === 0) {
      toast.error('Bitte fügen Sie mindestens eine Position hinzu');
      return;
    }

    setIsCreating(true);
    try {
      const response = await api.post('/invoices', {
        type,
        vehicleId: vehicle.id,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail || undefined,
        customerAddress: formData.customerAddress || undefined,
        items: formData.items,
        taxRate: parseFloat(formData.taxRate) || 7.7,
        notes: formData.notes || undefined,
        paymentMethod: type === 'invoice' ? formData.paymentMethod : 'cash',
      });

      const invoice = response.data;
      setCreatedInvoice(invoice);

      const invoiceData: InvoiceData = {
        invoiceNumber: invoice.invoiceNumber,
        type: invoice.type,
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
        vehicle: invoice.vehicle || {
          vin: vehicle.vin,
          brand: vehicle.brand,
          model: vehicle.model,
        },
        paymentMethod: invoice.paymentMethod,
        paymentReference: invoice.paymentReference,
      };

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
          // QR bill will be skipped if banking details fail
        }
      }

      const dataUrl = await generateInvoicePDF(
        invoiceData,
        {},
        bankingDetails,
        swissCrossBase64,
      );

      if (typeof dataUrl === 'string') {
        setPdfDataUrl(dataUrl);

        try {
          const pdfFile = dataURLtoFile(dataUrl, `${invoice.invoiceNumber}.pdf`);
          const uploadForm = new FormData();
          uploadForm.append('file', pdfFile);
          await api.post(`/invoices/${invoice.id}/upload-pdf`, uploadForm, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch {
          // Upload is optional
        }
      }

      toast.success(
        `${type === 'invoice' ? 'Rechnung' : 'Angebot'} erfolgreich erstellt`,
      );
      setStep(2);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || 'Fehler beim Erstellen',
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (createdInvoice) {
      onCreated(createdInvoice);
    }
    onClose();
  };

  const handleDownloadPDF = () => {
    if (!pdfDataUrl || !createdInvoice) return;
    const link = document.createElement('a');
    link.href = pdfDataUrl;
    link.download = `${createdInvoice.invoiceNumber}.pdf`;
    link.click();
    toast.success('PDF heruntergeladen');
  };

  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const handleEmail = async () => {
    if (!createdInvoice) return;
    const email = vehicle.customerEmail || formData.customerEmail;
    if (!email) {
      toast.error('Keine E-Mail-Adresse vorhanden');
      return;
    }

    setIsSendingEmail(true);
    try {
      await api.post('/mail/send-invoice', {
        invoiceId: createdInvoice.id,
        to: email,
      });
      // Update status to "sent"
      try {
        await api.patch(`/invoices/${createdInvoice.id}`, { status: 'sent' });
        setCreatedInvoice({ ...createdInvoice, status: 'sent' });
      } catch {
        // Status update is non-critical
      }
      toast.success(`E-Mail an ${email} gesendet`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'E-Mail konnte nicht gesendet werden');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  const handleWhatsApp = async () => {
    if (!createdInvoice) return;
    const phone = vehicle.customerPhone || formData.customerPhone;
    if (!phone) {
      toast.error('Keine Telefonnummer vorhanden');
      return;
    }

    setIsSendingWhatsApp(true);
    try {
      await api.post('/whatsapp/send-invoice', {
        invoiceId: createdInvoice.id,
        to: phone,
      });
      try {
        await api.patch(`/invoices/${createdInvoice.id}`, { status: 'sent' });
        setCreatedInvoice({ ...createdInvoice, status: 'sent' });
      } catch {
        // Status update is non-critical
      }
      toast.success(`WhatsApp an ${phone} gesendet`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'WhatsApp konnte nicht gesendet werden');
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  if (!isOpen) return null;

  const hasEmail = !!(vehicle.customerEmail || formData.customerEmail);
  const hasPhone = !!(vehicle.customerPhone || formData.customerPhone);

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {ordinal && ordinal > 1 ? `${ordinal}. ` : ''}
                {type === 'invoice' ? 'Rechnung erstellen' : 'Angebot erstellen'}
              </h2>
              <p className="text-xs text-gray-500">
                {vehicle.brand} {vehicle.model} &middot; {vehicle.vin}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {step === 1 ? (
            <div className="p-6 space-y-6">

              {/* Hours Warning (invoices only) */}
              {type === 'invoice' && hoursWarning && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900 text-sm">Stunden-Warnung</p>
                    <p className="text-sm text-amber-700 mt-0.5">{hoursWarning}</p>
                  </div>
                </div>
              )}

              {/* Customer Info */}
              <section>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Kundeninformationen</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Kundenname <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      className="input text-sm"
                      placeholder="Max Mustermann"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">E-Mail</label>
                    <input
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                      className="input text-sm"
                      placeholder="max@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Telefon</label>
                    <input
                      type="tel"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                      className="input text-sm"
                      placeholder="+41 79 123 45 67"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Adresse</label>
                    <input
                      type="text"
                      value={formData.customerAddress}
                      onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                      className="input text-sm"
                      placeholder="Musterstrasse 1, 3000 Bern"
                    />
                  </div>
                </div>
              </section>

              {/* Items */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Positionen</h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Hinzufügen
                  </button>
                </div>

                {formData.items.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">
                    Keine Positionen vorhanden
                  </p>
                ) : (
                  <div className="space-y-2">
                    {formData.items.map((item, index) => {
                      const isWarningRow = type === 'invoice' && hoursWarning && index === laborItemIndex;
                      return (
                      <div
                        key={index}
                        className={`grid grid-cols-12 gap-2 items-center rounded-lg px-3 py-2 ${
                          isWarningRow
                            ? 'bg-red-50 border border-red-200'
                            : 'bg-gray-50/70'
                        }`}
                      >
                        <div className="col-span-5">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            placeholder="Beschreibung"
                            className="input text-xs"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            value={item.quantity || ''}
                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                            placeholder="Menge"
                            className={`input text-xs ${isWarningRow ? 'border-red-300 bg-white' : ''}`}
                            step="0.01"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                            placeholder="Preis"
                            className="input text-xs"
                            step="0.01"
                          />
                        </div>
                        <div className={`col-span-2 text-right text-xs font-semibold ${isWarningRow ? 'text-red-600' : 'text-gray-700'}`}>
                          {item.total.toFixed(2)}
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-1 hover:bg-red-100 rounded-md text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}

                {/* Totals */}
                {formData.items.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-100 space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Zwischensumme</span>
                      <span>CHF {subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>MwSt. ({taxRate}%)</span>
                      <span>CHF {taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-gray-900 pt-1">
                      <span>Total</span>
                      <span className="text-primary-600">CHF {total.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </section>

              {/* Tax & Notes row */}
              <section>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">MwSt. (%)</label>
                    <input
                      type="number"
                      value={formData.taxRate}
                      onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                      step="0.1"
                      className="input text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Bemerkungen</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={2}
                      className="input text-sm"
                      placeholder="Optionale Bemerkungen..."
                    />
                  </div>
                </div>
              </section>

              {/* Payment Method (invoices only) */}
              {type === 'invoice' && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Zahlungsart</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, paymentMethod: 'cash' })}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                        formData.paymentMethod === 'cash'
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        formData.paymentMethod === 'cash'
                          ? 'bg-primary-100'
                          : 'bg-gray-100'
                      }`}>
                        <Banknote className={`w-5 h-5 ${
                          formData.paymentMethod === 'cash'
                            ? 'text-primary-600'
                            : 'text-gray-400'
                        }`} />
                      </div>
                      <div className="text-left">
                        <p className={`text-sm font-medium ${
                          formData.paymentMethod === 'cash'
                            ? 'text-primary-700'
                            : 'text-gray-700'
                        }`}>Barzahlung</p>
                        <p className="text-xs text-gray-400">Vor Ort bezahlen</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, paymentMethod: 'qr_invoice' })}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                        formData.paymentMethod === 'qr_invoice'
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        formData.paymentMethod === 'qr_invoice'
                          ? 'bg-primary-100'
                          : 'bg-gray-100'
                      }`}>
                        <CreditCard className={`w-5 h-5 ${
                          formData.paymentMethod === 'qr_invoice'
                            ? 'text-primary-600'
                            : 'text-gray-400'
                        }`} />
                      </div>
                      <div className="text-left">
                        <p className={`text-sm font-medium ${
                          formData.paymentMethod === 'qr_invoice'
                            ? 'text-primary-700'
                            : 'text-gray-700'
                        }`}>QR-Rechnung</p>
                        <p className="text-xs text-gray-400">Banküberweisung</p>
                      </div>
                    </button>
                  </div>
                </section>
              )}
            </div>
          ) : (
            /* STEP 2: PDF Preview */
            <div className="p-6">
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                {pdfDataUrl ? (
                  <iframe
                    src={pdfDataUrl}
                    className="w-full h-[60vh] border-0"
                    title="PDF Preview"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4" />
                    <p className="text-sm text-gray-500">PDF wird erstellt...</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-100 px-6 py-4">
          {step === 1 ? (
            <div className="flex items-center gap-3">
              <button
                onClick={handleClose}
                className="btn btn-secondary"
                disabled={isCreating}
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreate}
                disabled={isCreating || !formData.customerName || formData.items.length === 0}
                className="btn btn-primary flex-1 disabled:opacity-50"
              >
                {isCreating ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Erstelle...
                  </span>
                ) : type === 'invoice' ? (
                  'Rechnung erstellen'
                ) : (
                  'Angebot erstellen'
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPDF}
                  className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  PDF herunterladen
                </button>
                {hasEmail && (
                  <button
                    onClick={handleEmail}
                    disabled={isSendingEmail}
                    className="btn bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSendingEmail ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sende...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        E-Mail
                      </>
                    )}
                  </button>
                )}
                {hasPhone && (
                  <button
                    onClick={handleWhatsApp}
                    disabled={isSendingWhatsApp}
                    className="btn bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSendingWhatsApp ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sende...
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => setStep(1)}
                  className="btn btn-secondary text-sm"
                >
                  Bearbeiten
                </button>
                <button
                  onClick={handleClose}
                  className="btn btn-primary flex-1 text-sm"
                >
                  Fertig
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function dataURLtoFile(dataurl: string, filename: string): File {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/pdf';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

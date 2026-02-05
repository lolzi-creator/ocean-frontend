import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, Search, Car, Edit, Trash2, X, Check, ChevronDown, ChevronUp, FileText, Send, Mail, Download, Play, Pause, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import DerendingerProductPicker from '../components/DerendingerProductPicker';

interface Vehicle {
  id: string;
  vin: string;
  brand?: string;
  model?: string;
  year?: number;
  trim?: string;
  style?: string;
  bodyType?: string;
  engine?: string;
  transmission?: string;
  drive?: string;
  manufacturer?: string;
  origin?: string;
  licensePlate?: string;
  workDescription?: string;
  serviceType?: string;
  color?: string;
  mileage?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  status?: string; // on_hold, active, completed
  isActive: boolean;
  createdAt: string;
}

interface SelectedProduct {
  id: string;
  articleNumber: string;
  name: string;
  description: string;
  supplier: string;
  brand: string;
  stock: number;
  totalStock: number;
  price: number | null;
  images: string[];
  category: string;
  categoryName: string;
  salesQuantity: number;
  availabilityType?: string;
  deliveryInfo?: string;
  quantity: number;
  isAutoSelected?: boolean;
}

export default function Vehicles() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vinInput, setVinInput] = useState('');
  const [vinData, setVinData] = useState<any>(null);
  const [vehicleImage, setVehicleImage] = useState<string | null>(null);
  const [showFullVinData, setShowFullVinData] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2>(1); // Step 1: Review/Edit, Step 2: PDF Preview
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [invoiceType, setInvoiceType] = useState<'estimate' | 'invoice'>('estimate');
  const [invoiceFormData, setInvoiceFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    taxRate: '7.7',
    notes: '',
    items: [] as Array<{ description: string; quantity: number; unitPrice: number; total: number }>,
  });
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);
  const [pdfBlob, setPdfBlob] = useState<string | null>(null); // PDF data URL for preview
  const [isCreating, setIsCreating] = useState(false);
  
  // Activation modal state
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [activatingVehicle, setActivatingVehicle] = useState<Vehicle | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [isActivating, setIsActivating] = useState(false);
  
  const [formData, setFormData] = useState({
    vin: '',
    brand: '',
    model: '',
    year: '',
    trim: '',
    style: '',
    bodyType: '',
    engine: '',
    transmission: '',
    drive: '',
    manufacturer: '',
    origin: '',
    licensePlate: '',
    workDescription: '',
    color: '',
    mileage: '',
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const response = await api.get('/vehicles');
      setVehicles(response.data || []);
    } catch (error) {
      console.error('[Vehicles] Error:', error);
      toast.error('Fahrzeuge konnten nicht geladen werden');
    } finally {
      setIsLoading(false);
    }
  };

  const decodeVin = async () => {
    if (!vinInput || vinInput.length !== 17) {
      toast.error('VIN muss 17 Zeichen lang sein');
      return;
    }

    try {
      const response = await api.get(`/vehicles/decode/${vinInput}`);
      const data = response.data;
      setVinData(data);
      
      // Extract vehicle data directly from API response
      const year = data.vehicle?.year || data.year;
      const make = data.vehicle?.make || data.make;
      const model = data.vehicle?.model || data.model;
      
      setFormData((prev) => ({
        ...prev,
        vin: vinInput,
        brand: make || prev.brand,
        model: model || prev.model,
        year: year ? year.toString() : prev.year,
        trim: data.trim || prev.trim,
        style: data.style || prev.style,
        bodyType: data.body || data.bodyType || prev.bodyType,
        engine: data.engine || prev.engine,
        transmission: data.transmission || prev.transmission,
        drive: data.drive || prev.drive,
        manufacturer: data.vehicle?.manufacturer || data.manufacturer || prev.manufacturer,
        origin: data.origin || prev.origin,
      }));
      
      // Handle images if available - check multiple possible locations
      if (data.images && Array.isArray(data.images) && data.images.length > 0) {
        setVehicleImage(data.images[0]); // Use first image
      } else if (data.image) {
        setVehicleImage(data.image);
      } else if (data.photos && Array.isArray(data.photos) && data.photos.length > 0) {
        setVehicleImage(data.photos[0]);
      } else if (data.media?.images?.[0]) {
        setVehicleImage(data.media.images[0]);
      } else {
        setVehicleImage(null);
      }
      
      toast.success('VIN erfolgreich dekodiert');
    } catch (error) {
      toast.error('VIN konnte nicht dekodiert werden');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        year: formData.year ? parseInt(formData.year) : undefined,
        mileage: formData.mileage ? parseInt(formData.mileage) : undefined,
        // Remove empty strings and convert to undefined
        trim: formData.trim || undefined,
        style: formData.style || undefined,
        bodyType: formData.bodyType || undefined,
        engine: formData.engine || undefined,
        transmission: formData.transmission || undefined,
        drive: formData.drive || undefined,
        manufacturer: formData.manufacturer || undefined,
        origin: formData.origin || undefined,
        color: formData.color || undefined,
      };

      if (editingVehicle) {
        await api.patch(`/vehicles/${editingVehicle.id}`, payload);
        toast.success('Fahrzeug erfolgreich aktualisiert');
      } else {
        await api.post('/vehicles', payload);
        toast.success('Fahrzeug erfolgreich erstellt');
      }

      setShowModal(false);
      resetForm();
      fetchVehicles();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Fahrzeug konnte nicht gespeichert werden');
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      vin: vehicle.vin,
      brand: vehicle.brand || '',
      model: vehicle.model || '',
      year: vehicle.year?.toString() || '',
      trim: vehicle.trim || '',
      style: vehicle.style || '',
      bodyType: vehicle.bodyType || '',
      engine: vehicle.engine || '',
      transmission: vehicle.transmission || '',
      drive: vehicle.drive || '',
      manufacturer: vehicle.manufacturer || '',
      origin: vehicle.origin || '',
      licensePlate: vehicle.licensePlate || '',
      workDescription: vehicle.workDescription || '',
      color: vehicle.color || '',
      mileage: vehicle.mileage?.toString() || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sind Sie sicher, dass Sie dieses Fahrzeug löschen möchten?')) return;

    try {
      await api.delete(`/vehicles/${id}`);
      toast.success('Fahrzeug erfolgreich gelöscht');
      fetchVehicles();
    } catch (error) {
      toast.error('Fahrzeug konnte nicht gelöscht werden');
    }
  };

  const resetForm = () => {
    setFormData({
      vin: '',
      brand: '',
      model: '',
      year: '',
      trim: '',
      style: '',
      bodyType: '',
      engine: '',
      transmission: '',
      drive: '',
      manufacturer: '',
      origin: '',
      licensePlate: '',
      workDescription: '',
      color: '',
      mileage: '',
    });
    setEditingVehicle(null);
    setVinInput('');
    setVinData(null);
    setVehicleImage(null);
    setShowFullVinData(false);
  };

  const filteredVehicles = vehicles.filter(
    (v) =>
      v.vin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.licensePlate?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeVehicles = vehicles.filter(v => v.isActive).length;
  const totalVehicles = vehicles.length;

  const handleQuickInvoice = async (vehicle: Vehicle, type: 'estimate' | 'invoice') => {
    setSelectedVehicle(vehicle);
    setInvoiceType(type);
    setModalStep(1);
    setCreatedInvoice(null);
    setPdfBlob(null);
    setIsCreating(false);
    
    // Use customer info from vehicle
    setInvoiceFormData({
      customerName: vehicle.customerName || '',
      customerEmail: vehicle.customerEmail || '',
      customerPhone: vehicle.customerPhone || '',
      customerAddress: '',
      taxRate: '7.7',
      notes: '',
      items: [],
    });
    
    // Load items based on type
    await loadInvoiceItems(vehicle, type);
    
    setShowInvoiceModal(true);
  };

  const loadInvoiceItems = async (vehicle: Vehicle, type: 'estimate' | 'invoice') => {
    if (type === 'estimate') {
      // For estimates: Get service package items (don't create yet, just preview)
      if (vehicle.serviceType) {
        try {
          // Get expenses for this vehicle
          const expensesResponse = await api.get('/expenses', {
            params: { vehicleId: vehicle.id },
          });
          const expenses = expensesResponse.data || [];

          // Service package estimates (hardcoded for now, same as backend)
          const servicePackages: Record<string, any> = {
            small_service: { estimatedHours: 1.5, name: 'Kleine Wartung' },
            big_service: { estimatedHours: 4.0, name: 'Grosse Wartung' },
            tire_change: { estimatedHours: 1.0, name: 'Reifenwechsel' },
            brake_service: { estimatedHours: 2.5, name: 'Bremsenservice' },
            repair: { estimatedHours: 3.0, name: 'Reparatur' },
            inspection: { estimatedHours: 1.0, name: 'Inspektion' },
          };

          const servicePackage = servicePackages[vehicle.serviceType];
          const hourlyRate = 120;
          const estimatedHours = servicePackage?.estimatedHours || 0;

          const items: any[] = [];

          // Add expenses as items
          expenses.forEach((expense: any) => {
            items.push({
              description: expense.description,
              quantity: 1,
              unitPrice: expense.amount,
              total: expense.amount,
            });
          });

          // Add estimated labor hours
          if (estimatedHours > 0) {
            items.push({
              description: `Arbeitsstunden (geschätzt: ${estimatedHours.toFixed(2)}h)`,
              quantity: estimatedHours,
              unitPrice: hourlyRate,
              total: estimatedHours * hourlyRate,
            });
          }

          setInvoiceFormData(prev => ({
            ...prev,
            items,
            taxRate: '7.7',
          }));
        } catch (error: any) {
          toast.error('Service-Paket konnte nicht geladen werden');
        }
      }
    } else {
      // For invoices: Get expenses and time logs
      try {
        const timeLogsResponse = await api.get('/time-logs/total/hours', {
          params: { vehicleId: vehicle.id },
        });
        const totalHours = timeLogsResponse.data?.totalHours || 0;

        const expensesResponse = await api.get('/expenses', {
          params: { vehicleId: vehicle.id },
        });
        const expenses = expensesResponse.data || [];

        const items: any[] = [];

        expenses.forEach((expense: any) => {
          items.push({
            description: expense.description,
            quantity: 1,
            unitPrice: expense.amount,
            total: expense.amount,
          });
        });

        if (totalHours > 0) {
          const hourlyRate = 120;
          items.push({
            description: `Arbeitsstunden (${totalHours.toFixed(2)}h)`,
            quantity: totalHours,
            unitPrice: hourlyRate,
            total: totalHours * hourlyRate,
          });
        }

        setInvoiceFormData(prev => ({ ...prev, items }));
      } catch (error: any) {
        toast.error('Daten konnten nicht geladen werden');
      }
    }
  };

  const updateItem = (index: number, field: 'description' | 'quantity' | 'unitPrice', value: string | number) => {
    const newItems = [...invoiceFormData.items];
    newItems[index] = {
      ...newItems[index],
      [field]: field === 'description' ? value : parseFloat(value.toString()),
      total: field === 'quantity' || field === 'unitPrice'
        ? newItems[index].quantity * newItems[index].unitPrice
        : newItems[index].total,
    };
    // Recalculate total
    newItems[index].total = newItems[index].quantity * newItems[index].unitPrice;
    setInvoiceFormData({ ...invoiceFormData, items: newItems });
  };

  const addItem = () => {
    setInvoiceFormData({
      ...invoiceFormData,
      items: [...invoiceFormData.items, { description: '', quantity: 1, unitPrice: 0, total: 0 }],
    });
  };

  const removeItem = (index: number) => {
    setInvoiceFormData({
      ...invoiceFormData,
      items: invoiceFormData.items.filter((_, i) => i !== index),
    });
  };

  const createInvoiceOrQuote = async () => {
    if (!selectedVehicle) return;
    
    // Validate
    if (!invoiceFormData.customerName) {
      toast.error('Bitte geben Sie den Kundennamen ein');
      return;
    }

    if (invoiceFormData.items.length === 0) {
      toast.error('Bitte fügen Sie mindestens eine Position hinzu');
      return;
    }

    setIsCreating(true);
    try {
      // Create invoice/quote
      const response = await api.post('/invoices', {
        type: invoiceType,
        vehicleId: selectedVehicle.id,
        customerName: invoiceFormData.customerName,
        customerEmail: invoiceFormData.customerEmail || undefined,
        customerAddress: invoiceFormData.customerAddress || undefined,
        items: invoiceFormData.items,
        taxRate: parseFloat(invoiceFormData.taxRate) || 7.7,
        notes: invoiceFormData.notes || undefined,
      });

      const invoice = response.data;
      setCreatedInvoice(invoice);

      // Generate professional PDF with logo
      const pdfBlob = await generateProfessionalPDF(invoice);
      setPdfBlob(pdfBlob);

      // Upload PDF to Supabase Storage
      const pdfFile = dataURLtoFile(pdfBlob, `${invoice.invoiceNumber}.pdf`);
      const formData = new FormData();
      formData.append('file', pdfFile);

      try {
        const uploadResponse = await api.post(`/invoices/${invoice.id}/upload-pdf`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        
        // Update invoice with PDF URL
        setCreatedInvoice({ ...invoice, pdfUrl: uploadResponse.data.pdfUrl });
        toast.success(`${invoiceType === 'invoice' ? 'Rechnung' : 'Angebot'} erfolgreich erstellt und PDF gespeichert`);
      } catch (uploadError) {
        toast.error('PDF konnte nicht hochgeladen werden, aber erstellt wurde gespeichert');
      }

      // Move to step 2 (PDF preview)
      setModalStep(2);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Fehler beim Erstellen');
    } finally {
      setIsCreating(false);
    }
  };

  const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/pdf';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const generateProfessionalPDF = async (invoice: any): Promise<string> => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const blueColor: [number, number, number] = [2, 132, 199]; // primary-600: #0284c7
    const lightBlue: [number, number, number] = [241, 245, 249]; // slate-100 for backgrounds
    let yPos = margin;

    // Blue vertical bar on left (like the examples)
    doc.setFillColor(...blueColor);
    doc.rect(margin, yPos, 4, pageHeight - margin * 2, 'F');

    // Company name header (no logo, just text)
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...blueColor);
    doc.text('OCEANCAR', margin + 8, yPos + 12);
    yPos += 25;

    // Company info section (right side, like the examples)
    const companyInfoX = pageWidth - margin;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    // Company name bold
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Ocean Garage', companyInfoX, yPos - 18, { align: 'right' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const companyInfo = [
      'Fahrzeugreparatur & Service',
      'Schweiz',
    ];
    companyInfo.forEach((line, idx) => {
      doc.text(line, companyInfoX, yPos - 10 + (idx * 5), { align: 'right' });
    });

    yPos += 15;

    // Document type (large, blue, top right)
    doc.setFontSize(32);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...blueColor);
    const docType = invoice.type === 'invoice' ? 'RECHNUNG' : 'ANGEBOT';
    doc.text(docType, companyInfoX, yPos, { align: 'right' });
    yPos += 10;

    // Offer/Invoice details box (top right, like examples)
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

    // Customer info box (left, with background like examples)
    const customerBoxY = yPos;
    doc.setFillColor(...lightBlue);
    const customerBoxHeight = invoice.customerAddress ? 35 : invoice.customerEmail ? 28 : 22;
    doc.rect(margin + 8, customerBoxY, 75, customerBoxHeight, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...blueColor);
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

    // Vehicle info box (right, with background)
    const vehicleBoxY = customerBoxY;
    const vehicleBoxHeight = selectedVehicle?.brand && selectedVehicle?.model ? 25 : 20;
    doc.setFillColor(250, 250, 250);
    doc.rect(pageWidth - margin - 75, vehicleBoxY, 75, vehicleBoxHeight, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('Fahrzeug:', pageWidth - margin - 73, vehicleBoxY + 6);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    if (selectedVehicle?.brand && selectedVehicle?.model) {
      doc.text(`${selectedVehicle.brand} ${selectedVehicle.model}`, pageWidth - margin - 73, vehicleBoxY + 11);
      doc.text(`VIN: ${selectedVehicle.vin}`, pageWidth - margin - 73, vehicleBoxY + 16);
    } else {
      doc.text(`VIN: ${selectedVehicle?.vin || invoice.vehicle.vin}`, pageWidth - margin - 73, vehicleBoxY + 11);
    }

    yPos = Math.max(customerBoxY + customerBoxHeight, vehicleBoxY + vehicleBoxHeight) + 15;

    // Introductory text (like examples)
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

    // Items table header - professional style
    doc.setFillColor(...blueColor);
    doc.rect(margin + 8, yPos - 4, pageWidth - 2 * margin - 8, 7, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    
    const tableStart = margin + 10;
    const descWidth = 75; // Description column width (more space now)
    const qtyWidth = 100; // Quantity column position
    const unitWidth = 120; // Unit column position
    const priceWidth = 145; // Price column position (right-aligned)
    const totalWidth = pageWidth - margin - 2; // Total column position (right aligned)
    
    doc.text('BESCHREIBUNG', tableStart, yPos);
    doc.text('MENGE', qtyWidth, yPos, { align: 'center' });
    doc.text('EINHEIT', unitWidth, yPos, { align: 'center' });
    doc.text('PREIS', priceWidth, yPos, { align: 'right' });
    doc.text('TOTAL', totalWidth, yPos, { align: 'right' });
    yPos += 8;

    // Table rows - clean white/light gray alternating
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    invoice.items.forEach((item: any, idx: number) => {
      if (yPos > pageHeight - 70) {
        doc.addPage();
        yPos = margin + 10;
      }

      // Alternate row colors (white and very light gray)
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
      
      // Quantity
      doc.text(item.quantity.toString(), qtyWidth, yPos, { align: 'center' });
      
      // Unit (Stück)
      doc.text('Stück', unitWidth, yPos, { align: 'center' });
      
      // Unit Price (right-aligned)
      doc.text(`CHF ${item.unitPrice.toFixed(2)}`, priceWidth, yPos, { align: 'right' });
      
      // Total (right-aligned, bold)
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
          yPos += 5;
          // Adjust for continuation lines - don't repeat other columns
          yPos -= 1;
        });
      }
    });

    yPos += 5;
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = margin;
    }

    // Totals section - professional style
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

    // Total with blue emphasis (like examples)
    doc.setFillColor(...lightBlue);
    doc.rect(pageWidth - margin - 85, yPos - 3, 83, 8, 'F');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(pageWidth - margin - 85, yPos - 3, pageWidth - margin - 2, yPos - 3);
    doc.text('Gesamtbetrag:', pageWidth - margin - 60, yPos + 2, { align: 'right' });
    doc.setTextColor(...blueColor);
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
      doc.text(
        `Seite ${i} von ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      doc.text(
        'Ocean Garage - Fahrzeugreparatur & Service',
        pageWidth / 2,
        pageHeight - 5,
        { align: 'center' }
      );
    }

    // Return as data URL
    return doc.output('dataurlstring');
  };




  const openWhatsApp = (invoice: any, phoneNumber?: string) => {
    const phone = phoneNumber || selectedVehicle?.customerPhone || invoice.customerPhone || invoiceFormData.customerPhone;
    if (!phone) {
      toast.error('Fahrzeug hat keine Telefonnummer');
      return;
    }

    const cleanPhone = phone.replace(/[^\d+]/g, '');
    const message = `Guten Tag,\n\nanbei erhalten Sie Ihr ${invoice.type === 'invoice' ? 'Rechnung' : 'Angebot'}:\n\nRechnungsnummer: ${invoice.invoiceNumber}\nGesamtbetrag: CHF ${invoice.total.toFixed(2)}\n\nBitte kontaktieren Sie uns bei Fragen.\n\nFreundliche Grüsse\nOcean Garage`;

    // Open WhatsApp Web or app
    const whatsappUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    toast.success('WhatsApp geöffnet');
  };

  const sendEmail = (invoice: any, email?: string) => {
    const customerEmail = email || selectedVehicle?.customerEmail || invoice.customerEmail || invoiceFormData.customerEmail;
    if (!customerEmail) {
      toast.error('Fahrzeug hat keine E-Mail-Adresse');
      return;
    }

    const subject = `${invoice.type === 'invoice' ? 'Rechnung' : 'Angebot'} ${invoice.invoiceNumber}`;
    const body = `Guten Tag,\n\nanbei erhalten Sie Ihr ${invoice.type === 'invoice' ? 'Rechnung' : 'Angebot'}:\n\nRechnungsnummer: ${invoice.invoiceNumber}\nGesamtbetrag: CHF ${invoice.total.toFixed(2)}\n\nBitte kontaktieren Sie uns bei Fragen.\n\nFreundliche Grüsse\nOcean Garage`;

    const mailtoUrl = `mailto:${customerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
    toast.success('E-Mail-Client geöffnet');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Fahrzeuge</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {totalVehicles} Fahrzeuge • {activeVehicles} aktiv
          </p>
        </div>
        <Link to="/vehicles/new" className="btn btn-primary">
          <Plus className="w-4 h-4" />
          Neues Fahrzeug
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Car className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{totalVehicles}</p>
              <p className="text-xs text-neutral-500">Gesamt</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
              <Check className="w-5 h-5 text-success-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{activeVehicles}</p>
              <p className="text-xs text-neutral-500">Aktiv</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
              <Pause className="w-5 h-5 text-neutral-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{totalVehicles - activeVehicles}</p>
              <p className="text-xs text-neutral-500">Wartend</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          type="text"
          placeholder="Suche nach VIN, Marke, Modell..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Vehicles List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="card text-center py-12">
          <Car className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-900 mb-1">Keine Fahrzeuge</h3>
          <p className="text-sm text-neutral-500 mb-4">
            {searchTerm ? 'Keine Ergebnisse für Ihre Suche' : 'Fügen Sie Ihr erstes Fahrzeug hinzu'}
          </p>
          {!searchTerm && (
            <Link to="/vehicles/new" className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Fahrzeug hinzufügen
            </Link>
          )}
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">Fahrzeug</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide hidden md:table-cell">VIN</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide hidden lg:table-cell">Kennzeichen</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredVehicles.map((vehicle) => (
                <tr
                  key={vehicle.id}
                  onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                  className="hover:bg-neutral-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        vehicle.isActive ? 'bg-primary-100' : 'bg-neutral-100'
                      }`}>
                        <Car className={`w-4 h-4 ${vehicle.isActive ? 'text-primary-600' : 'text-neutral-400'}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-900 text-sm">
                          {vehicle.brand && vehicle.model ? `${vehicle.brand} ${vehicle.model}` : 'Unbekannt'}
                        </p>
                        <p className="text-xs text-neutral-500">{vehicle.year || ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <code className="text-xs text-neutral-600 bg-neutral-100 px-2 py-1 rounded">{vehicle.vin}</code>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-sm text-neutral-700">{vehicle.licensePlate || '-'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${
                      vehicle.status === 'active' || (vehicle.isActive && vehicle.status !== 'on_hold')
                        ? 'badge-success' 
                        : vehicle.status === 'on_hold'
                        ? 'badge-warning'
                        : vehicle.status === 'completed'
                        ? 'badge-info'
                        : 'badge-gray'
                    }`}>
                      {vehicle.status === 'active' ? 'Aktiv' : 
                       vehicle.status === 'on_hold' ? 'Wartend' :
                       vehicle.status === 'completed' ? 'Fertig' :
                       vehicle.isActive ? 'Aktiv' : 'Neu'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {(vehicle.status === 'on_hold' || (!vehicle.status && !vehicle.isActive)) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivatingVehicle(vehicle);
                            setSelectedProducts([]);
                            setShowActivationModal(true);
                          }}
                          className="btn btn-sm bg-success-50 text-success-700 hover:bg-success-100"
                        >
                          <Play className="w-3 h-3" />
                          <span className="hidden sm:inline">Start</span>
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleQuickInvoice(vehicle, 'estimate'); }}
                        className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors"
                        title="Angebot"
                      >
                        <FileText className="w-4 h-4 text-neutral-500" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(vehicle); }}
                        className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors"
                        title="Bearbeiten"
                      >
                        <Edit className="w-4 h-4 text-neutral-500" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(vehicle.id); }}
                        className="p-1.5 hover:bg-danger-50 rounded-lg transition-colors"
                        title="Löschen"
                      >
                        <Trash2 className="w-4 h-4 text-danger-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between rounded-t-3xl z-10">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  {editingVehicle ? 'Fahrzeug bearbeiten' : 'Neues Fahrzeug hinzufügen'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {editingVehicle ? 'Aktualisieren Sie die Fahrzeuginformationen' : 'Fügen Sie ein neues Fahrzeug zur Garage hinzu'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-110"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {!editingVehicle && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    VIN (Fahrzeugidentifikationsnummer)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={vinInput}
                      onChange={(e) => setVinInput(e.target.value.toUpperCase())}
                      maxLength={17}
                      placeholder="17-stellige VIN eingeben"
                      className="input flex-1"
                    />
                    <button
                      type="button"
                      onClick={decodeVin}
                      className="btn btn-secondary whitespace-nowrap"
                    >
                      VIN dekodieren
                    </button>
                  </div>
                  {vinData && (
                    <div className="mt-2 space-y-2">
                      <div className="p-3 bg-green-50 rounded-lg text-sm text-green-700">
                        <Check className="w-4 h-4 inline mr-2" />
                        VIN erfolgreich dekodiert
                      </div>
                      {vehicleImage && (
                        <div className="mt-2">
                          <img
                            src={vehicleImage}
                            alt="Vehicle"
                            className="w-full h-48 object-cover rounded-lg border border-gray-200"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      {/* Quick summary */}
                      {(vinData.trim || vinData.engine || vinData.bodyType || vinData.transmission) && (
                        <div className="p-2 bg-gray-50 rounded text-xs text-gray-600">
                          {vinData.trim && <><strong>Trim:</strong> {vinData.trim}</>}
                          {vinData.engine && <> • <strong>Engine:</strong> {vinData.engine}</>}
                          {vinData.bodyType && <> • <strong>Body:</strong> {vinData.bodyType}</>}
                          {vinData.transmission && <> • <strong>Transmission:</strong> {vinData.transmission}</>}
                        </div>
                      )}
                      {/* Expandable full data */}
                      <button
                        type="button"
                        onClick={() => setShowFullVinData(!showFullVinData)}
                        className="w-full flex items-center justify-between p-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm text-blue-700 transition-colors"
                      >
                        <span className="font-medium">
                          {showFullVinData ? 'Ausblenden' : 'Anzeigen'} Vollständige VIN-Daten
                        </span>
                        {showFullVinData ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      {showFullVinData && (
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
                          <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                            {JSON.stringify(vinData, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                {/* Basic Information */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Grundinformationen</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        VIN *
                      </label>
                      <input
                        type="text"
                        value={formData.vin}
                        onChange={(e) =>
                          setFormData({ ...formData, vin: e.target.value.toUpperCase() })
                        }
                        required
                        maxLength={17}
                        className="input"
                        disabled={!!editingVehicle}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Marke/Hersteller
                      </label>
                      <input
                        type="text"
                        value={formData.brand}
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Model
                      </label>
                      <input
                        type="text"
                        value={formData.model}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Year
                      </label>
                      <input
                        type="number"
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                        min="1900"
                        max={new Date().getFullYear() + 1}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ausstattung
                      </label>
                      <input
                        type="text"
                        value={formData.trim}
                        onChange={(e) => setFormData({ ...formData, trim: e.target.value })}
                        className="input"
                        placeholder="e.g., XLE Auto (Natl)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stil
                      </label>
                      <input
                        type="text"
                        value={formData.style}
                        onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                        className="input"
                        placeholder="e.g., 2.5, 4 Cylinder Engine"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Karosserietyp
                      </label>
                      <input
                        type="text"
                        value={formData.bodyType}
                        onChange={(e) => setFormData({ ...formData, bodyType: e.target.value })}
                        className="input"
                        placeholder="e.g., Sedan/Saloon"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Farbe
                      </label>
                      <input
                        type="text"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="input"
                      />
                    </div>
                  </div>
                </div>

                {/* Technical Details */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Technische Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Motor
                      </label>
                      <input
                        type="text"
                        value={formData.engine}
                        onChange={(e) => setFormData({ ...formData, engine: e.target.value })}
                        className="input"
                        placeholder="e.g., 2.5, 4 Cylinder Engine"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Getriebe
                      </label>
                      <input
                        type="text"
                        value={formData.transmission}
                        onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}
                        className="input"
                        placeholder="e.g., Automatic"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Antrieb
                      </label>
                      <input
                        type="text"
                        value={formData.drive}
                        onChange={(e) => setFormData({ ...formData, drive: e.target.value })}
                        className="input"
                        placeholder="e.g., Front Wheel Drive"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kilometerstand
                      </label>
                      <input
                        type="number"
                        value={formData.mileage}
                        onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                        min="0"
                        className="input"
                        placeholder="Aktueller Kilometerstand"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Zusätzliche Informationen</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Hersteller
                      </label>
                      <input
                        type="text"
                        value={formData.manufacturer}
                        onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                        className="input"
                        placeholder="Vollständiger Herstellername"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Herkunft
                      </label>
                      <input
                        type="text"
                        value={formData.origin}
                        onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                        className="input"
                        placeholder="e.g., United States"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kennzeichen
                      </label>
                      <input
                        type="text"
                        value={formData.licensePlate}
                        onChange={(e) =>
                          setFormData({ ...formData, licensePlate: e.target.value.toUpperCase() })
                        }
                        className="input"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Arbeitsbeschreibung
                </label>
                <textarea
                  value={formData.workDescription}
                  onChange={(e) =>
                    setFormData({ ...formData, workDescription: e.target.value })
                  }
                  rows={3}
                  className="input"
                    placeholder="Beschreiben Sie die benötigte Arbeit..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn btn-primary flex-1">
                  {editingVehicle ? 'Fahrzeug aktualisieren' : 'Fahrzeug erstellen'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="btn btn-secondary"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Invoice/Quote Modal */}
      {showInvoiceModal && selectedVehicle && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-slide-up">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between rounded-t-3xl z-10">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  {invoiceType === 'invoice' ? 'Rechnung erstellen' : 'Angebot erstellen'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Fahrzeug: {selectedVehicle.brand} {selectedVehicle.model} ({selectedVehicle.vin})
                </p>
              </div>
              <button
                onClick={() => {
                  setShowInvoiceModal(false);
                  setCreatedInvoice(null);
                  setModalStep(1);
                  setPdfBlob(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-110"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="flex flex-col h-full max-h-[90vh]">
              <div className="flex-1 overflow-y-auto p-6">
                {modalStep === 1 ? (
                  // STEP 1: Review/Edit Items & Customer Info
                  <div className="space-y-6">
                  {/* Customer Info - Editable */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Kundeninformationen</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Kundenname *</label>
                        <input
                          type="text"
                          value={invoiceFormData.customerName}
                          onChange={(e) => setInvoiceFormData({ ...invoiceFormData, customerName: e.target.value })}
                          required
                          className="input text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">E-Mail</label>
                        <input
                          type="email"
                          value={invoiceFormData.customerEmail}
                          onChange={(e) => setInvoiceFormData({ ...invoiceFormData, customerEmail: e.target.value })}
                          className="input text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Telefon</label>
                        <input
                          type="tel"
                          value={invoiceFormData.customerPhone}
                          onChange={(e) => setInvoiceFormData({ ...invoiceFormData, customerPhone: e.target.value })}
                          className="input text-sm"
                          placeholder="+41..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">MwSt. (%)</label>
                        <input
                          type="number"
                          value={invoiceFormData.taxRate}
                          onChange={(e) => setInvoiceFormData({ ...invoiceFormData, taxRate: e.target.value })}
                          step="0.1"
                          className="input text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Items - Editable */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold">Positionen</h3>
                      <button
                        type="button"
                        onClick={addItem}
                        className="btn btn-secondary text-xs flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Hinzufügen
                      </button>
                    </div>
                    <div className="space-y-2 border border-gray-200 rounded-lg p-3">
                      {invoiceFormData.items.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">Keine Positionen vorhanden</p>
                      ) : (
                        invoiceFormData.items.map((item, index) => (
                          <div key={index} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2 rounded">
                            <div className="col-span-5">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => updateItem(index, 'description', e.target.value)}
                                placeholder="Beschreibung"
                                className="input text-xs"
                                required
                              />
                            </div>
                            <div className="col-span-2">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                placeholder="Menge"
                                className="input text-xs"
                                step="0.01"
                                required
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
                                required
                              />
                            </div>
                            <div className="col-span-2 text-right text-xs font-semibold">
                              CHF {item.total.toFixed(2)}
                            </div>
                            <div className="col-span-1">
                              <button
                                type="button"
                                onClick={() => removeItem(index)}
                                className="p-1 hover:bg-red-50 rounded text-red-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    {/* Totals Preview */}
                    {invoiceFormData.items.length > 0 && (() => {
                      const subtotal = invoiceFormData.items.reduce((sum, item) => sum + item.total, 0);
                      const taxRate = parseFloat(invoiceFormData.taxRate) || 7.7;
                      const taxAmount = subtotal * (taxRate / 100);
                      const total = subtotal + taxAmount;
                      
                      return (
                        <div className="mt-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Zwischensumme:</span>
                            <span className="font-semibold">CHF {subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">MwSt. ({taxRate}%):</span>
                            <span className="font-semibold">CHF {taxAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-base font-bold mt-2 pt-2 border-t border-gray-300">
                            <span>Gesamtbetrag:</span>
                            <span className="text-primary-600">CHF {total.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Bemerkungen</label>
                    <textarea
                      value={invoiceFormData.notes}
                      onChange={(e) => setInvoiceFormData({ ...invoiceFormData, notes: e.target.value })}
                      rows={2}
                      className="input text-sm"
                    />
                  </div>

                  </div>
                ) : (
                  // STEP 2: PDF Preview & Send Options
                  <div className="space-y-6">
                    {/* PDF Preview */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <h3 className="text-lg font-semibold mb-4">PDF Vorschau</h3>
                      {pdfBlob ? (
                        <div className="bg-white rounded-lg overflow-hidden shadow-inner">
                          <iframe
                            src={pdfBlob}
                            className="w-full h-[600px] border-0"
                            title="PDF Preview"
                          />
                        </div>
                      ) : (
                        <div className="bg-white rounded-lg p-8 text-center">
                          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
                          <p className="text-gray-600">PDF wird geladen...</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Sticky bottom section with action buttons */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 rounded-b-3xl shadow-lg">
                {modalStep === 1 ? (
                  <div className="flex gap-3">
                    <button
                      onClick={createInvoiceOrQuote}
                      disabled={isCreating || !invoiceFormData.customerName || invoiceFormData.items.length === 0}
                      className="btn btn-primary flex-1 disabled:opacity-50"
                    >
                      {isCreating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Erstelle...
                        </>
                      ) : (
                        <>
                          {invoiceType === 'invoice' ? 'Rechnung erstellen' : 'Angebot erstellen'}
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowInvoiceModal(false);
                        setCreatedInvoice(null);
                        setModalStep(1);
                      }}
                      className="btn btn-secondary"
                      disabled={isCreating}
                    >
                      Abbrechen
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Send Options */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                      <button
                        onClick={() => {
                          if (pdfBlob) {
                            const link = document.createElement('a');
                            link.href = pdfBlob;
                            link.download = `${createdInvoice.invoiceNumber}.pdf`;
                            link.click();
                            toast.success('PDF heruntergeladen');
                          }
                        }}
                        className="btn btn-primary flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        PDF herunterladen
                      </button>
                      {(selectedVehicle?.customerPhone || invoiceFormData.customerPhone) && (
                        <button
                          onClick={() => {
                            const phone = selectedVehicle?.customerPhone || invoiceFormData.customerPhone;
                            openWhatsApp(createdInvoice, phone);
                          }}
                          className="btn bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
                        >
                          <Send className="w-4 h-4" />
                          WhatsApp senden
                        </button>
                      )}
                      {(selectedVehicle?.customerEmail || invoiceFormData.customerEmail) && (
                        <button
                          onClick={() => {
                            const email = selectedVehicle?.customerEmail || invoiceFormData.customerEmail;
                            sendEmail(createdInvoice, email);
                          }}
                          className="btn bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center gap-2"
                        >
                          <Mail className="w-4 h-4" />
                          E-Mail senden
                        </button>
                      )}
                    </div>

                    <div className="flex gap-3 pt-3 border-t">
                      <button
                        onClick={() => setModalStep(1)}
                        className="btn btn-secondary flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Zurück bearbeiten
                      </button>
                      <button
                        onClick={() => {
                          setShowInvoiceModal(false);
                          setCreatedInvoice(null);
                          setModalStep(1);
                          setPdfBlob(null);
                          fetchVehicles();
                        }}
                        className="btn btn-primary flex-1"
                      >
                        Fertig
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Activation Modal - For activating on_hold vehicles */}
      {showActivationModal && activatingVehicle && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-slide-up">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between rounded-t-3xl z-10">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Fahrzeug aktivieren
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {activatingVehicle.brand} {activatingVehicle.model} • {activatingVehicle.vin}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowActivationModal(false);
                  setActivatingVehicle(null);
                  setSelectedProducts([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-110"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Info about activation */}
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <Play className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">Fahrzeug aktivieren</p>
                    <p className="text-sm text-green-700 mt-1">
                      Wählen Sie die Ersatzteile aus, die für diesen Auftrag benötigt werden. 
                      Nach der Aktivierung können die Arbeiten beginnen.
                    </p>
                  </div>
                </div>
              </div>

              {/* Service type info */}
              {activatingVehicle.serviceType && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
                  <span className="font-medium">Service:</span>{' '}
                  {activatingVehicle.serviceType === 'small_service' ? 'Kleine Wartung' :
                   activatingVehicle.serviceType === 'big_service' ? 'Grosse Wartung' :
                   activatingVehicle.serviceType === 'brake_service' ? 'Bremsenservice' :
                   activatingVehicle.serviceType === 'inspection' ? 'Inspektion' :
                   activatingVehicle.serviceType === 'tire_change' ? 'Reifenwechsel' :
                   activatingVehicle.serviceType}
                </div>
              )}

              {/* Derendinger Product Picker */}
              <DerendingerProductPicker
                vin={activatingVehicle.vin}
                serviceType={activatingVehicle.serviceType || ''}
                selectedProducts={selectedProducts}
                onProductsSelected={setSelectedProducts}
                vehicleId={activatingVehicle.id}
                showOrderButton={true}
                onOrderComplete={(orderId) => {
                  toast.success('Bestellung bei Derendinger übermittelt!');
                  console.log('Order completed:', orderId);
                }}
              />
            </div>

            {/* Footer with action buttons */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 rounded-b-3xl">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowActivationModal(false);
                    setActivatingVehicle(null);
                    setSelectedProducts([]);
                  }}
                  className="btn btn-secondary"
                  disabled={isActivating}
                >
                  Abbrechen
                </button>
                <button
                  onClick={async () => {
                    setIsActivating(true);
                    try {
                      // Create expenses for selected products
                      if (selectedProducts.length > 0) {
                        for (const product of selectedProducts) {
                          await api.post('/expenses', {
                            vehicleId: activatingVehicle.id,
                            description: `${product.quantity}x ${product.supplier} ${product.articleNumber} - ${product.categoryName}`,
                            category: 'parts',
                            amount: (product.price || 25) * product.quantity,
                            date: new Date().toISOString(),
                            notes: `Derendinger Artikel-ID: ${product.id}`,
                          });
                        }
                        toast.success(`${selectedProducts.length} Ersatzteile bestellt!`);
                      }

                      // Update vehicle status to active
                      await api.patch(`/vehicles/${activatingVehicle.id}`, { 
                        status: 'active',
                        isActive: true 
                      });
                      
                      toast.success('Fahrzeug aktiviert - Arbeiten können beginnen!');
                      setShowActivationModal(false);
                      setActivatingVehicle(null);
                      setSelectedProducts([]);
                      fetchVehicles();
                    } catch (error: any) {
                      toast.error(error.response?.data?.message || 'Fehler beim Aktivieren');
                    } finally {
                      setIsActivating(false);
                    }
                  }}
                  disabled={isActivating}
                  className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {isActivating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Aktiviere...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      {selectedProducts.length > 0 
                        ? `Aktivieren & ${selectedProducts.length} Teile bestellen`
                        : 'Ohne Teile aktivieren'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


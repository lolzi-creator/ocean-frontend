import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Camera, FileText, CheckCircle, ArrowRight, ArrowLeft, X, Pause, Play, Wrench, Package } from 'lucide-react';
import DerendingerProductPicker from '../components/DerendingerProductPicker';

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

interface ServiceTemplatePart {
  partCode: string;
  name: string;
  functionalGroup?: string;
  quantity: number;
}

interface ServiceTemplate {
  id: string;
  name: string;
  description?: string;
  estimatedHours: number;
  parts: ServiceTemplatePart[];
  isActive: boolean;
}

interface StepData {
  // Step 1: Photos
  vehiclePhoto: File | null;
  documentPhoto: File | null;
  
  // Step 2: VIN & Basic Info
  vin: string;
  vinFromOCR: string;
  
  // Step 3: Vehicle Details
  brand: string;
  model: string;
  year: string;
  color: string;
  licensePlate: string;
  mileage: string;
  
  // Step 4: Service Selection + Status
  serviceType: string;
  workDescription: string;
  vehicleStatus: 'active' | 'on_hold';
  selectedProducts: SelectedProduct[];
  
  // Step 5: Customer Info
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

const SERVICE_TYPES = [
  { value: 'small_service', label: 'Kleine Wartung', description: 'Ölwechsel, Filter, Inspektion' },
  { value: 'big_service', label: 'Grosse Wartung', description: 'Vollständige Wartung mit allen Checks' },
  { value: 'tire_change', label: 'Reifenwechsel', description: 'Reifen wechseln und auswuchten' },
  { value: 'brake_service', label: 'Bremsenservice', description: 'Bremsbeläge und Bremsflüssigkeit' },
  { value: 'repair', label: 'Reparatur', description: 'Defekte beheben' },
  { value: 'inspection', label: 'Inspektion', description: 'Nur Überprüfung' },
];

export default function VehicleEntry() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<ServiceTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [formData, setFormData] = useState<StepData>({
    vehiclePhoto: null,
    documentPhoto: null,
    vin: '',
    vinFromOCR: '',
    brand: '',
    model: '',
    year: '',
    color: '',
    licensePlate: '',
    mileage: '',
    serviceType: '',
    workDescription: '',
    vehicleStatus: 'active', // Default to active
    selectedProducts: [],
    customerName: '',
    customerEmail: '',
    customerPhone: '',
  });

  const [previews, setPreviews] = useState<{ vehicle: string | null; document: string | null }>({
    vehicle: null,
    document: null,
  });

  // Fetch custom service templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await api.get('/service-templates');
        setCustomTemplates(response.data.filter((t: ServiceTemplate) => t.isActive));
      } catch (error) {
        console.log('Could not load custom templates');
      }
    };
    fetchTemplates();
  }, []);

  // Calculate total steps based on status
  // If on_hold: skip product selection (step 5)
  const totalSteps = formData.vehicleStatus === 'on_hold' ? 5 : 6;
  
  // Get actual step number for display
  const getDisplayStep = (step: number) => {
    if (formData.vehicleStatus === 'on_hold' && step >= 5) {
      return step; // Step 5 becomes customer info
    }
    return step;
  };

  const handlePhotoUpload = (type: 'vehicle' | 'document', file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews((prev) => ({
          ...prev,
          [type]: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
      
      setFormData((prev) => ({
        ...prev,
        [type === 'vehicle' ? 'vehiclePhoto' : 'documentPhoto']: file,
      }));
    }
  };

  const handleExtractVIN = async () => {
    if (!formData.documentPhoto) {
      toast.error('Bitte laden Sie zuerst ein Foto des Fahrzeugausweises hoch');
      return;
    }

    setIsLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('file', formData.documentPhoto);
      
      const response = await api.post('/vehicles/extract-vin', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      const updates: any = {};
      let successMessages: string[] = [];
      let extractedVin = '';
      
      if (response.data.vin) {
        extractedVin = response.data.vin;
        updates.vin = extractedVin;
        updates.vinFromOCR = extractedVin;
        successMessages.push('VIN');
      }
      
      if (response.data.customerName) {
        updates.customerName = response.data.customerName;
        successMessages.push('Kundenname');
      }
      
      if (response.data.brand) {
        updates.brand = response.data.brand;
        successMessages.push('Marke');
      }
      
      if (response.data.model) {
        updates.model = response.data.model;
        if (!successMessages.includes('Modell')) successMessages.push('Modell');
      }
      
      if (response.data.year) {
        updates.year = response.data.year;
        if (!successMessages.includes('Jahr')) successMessages.push('Jahr');
      }
      
      if (response.data.color) {
        updates.color = response.data.color;
        if (!successMessages.includes('Farbe')) successMessages.push('Farbe');
      }
      
      if (response.data.licensePlate) {
        updates.licensePlate = response.data.licensePlate;
        if (!successMessages.includes('Kennzeichen')) successMessages.push('Kennzeichen');
      }
      
      if (Object.keys(updates).length > 0) {
        setFormData((prev) => ({ ...prev, ...updates }));
        toast.success(`${successMessages.join(', ')} erfolgreich erkannt!`);
        
        if (extractedVin && extractedVin.length === 17 && (!response.data.brand || !response.data.model)) {
          try {
            const decodeResponse = await api.get(`/vehicles/decode/${extractedVin}`);
            const decodeData = decodeResponse.data;
            
            setFormData((prev) => ({
              ...prev,
              brand: prev.brand || decodeData.vehicle?.make || decodeData.make || '',
              model: prev.model || decodeData.vehicle?.model || decodeData.model || '',
              year: prev.year || (decodeData.vehicle?.year || decodeData.year ? (decodeData.vehicle?.year || decodeData.year).toString() : ''),
              color: prev.color || decodeData.color || '',
            }));
            
            toast.success('VIN automatisch dekodiert!');
          } catch (decodeError) {
            console.log('VIN decode failed:', decodeError);
          }
        }
      } else {
        toast.error('Daten konnten nicht automatisch erkannt werden. Bitte manuell eingeben.');
      }
    } catch (error) {
      toast.error('OCR-Erkennung fehlgeschlagen. Bitte manuell eingeben.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecodeVIN = async () => {
    if (!formData.vin || formData.vin.length !== 17) {
      toast.error('VIN muss 17 Zeichen lang sein');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.get(`/vehicles/decode/${formData.vin}`);
      const data = response.data;
      
      setFormData((prev) => ({
        ...prev,
        brand: data.vehicle?.make || data.make || prev.brand,
        model: data.vehicle?.model || data.model || prev.model,
        year: data.vehicle?.year || data.year ? (data.vehicle?.year || data.year).toString() : prev.year,
        color: data.color || prev.color,
      }));
      
      toast.success('VIN erfolgreich dekodiert!');
    } catch (error) {
      toast.error('VIN konnte nicht dekodiert werden');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.vin || !formData.serviceType) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    setIsLoading(true);
    try {
      const vehicleData = {
        vin: formData.vin,
        brand: formData.brand || undefined,
        model: formData.model || undefined,
        year: formData.year ? parseInt(formData.year) : undefined,
        color: formData.color || undefined,
        licensePlate: formData.licensePlate || undefined,
        mileage: formData.mileage ? parseInt(formData.mileage) : undefined,
        serviceType: formData.serviceType,
        workDescription: formData.workDescription || undefined,
        customerName: formData.customerName || undefined,
        customerEmail: formData.customerEmail || undefined,
        customerPhone: formData.customerPhone || undefined,
        status: formData.vehicleStatus,
        isActive: true,
      };

      const vehicleResponse = await api.post('/vehicles', vehicleData);
      const vehicleId = vehicleResponse.data.id;

      // Upload photos if available
      if (formData.vehiclePhoto) {
        const photoFormData = new FormData();
        photoFormData.append('file', formData.vehiclePhoto);
        photoFormData.append('type', 'vehicle');
        await api.post(`/vehicles/${vehicleId}/upload-photo`, photoFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      if (formData.documentPhoto) {
        const docFormData = new FormData();
        docFormData.append('file', formData.documentPhoto);
        docFormData.append('type', 'document');
        await api.post(`/vehicles/${vehicleId}/upload-photo`, docFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // Only create expenses if status is active and products are selected
      if (formData.vehicleStatus === 'active' && formData.selectedProducts.length > 0) {
        for (const product of formData.selectedProducts) {
          await api.post('/expenses', {
            vehicleId: vehicleId,
            description: `${product.quantity}x ${product.supplier} ${product.articleNumber} - ${product.categoryName}`,
            category: 'parts',
            amount: (product.price || 25) * product.quantity,
            date: new Date().toISOString(),
            notes: `Derendinger Artikel-ID: ${product.id}`,
          });
        }
        toast.success(`${formData.selectedProducts.length} Ersatzteile bestellt!`);
      }

      if (formData.vehicleStatus === 'on_hold') {
        toast.success('Fahrzeug erfasst - Offerte wird erstellt');
      } else {
        toast.success('Fahrzeug erfasst - Arbeiten können beginnen!');
      }
      
      navigate(`/vehicles/${vehicleId}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Fehler beim Erfassen des Fahrzeugs');
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return true;
      case 2:
        return formData.vin.length === 17;
      case 3:
        return formData.brand && formData.model;
      case 4:
        return formData.serviceType !== '';
      case 5:
        // If on_hold: this is customer step
        // If active: this is products step (always can proceed)
        if (formData.vehicleStatus === 'on_hold') {
          return formData.customerName.trim() !== '' && formData.customerEmail.trim() !== '';
        }
        return true;
      case 6:
        // Only reached if active status
        return formData.customerName.trim() !== '' && formData.customerEmail.trim() !== '';
      default:
        return false;
    }
  };

  const getStepLabels = () => {
    if (formData.vehicleStatus === 'on_hold') {
      return ['Fotos', 'VIN', 'Details', 'Service', 'Kunde'];
    }
    return ['Fotos', 'VIN', 'Details', 'Service', 'Teile', 'Kunde'];
  };

  const stepLabels = getStepLabels();

  return (
    <div className="min-h-screen bg-neutral-50 p-4 pb-24">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/vehicles')}
            className="mb-3 flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Abbrechen
          </button>
          <h1 className="text-2xl font-bold text-neutral-900">Neues Fahrzeug</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Schritt {currentStep} von {totalSteps}</p>
        </div>

        {/* Progress Steps */}
        <div className="card p-4 mb-6">
          <div className="flex items-center gap-2">
            {stepLabels.map((label, index) => {
              const step = index + 1;
              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm transition-all ${
                        currentStep === step
                          ? 'bg-primary-600 text-white'
                          : currentStep > step
                          ? 'bg-success-500 text-white'
                          : 'bg-neutral-100 text-neutral-400'
                      }`}
                    >
                      {currentStep > step ? <CheckCircle className="w-4 h-4" /> : step}
                    </div>
                    <p className={`text-[10px] mt-1.5 text-center ${
                      currentStep >= step ? 'text-neutral-700' : 'text-neutral-400'
                    }`}>{label}</p>
                  </div>
                  {step < totalSteps && (
                    <div
                      className={`flex-1 h-0.5 mx-1 rounded ${
                        currentStep > step ? 'bg-success-500' : 'bg-neutral-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="card">
          {/* Step 1: Photos */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 mb-1">Fotos aufnehmen</h2>
                <p className="text-sm text-neutral-500">Fahrzeug und Fahrzeugausweis fotografieren</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Vehicle Photo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fahrzeugfoto
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
                    {previews.vehicle ? (
                      <div className="relative">
                        <img
                          src={previews.vehicle}
                          alt="Vehicle"
                          className="w-full h-48 object-cover rounded-lg mb-4"
                        />
                        <button
                          onClick={() => {
                            setPreviews((prev) => ({ ...prev, vehicle: null }));
                            setFormData((prev) => ({ ...prev, vehiclePhoto: null }));
                          }}
                          className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) =>
                            handlePhotoUpload('vehicle', e.target.files?.[0] || null)
                          }
                        />
                        <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Foto aufnehmen oder auswählen</p>
                      </label>
                    )}
                  </div>
                </div>

                {/* Document Photo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fahrzeugausweis Foto *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
                    {previews.document ? (
                      <div className="relative">
                        <img
                          src={previews.document}
                          alt="Document"
                          className="w-full h-48 object-cover rounded-lg mb-4"
                        />
                        <button
                          onClick={() => {
                            setPreviews((prev) => ({ ...prev, document: null }));
                            setFormData((prev) => ({ ...prev, documentPhoto: null }));
                          }}
                          className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) =>
                            handlePhotoUpload('document', e.target.files?.[0] || null)
                          }
                        />
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Fahrzeugausweis fotografieren</p>
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: VIN */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Schritt 2: VIN eingeben</h2>
                <p className="text-gray-600">Fahrzeugidentifikationsnummer erfassen</p>
              </div>

              {formData.documentPhoto && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-blue-900">VIN & Name automatisch erkennen</p>
                      <p className="text-sm text-blue-700">Aus dem Fahrzeugausweis-Foto</p>
                    </div>
                    <button
                      onClick={handleExtractVIN}
                      disabled={isLoading}
                      className="btn btn-primary"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block" />
                          Erkenne...
                        </>
                      ) : (
                        'VIN & Name erkennen'
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  VIN (17 Zeichen) *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.vin}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, vin: e.target.value.toUpperCase() }))
                    }
                    maxLength={17}
                    placeholder="VIN eingeben"
                    className="input flex-1"
                  />
                  <button
                    onClick={handleDecodeVIN}
                    disabled={isLoading || formData.vin.length !== 17}
                    className="btn btn-secondary whitespace-nowrap"
                  >
                    Dekodieren
                  </button>
                </div>
                {formData.vinFromOCR && (
                  <p className="text-sm text-green-600 mt-2">
                    ✓ VIN erkannt: {formData.vinFromOCR}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Details */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Schritt 3: Fahrzeugdetails</h2>
                <p className="text-gray-600">Informationen prüfen und ergänzen</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Marke *
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData((prev) => ({ ...prev, brand: e.target.value }))}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Modell *
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData((prev) => ({ ...prev, model: e.target.value }))}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Jahr</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData((prev) => ({ ...prev, year: e.target.value }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Farbe</label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
                    className="input"
                    placeholder="Aus Fahrzeugausweis"
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
                      setFormData((prev) => ({ ...prev, licensePlate: e.target.value.toUpperCase() }))
                    }
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kilometerstand
                  </label>
                  <input
                    type="number"
                    value={formData.mileage}
                    onChange={(e) => setFormData((prev) => ({ ...prev, mileage: e.target.value }))}
                    className="input"
                    placeholder="km"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Service + Status */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Schritt 4: Service & Status</h2>
                <p className="text-gray-600">Welche Arbeiten und wann soll begonnen werden?</p>
              </div>

              {/* Vehicle Status Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Fahrzeug-Status *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, vehicleStatus: 'active' }))}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      formData.vehicleStatus === 'active'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        formData.vehicleStatus === 'active' ? 'bg-green-500' : 'bg-gray-200'
                      }`}>
                        <Play className={`w-5 h-5 ${formData.vehicleStatus === 'active' ? 'text-white' : 'text-gray-500'}`} />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">Aktiv</div>
                        <div className="text-xs text-gray-500">Sofort starten</div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      Arbeiten können sofort beginnen. Ersatzteile werden automatisch bestellt.
                    </p>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, vehicleStatus: 'on_hold', selectedProducts: [] }))}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      formData.vehicleStatus === 'on_hold'
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        formData.vehicleStatus === 'on_hold' ? 'bg-amber-500' : 'bg-gray-200'
                      }`}>
                        <Pause className={`w-5 h-5 ${formData.vehicleStatus === 'on_hold' ? 'text-white' : 'text-gray-500'}`} />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">Wartend</div>
                        <div className="text-xs text-gray-500">Offerte zuerst</div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      Erst Offerte an Kunde senden. Nach Bestätigung wird das Fahrzeug aktiviert.
                    </p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Service-Typ *
                </label>
                
                {/* Predefined Service Types */}
                <div className="mb-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 font-semibold">
                    Standard Services
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {SERVICE_TYPES.map((service) => (
                      <button
                        key={service.value}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, serviceType: service.value }));
                          setSelectedTemplateId(null);
                        }}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          formData.serviceType === service.value && !selectedTemplateId
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-gray-900">{service.label}</div>
                        <div className="text-sm text-gray-600 mt-1">{service.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Service Templates */}
                {customTemplates.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 font-semibold flex items-center gap-2">
                      <Wrench className="w-3 h-3" />
                      Eigene Vorlagen
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {customTemplates.map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, serviceType: `custom:${template.id}` }));
                            setSelectedTemplateId(template.id);
                          }}
                          className={`p-4 rounded-lg border-2 text-left transition-all ${
                            selectedTemplateId === template.id
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                              selectedTemplateId === template.id ? 'bg-purple-500' : 'bg-gray-200'
                            }`}>
                              <Wrench className={`w-3 h-3 ${
                                selectedTemplateId === template.id ? 'text-white' : 'text-gray-500'
                              }`} />
                            </div>
                            <div className="font-medium text-gray-900">{template.name}</div>
                          </div>
                          {template.description && (
                            <div className="text-sm text-gray-600 mt-1">{template.description}</div>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Package className="w-3 h-3" />
                              {template.parts?.length || 0} Teile
                            </span>
                            <span>~{template.estimatedHours}h</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Arbeitsbeschreibung
                </label>
                <textarea
                  value={formData.workDescription}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, workDescription: e.target.value }))
                  }
                  rows={4}
                  className="input"
                  placeholder="Detaillierte Beschreibung der benötigten Arbeiten..."
                />
              </div>
            </div>
          )}

          {/* Step 5: Products (only if active) or Customer (if on_hold) */}
          {currentStep === 5 && formData.vehicleStatus === 'active' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Schritt 5: Ersatzteile auswählen</h2>
                <p className="text-gray-600">Passende Teile für Ihr Fahrzeug von Derendinger</p>
              </div>

              {/* Custom template parts info */}
              {selectedTemplateId && (() => {
                const template = customTemplates.find(t => t.id === selectedTemplateId);
                if (template && template.parts && template.parts.length > 0) {
                  return (
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                          <Wrench className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-purple-900">Vorlage: {template.name}</p>
                          <p className="text-xs text-purple-700">Diese Vorlage enthält vordefinierte Teile</p>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-purple-100">
                        <p className="text-xs font-medium text-gray-500 mb-2">Vordefinierte Teile:</p>
                        <div className="flex flex-wrap gap-2">
                          {template.parts.map((part, i) => (
                            <span 
                              key={i}
                              className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm"
                            >
                              {part.quantity}x {part.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-purple-700 mt-3">
                        Die passenden Artikel werden basierend auf Ihrem Fahrzeug von Derendinger geladen.
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              <DerendingerProductPicker
                vin={formData.vin}
                serviceType={selectedTemplateId ? 'big_service' : formData.serviceType}
                selectedProducts={formData.selectedProducts}
                onProductsSelected={(products) => 
                  setFormData((prev) => ({ ...prev, selectedProducts: products }))
                }
              />
            </div>
          )}

          {/* Customer Info - Step 5 for on_hold, Step 6 for active */}
          {((currentStep === 5 && formData.vehicleStatus === 'on_hold') || 
            (currentStep === 6 && formData.vehicleStatus === 'active')) && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  Schritt {formData.vehicleStatus === 'on_hold' ? 5 : 6}: Kundeninformationen
                </h2>
                <p className="text-gray-600">Kundendaten erfassen (aus Fahrzeugausweis)</p>
              </div>

              {formData.documentPhoto && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-blue-900">Kundenname automatisch erkennen</p>
                      <p className="text-sm text-blue-700">Aus dem Fahrzeugausweis-Foto</p>
                    </div>
                    <button
                      onClick={handleExtractVIN}
                      disabled={isLoading}
                      className="btn btn-primary"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Erkenne...
                        </>
                      ) : (
                        'VIN & Name erkennen'
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kundenname *
                  </label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, customerName: e.target.value }))}
                    className="input"
                    required
                    placeholder="Aus Fahrzeugausweis"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-Mail *
                  </label>
                  <input
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData((prev) => ({ ...prev, customerEmail: e.target.value }))}
                    className="input"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefon (für WhatsApp)
                  </label>
                  <input
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, customerPhone: e.target.value }))}
                    className="input"
                    placeholder="+41..."
                  />
                </div>
              </div>

              {/* Status reminder */}
              {formData.vehicleStatus === 'on_hold' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Pause className="w-5 h-5 text-amber-600" />
                    <p className="font-medium text-amber-900">Status: Wartend</p>
                  </div>
                  <p className="text-sm text-amber-700 mt-1">
                    Das Fahrzeug wird im Status "Wartend" erfasst. Sie können dann eine Offerte erstellen und nach Kundenbestätigung die Teilebestellung vornehmen.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 mt-6 border-t">
            <button
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
              className="btn btn-secondary flex items-center gap-2 disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </button>

            {currentStep < totalSteps ? (
              <button
                onClick={() => setCurrentStep((prev) => prev + 1)}
                disabled={!canProceed()}
                className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                Weiter
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canProceed() || isLoading}
                className={`btn flex items-center gap-2 disabled:opacity-50 ${
                  formData.vehicleStatus === 'on_hold' 
                    ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                    : 'btn-primary'
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Wird erfasst...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    {formData.vehicleStatus === 'on_hold' ? 'Als Wartend erfassen' : 'Fahrzeug erfassen & Teile bestellen'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

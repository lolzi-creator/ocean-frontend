import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Camera, FileText, CheckCircle, ArrowRight, ArrowLeft, X, Upload } from 'lucide-react';

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
  
  // Step 4: Service Selection
  serviceType: string;
  workDescription: string;
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
  });

  const [previews, setPreviews] = useState<{ vehicle: string | null; document: string | null }>({
    vehicle: null,
    document: null,
  });

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
      
      if (response.data.vin) {
        setFormData((prev) => ({ ...prev, vin: response.data.vin, vinFromOCR: response.data.vin }));
        toast.success('VIN erfolgreich erkannt!');
      } else {
        toast.error('VIN konnte nicht automatisch erkannt werden. Bitte manuell eingeben.');
      }
    } catch (error) {
      toast.error('VIN-Erkennung fehlgeschlagen. Bitte manuell eingeben.');
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
      // Create vehicle
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

      toast.success('Fahrzeug erfolgreich erfasst!');
      navigate('/vehicles');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Fehler beim Erfassen des Fahrzeugs');
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return true; // Photos are optional
      case 2:
        return formData.vin.length === 17;
      case 3:
        return formData.brand && formData.model;
      case 4:
        return formData.serviceType !== '';
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/vehicles')}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Zurück
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Neues Fahrzeug erfassen</h1>
          <p className="text-gray-600 mt-2">Schritt-für-Schritt Anleitung</p>
        </div>

        {/* Progress Steps */}
        <div className="card mb-6">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                      currentStep === step
                        ? 'bg-primary-600 text-white'
                        : currentStep > step
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {currentStep > step ? <CheckCircle className="w-6 h-6" /> : step}
                  </div>
                  <p className="text-xs mt-2 text-center text-gray-600">
                    {step === 1 && 'Fotos'}
                    {step === 2 && 'VIN'}
                    {step === 3 && 'Details'}
                    {step === 4 && 'Service'}
                  </p>
                </div>
                {step < 4 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      currentStep > step ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="card">
          {/* Step 1: Photos */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Schritt 1: Fotos aufnehmen</h2>
                <p className="text-gray-600">Machen Sie Fotos vom Fahrzeug und Fahrzeugausweis</p>
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
                      <p className="font-medium text-blue-900">VIN automatisch erkennen</p>
                      <p className="text-sm text-blue-700">Aus dem Fahrzeugausweis-Foto</p>
                    </div>
                    <button
                      onClick={handleExtractVIN}
                      disabled={isLoading}
                      className="btn btn-primary"
                    >
                      {isLoading ? 'Erkenne...' : 'VIN erkennen'}
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

          {/* Step 4: Service */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Schritt 4: Service auswählen</h2>
                <p className="text-gray-600">Welche Arbeiten müssen durchgeführt werden?</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Service-Typ *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {SERVICE_TYPES.map((service) => (
                    <button
                      key={service.value}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, serviceType: service.value }))
                      }
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        formData.serviceType === service.value
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

            {currentStep < 4 ? (
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
                className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Wird erfasst...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Fahrzeug erfassen
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




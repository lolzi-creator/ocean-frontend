import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ChevronRight,
  Loader2,
  ShoppingCart,
  ArrowLeft,
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import DerendingerCategoryBrowser from './DerendingerCategoryBrowser';
import DerendingerProductPicker from './DerendingerProductPicker';

interface NachbestellungVehicle {
  id: string;
  vin: string;
  brand?: string;
  model?: string;
  licensePlate?: string;
}

interface SelectedPart {
  partCode: string;
  name: string;
  functionalGroup: string;
}

interface Props {
  vehicle: NachbestellungVehicle;
  onClose: () => void;
  onOrderComplete: () => void;
}

function getPartPrice(price: any): number {
  if (price == null) return 0;
  if (typeof price === 'number') return price;
  if (typeof price === 'object') {
    return price.net1Price || price.grossPrice || price.oepPrice || 0;
  }
  return Number(price) || 0;
}

export default function NachbestellungModal({ vehicle, onClose, onOrderComplete }: Props) {
  // Step tracking
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: selected part codes from category browser
  const [selectedPartCodes, setSelectedPartCodes] = useState<SelectedPart[]>([]);

  // Step 2: products selected via DerendingerProductPicker
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);

  // Ordering
  const [isOrdering, setIsOrdering] = useState(false);

  const handlePartToggle = (part: { partCode: string; name: string; functionalGroup: string }) => {
    setSelectedPartCodes((prev) => {
      const exists = prev.some((p) => p.partCode === part.partCode);
      if (exists) return prev.filter((p) => p.partCode !== part.partCode);
      return [...prev, part];
    });
  };

  const isPartSelected = (partCode: string) =>
    selectedPartCodes.some((p) => p.partCode === partCode);

  // Memoize partCodes so DerendingerProductPicker doesn't re-fetch on every render
  const partCodesForPicker = useMemo(
    () =>
      selectedPartCodes.map((p) => ({
        partCode: p.partCode,
        functionalGroup: p.functionalGroup,
        name: p.name,
      })),
    [selectedPartCodes],
  );

  const handleGoToStep2 = () => {
    setStep(2);
  };

  const handlePlaceOrder = async () => {
    if (selectedProducts.length === 0) return;
    setIsOrdering(true);
    try {
      // 1. Create expenses
      let created = 0;
      for (const product of selectedProducts) {
        const price = getPartPrice(product.price);
        const qty = Number(product.quantity) || 1;
        const amount = Math.round(price * qty * 100) / 100;
        if (amount <= 0) continue;
        await api.post('/expenses', {
          vehicleId: vehicle.id,
          description: `${qty}x ${product.name || product.articleNumber} (${product.supplier})`,
          category: 'parts',
          amount,
          date: new Date().toISOString(),
          notes: `Nachbestellung Derendinger: ${product.supplier} ${product.articleNumber}`,
        });
        created++;
      }
      if (created > 0) {
        toast.success(`${created} Ersatzteile als Ausgaben erfasst!`);
      }

      // 2. Place Derendinger order
      const productsWithRaw = selectedProducts.filter(
        (p: any) => p._rawArticle && p._rawCategory,
      );
      if (productsWithRaw.length > 0) {
        for (const product of productsWithRaw) {
          await api.post('/derendinger/cart/add', {
            rawArticle: product._rawArticle,
            rawCategory: product._rawCategory,
            rawVehicle: product._rawVehicle,
            quantity: Number(product.quantity) || 1,
          });
        }
        const orderRes = await api.post('/derendinger/order/place', {
          reference: `NB-${vehicle.licensePlate || vehicle.vin}`,
        });
        if (orderRes.data.success) {
          toast.success(
            `Nachbestellung erfolgreich! ${orderRes.data.orderNumber ? `Nr: ${orderRes.data.orderNumber}` : ''}`,
          );
        }
      }

      onOrderComplete();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Fehler bei der Nachbestellung');
    } finally {
      setIsOrdering(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between rounded-t-3xl z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Nachbestellung</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {vehicle.brand} {vehicle.model} &bull; {vehicle.licensePlate || vehicle.vin}
            </p>
            {/* Step indicator */}
            <div className="flex items-center gap-2 mt-2 text-sm">
              <span
                className={
                  step === 1 ? 'font-semibold text-primary-600' : 'text-gray-400'
                }
              >
                1. Teile auswählen
              </span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
              <span
                className={
                  step === 2 ? 'font-semibold text-primary-600' : 'text-gray-400'
                }
              >
                2. Artikel & Bestellen
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 ? (
            <>
              <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                <p className="font-medium text-orange-900">Zusätzliche Teile bestellen</p>
                <p className="text-sm text-orange-700 mt-1">
                  Wählen Sie die Ersatzteile, die zusätzlich für dieses Fahrzeug benötigt werden.
                </p>
              </div>

              <DerendingerCategoryBrowser
                vin={vehicle.vin}
                onPartSelect={handlePartToggle}
                isPartSelected={isPartSelected}
              />

              {selectedPartCodes.length > 0 && (
                <div className="mt-4 p-3 bg-primary-50 border border-primary-200 rounded-xl">
                  <p className="text-sm font-medium text-primary-800">
                    {selectedPartCodes.length} Teile ausgewählt:
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {selectedPartCodes.map((p) => (
                      <span
                        key={p.partCode}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-primary-200 rounded-lg text-xs text-primary-700"
                      >
                        {p.name}
                        <button
                          type="button"
                          onClick={() => handlePartToggle(p)}
                          className="hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Step 2: DerendingerProductPicker with images, auto/manual, prices */
            <DerendingerProductPicker
              vin={vehicle.vin}
              partCodes={partCodesForPicker}
              onProductsSelected={setSelectedProducts}
              selectedProducts={selectedProducts}
              vehicleId={vehicle.id}
            />
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 rounded-b-3xl">
          <div className="flex gap-3">
            {step === 1 ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-secondary"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleGoToStep2}
                  disabled={selectedPartCodes.length === 0}
                  className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  Weiter ({selectedPartCodes.length} Teile ausgewählt)
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn btn-secondary flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Zurück
                </button>
                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={isOrdering || selectedProducts.length === 0}
                  className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {isOrdering ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Bestelle...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      Bestellen ({selectedProducts.length} Artikel)
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

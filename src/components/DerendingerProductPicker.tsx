import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Package, Check, Loader2, ShoppingCart, AlertCircle } from 'lucide-react';

interface DerendingerArticle {
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
}

interface SelectedProduct extends DerendingerArticle {
  quantity: number;
}

interface ProductPickerProps {
  vin: string;
  serviceType: string;
  onProductsSelected: (products: SelectedProduct[]) => void;
  selectedProducts: SelectedProduct[];
}

// Service types that have parts
const SERVICE_TYPES_WITH_PARTS = ['small_service', 'big_service', 'brake_service', 'inspection'];

export default function DerendingerProductPicker({ 
  vin, 
  serviceType, 
  onProductsSelected,
  selectedProducts 
}: ProductPickerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [articles, setArticles] = useState<DerendingerArticle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [vehicleInfo, setVehicleInfo] = useState<any>(null);

  useEffect(() => {
    if (vin && serviceType && SERVICE_TYPES_WITH_PARTS.includes(serviceType)) {
      fetchProducts();
    }
  }, [vin, serviceType]);

  const fetchProducts = async () => {
    if (!SERVICE_TYPES_WITH_PARTS.includes(serviceType)) {
      setArticles([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use the new simplified API with serviceType
      const response = await api.post('/derendinger/articles/search', {
        vin: vin,
        serviceType: serviceType,
      });

      if (response.data.success) {
        setArticles(response.data.data.articles || []);
        setVehicleInfo(response.data.data.vehicle);
        
        if (response.data.data.articles.length === 0) {
          setError('Keine passenden Artikel gefunden für dieses Fahrzeug.');
        }
      } else {
        setError('Fehler beim Laden der Produkte');
      }
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError(err.response?.data?.message || 'Fehler beim Laden der Derendinger-Produkte');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleProduct = (article: DerendingerArticle) => {
    const exists = selectedProducts.find(p => p.id === article.id);
    
    if (exists) {
      onProductsSelected(selectedProducts.filter(p => p.id !== article.id));
    } else {
      onProductsSelected([...selectedProducts, { ...article, quantity: 1 }]);
    }
  };

  const updateQuantity = (articleId: string, quantity: number) => {
    if (quantity < 1) {
      // Remove item when quantity goes below 1
      onProductsSelected(selectedProducts.filter(p => p.id !== articleId));
    } else {
      onProductsSelected(
        selectedProducts.map(p => 
          p.id === articleId ? { ...p, quantity } : p
        )
      );
    }
  };

  const isSelected = (articleId: string) => {
    return selectedProducts.some(p => p.id === articleId);
  };

  // Don't show anything for service types without parts
  if (!SERVICE_TYPES_WITH_PARTS.includes(serviceType)) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Für diesen Service sind keine Ersatzteile erforderlich</p>
        <p className="text-sm mt-1">Sie können fortfahren oder später manuell Artikel hinzufügen</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Package className="w-5 h-5 text-primary-600" />
        <h3 className="text-lg font-semibold">Ersatzteile von Derendinger</h3>
      </div>

      {vehicleInfo && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
          <span className="font-medium">{vehicleInfo.brand}</span> {vehicleInfo.model}
          {vehicleInfo.engineCode && <span className="text-gray-500"> • {vehicleInfo.engineCode}</span>}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          <span className="ml-3 text-gray-600">Lade passende Ersatzteile...</span>
        </div>
      )}

      {error && !isLoading && (
        <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!isLoading && !error && articles.length > 0 && (
        <>
          <p className="text-sm text-gray-600 mb-4">
            {articles.length} passende Artikel gefunden. Wählen Sie die gewünschten Teile aus:
          </p>

          {/* Group articles by category */}
          {Object.entries(
            articles.reduce((acc, article) => {
              const cat = article.categoryName || 'Andere';
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(article);
              return acc;
            }, {} as Record<string, DerendingerArticle[]>)
          ).map(([categoryName, categoryArticles]) => (
            <div key={categoryName} className="mb-6">
              <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                {categoryName} ({categoryArticles.length})
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoryArticles.map((article) => (
                  <div
                    key={article.id}
                    onClick={() => toggleProduct(article)}
                    className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all ${
                      isSelected(article.id)
                        ? 'border-primary-500 bg-primary-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    {/* Selection indicator */}
                    {isSelected(article.id) && (
                      <div className="absolute top-3 right-3 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}

                    <div className="flex gap-4">
                      {/* Product Image */}
                      <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                        {article.images && article.images.length > 0 ? (
                          <img
                            src={article.images[0]}
                            alt={article.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/vite.svg';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-gray-900 truncate">
                              {article.supplier} {article.articleNumber}
                            </p>
                            <p className="text-sm text-gray-600">{article.name}</p>
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                          {/* Stock badge */}
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            article.stock > 5 
                              ? 'bg-green-100 text-green-700' 
                              : article.stock > 0 
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {article.stock > 0 ? `${article.stock} verfügbar` : 'Nicht lagernd'}
                          </span>
                          
                          {/* Delivery badge */}
                          {article.deliveryInfo && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              article.availabilityType === 'immediate' 
                                ? 'bg-emerald-100 text-emerald-700'
                                : article.availabilityType === 'available'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              🚚 {article.deliveryInfo}
                            </span>
                          )}
                        </div>

                        {/* Quantity selector when selected */}
                        {isSelected(article.id) && (
                          <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-sm text-gray-600">Menge:</span>
                            <button
                              onClick={() => updateQuantity(article.id, (selectedProducts.find(p => p.id === article.id)?.quantity || 1) - 1)}
                              className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center font-bold transition-colors"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-medium">
                              {selectedProducts.find(p => p.id === article.id)?.quantity || 1}
                            </span>
                            <button
                              onClick={() => updateQuantity(article.id, (selectedProducts.find(p => p.id === article.id)?.quantity || 1) + 1)}
                              className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center font-bold transition-colors"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Selected products summary */}
          {selectedProducts.length > 0 && (
            <div className="mt-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="w-5 h-5 text-primary-600" />
                <span className="font-medium text-primary-900">
                  {selectedProducts.length} Artikel ausgewählt
                </span>
              </div>
              <ul className="text-sm text-primary-800 space-y-1">
                {selectedProducts.map((p) => (
                  <li key={p.id}>
                    • {p.quantity}x {p.supplier} {p.articleNumber} ({p.categoryName})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {!isLoading && !error && articles.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Keine Artikel für diesen Service verfügbar</p>
          <p className="text-sm mt-1">Sie können später manuell Artikel hinzufügen</p>
        </div>
      )}
    </div>
  );
}

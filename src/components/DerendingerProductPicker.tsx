import { useState, useEffect, useMemo } from 'react';
import api from '../lib/api';
import { Package, Check, Loader2, ShoppingCart, AlertCircle, Sparkles, Hand, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';

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
  // Raw data needed for cart/add (Derendinger requires the full object)
  _rawArticle?: any;
  _rawCategory?: any;
}

interface SelectedProduct extends DerendingerArticle {
  quantity: number;
  isAutoSelected?: boolean;
}

interface ProductPickerProps {
  vin: string;
  serviceType: string;
  onProductsSelected: (products: SelectedProduct[]) => void;
  selectedProducts: SelectedProduct[];
  vehicleId?: string;
  showOrderButton?: boolean;
  onOrderComplete?: (orderId: string) => void;
}

// Service types that have parts
const SERVICE_TYPES_WITH_PARTS = ['small_service', 'big_service', 'brake_service', 'inspection'];

export default function DerendingerProductPicker({ 
  vin, 
  serviceType, 
  onProductsSelected,
  selectedProducts,
  vehicleId,
  showOrderButton = false,
  onOrderComplete,
}: ProductPickerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [articles, setArticles] = useState<DerendingerArticle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [vehicleInfo, setVehicleInfo] = useState<any>(null);
  const [rawVehicle, setRawVehicle] = useState<any>(null);
  const [manualCategories, setManualCategories] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isAllManual, setIsAllManual] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  // Group articles by category
  const groupedArticles = useMemo(() => {
    return articles.reduce((acc, article) => {
      const cat = article.categoryName || 'Andere';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(article);
      return acc;
    }, {} as Record<string, DerendingerArticle[]>);
  }, [articles]);

  // Place order via direct API: cart/add each item → order/place
  const placeOrder = async () => {
    if (selectedProducts.length === 0) return;

    setIsOrdering(true);
    setOrderSuccess(false);
    setOrderNumber(null);

    try {
      // 1. Add each selected product to the Derendinger cart
      for (const product of selectedProducts) {
        await api.post('/derendinger/cart/add', {
          rawArticle: product._rawArticle,
          rawCategory: product._rawCategory,
          rawVehicle: rawVehicle,
          quantity: product.quantity,
        });
      }

      // 2. Place the order
      const orderRes = await api.post('/derendinger/order/place', {
        reference: vehicleId || vin,
      });

      if (orderRes.data.success) {
        setOrderSuccess(true);
        setOrderNumber(orderRes.data.orderNumber || null);
        if (onOrderComplete) {
          onOrderComplete(orderRes.data.orderNumber || '');
        }
      } else {
        throw new Error(orderRes.data.error || 'Bestellung fehlgeschlagen');
      }
    } catch (err: any) {
      console.error('Order error:', err);
      alert('Fehler bei der Bestellung: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsOrdering(false);
    }
  };

  // Get best article for a category (first one in stock, preferring immediate delivery)
  const getBestArticle = (categoryArticles: DerendingerArticle[]): DerendingerArticle | null => {
    // Sort by: immediate delivery first, then by stock
    const sorted = [...categoryArticles].sort((a, b) => {
      // Prefer immediate availability
      if (a.availabilityType === 'immediate' && b.availabilityType !== 'immediate') return -1;
      if (b.availabilityType === 'immediate' && a.availabilityType !== 'immediate') return 1;
      // Then prefer higher stock
      return (b.stock || 0) - (a.stock || 0);
    });
    
    // Return first one that's in stock
    return sorted.find(a => a.stock > 0) || sorted[0] || null;
  };

  useEffect(() => {
    if (vin && serviceType && SERVICE_TYPES_WITH_PARTS.includes(serviceType)) {
      fetchProducts();
    }
  }, [vin, serviceType]);

  // Auto-select best products when articles change (and not in manual mode)
  useEffect(() => {
    if (articles.length > 0 && !isAllManual) {
      autoSelectBestProducts();
    }
  }, [articles, isAllManual]);

  const autoSelectBestProducts = () => {
    const autoSelected: SelectedProduct[] = [];
    
    for (const [categoryName, categoryArticles] of Object.entries(groupedArticles)) {
      // Skip if this category is in manual mode
      if (manualCategories.has(categoryName)) continue;
      
      const best = getBestArticle(categoryArticles);
      if (best && best.stock > 0) {
        autoSelected.push({
          ...best,
          quantity: 1,
          isAutoSelected: true,
        });
      }
    }
    
    // Merge with manually selected items
    const manualItems = selectedProducts.filter(p => !p.isAutoSelected);
    const newSelection = [...manualItems];
    
    for (const auto of autoSelected) {
      // Don't add if we already have a manual selection for this category
      const hasManualForCategory = manualItems.some(m => m.categoryName === auto.categoryName);
      if (!hasManualForCategory) {
        newSelection.push(auto);
      }
    }
    
    onProductsSelected(newSelection);
  };

  const fetchProducts = async () => {
    if (!SERVICE_TYPES_WITH_PARTS.includes(serviceType)) {
      setArticles([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    setManualCategories(new Set());
    setIsAllManual(false);

    try {
      const response = await api.post('/derendinger/articles/search', {
        vin: vin,
        serviceType: serviceType,
      });

      if (response.data.success) {
        const articles = response.data.data.articles || [];
        const vehicle = response.data.data.vehicle;

        setArticles(articles);
        setVehicleInfo(vehicle);
        setRawVehicle(response.data.data._rawVehicle || null);
        
        if (articles.length === 0) {
          // Check if vehicle was not found at all
          if (!vehicle) {
            setError('Dieses Fahrzeug wurde nicht in der Derendinger-Datenbank gefunden. Möglicherweise ist das Fahrzeug zu alt oder nicht gelistet. Sie können Teile später manuell hinzufügen.');
          } else {
            setError('Keine passenden Artikel gefunden für dieses Fahrzeug.');
          }
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

  const selectProduct = (article: DerendingerArticle, categoryName: string) => {
    // Remove any existing selection for this category
    const filtered = selectedProducts.filter(p => p.categoryName !== categoryName);
    
    // Add the new selection (mark as manual)
    onProductsSelected([...filtered, { ...article, quantity: 1, isAutoSelected: false }]);
  };

  const updateQuantity = (articleId: string, quantity: number) => {
    if (quantity < 1) {
      onProductsSelected(selectedProducts.filter(p => p.id !== articleId));
    } else {
      onProductsSelected(
        selectedProducts.map(p => 
          p.id === articleId ? { ...p, quantity } : p
        )
      );
    }
  };

  const toggleManualForCategory = (categoryName: string) => {
    const newManual = new Set(manualCategories);
    if (newManual.has(categoryName)) {
      newManual.delete(categoryName);
      // Re-auto-select for this category
      const categoryArticles = groupedArticles[categoryName] || [];
      const best = getBestArticle(categoryArticles);
      if (best && best.stock > 0) {
        const filtered = selectedProducts.filter(p => p.categoryName !== categoryName);
        onProductsSelected([...filtered, { ...best, quantity: 1, isAutoSelected: true }]);
      }
    } else {
      newManual.add(categoryName);
      // Expand the category so user can see options
      setExpandedCategories(prev => new Set(prev).add(categoryName));
    }
    setManualCategories(newManual);
  };

  const toggleAllManual = () => {
    if (isAllManual) {
      // Switch back to auto mode
      setIsAllManual(false);
      setManualCategories(new Set());
      setExpandedCategories(new Set());
    } else {
      // Switch to all manual
      setIsAllManual(true);
      setManualCategories(new Set(Object.keys(groupedArticles)));
      setExpandedCategories(new Set(Object.keys(groupedArticles)));
      // Clear auto-selected items
      onProductsSelected(selectedProducts.filter(p => !p.isAutoSelected));
    }
  };

  const toggleCategoryExpanded = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  const isSelected = (articleId: string) => selectedProducts.some(p => p.id === articleId);
  const getSelectedForCategory = (categoryName: string) => selectedProducts.find(p => p.categoryName === categoryName);

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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold">Ersatzteile von Derendinger</h3>
        </div>
        
        {articles.length > 0 && (
          <button
            onClick={toggleAllManual}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              isAllManual
                ? 'bg-primary-100 text-primary-700 border border-primary-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            {isAllManual ? (
              <>
                <Sparkles className="w-4 h-4" />
                Auto-Auswahl
              </>
            ) : (
              <>
                <Hand className="w-4 h-4" />
                Alle manuell
              </>
            )}
          </button>
        )}
      </div>

      {vehicleInfo && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
          <span className="font-medium">{vehicleInfo.brand}</span> {vehicleInfo.model}
          {vehicleInfo.engineCode && <span className="text-gray-500"> • {vehicleInfo.engineCode}</span>}
        </div>
      )}

      {/* Auto-selection info */}
      {!isAllManual && articles.length > 0 && !isLoading && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2">
          <Sparkles className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-emerald-800">
            <p className="font-medium">Automatische Auswahl aktiv</p>
            <p className="text-emerald-600">Die besten verfügbaren Teile wurden automatisch gewählt. Klicken Sie "Manuell" um andere Optionen zu sehen.</p>
          </div>
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
          {Object.entries(groupedArticles).map(([categoryName, categoryArticles]) => {
            const selectedItem = getSelectedForCategory(categoryName);
            const isManual = manualCategories.has(categoryName) || isAllManual;
            const isExpanded = expandedCategories.has(categoryName);
            const best = getBestArticle(categoryArticles);
            
            return (
              <div key={categoryName} className="mb-4 border border-gray-200 rounded-xl overflow-hidden">
                {/* Category Header - Shows selected item or prompt to select */}
                <div className={`p-4 ${selectedItem ? 'bg-primary-50' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${selectedItem ? 'bg-primary-500' : 'bg-gray-400'}`}></span>
                      <span className="font-medium text-gray-900">{categoryName}</span>
                      <span className="text-sm text-gray-500">({categoryArticles.length} Optionen)</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!isAllManual && (
                        <button
                          onClick={() => toggleManualForCategory(categoryName)}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                            isManual
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                          }`}
                        >
                          <Hand className="w-3 h-3" />
                          {isManual ? 'Manuell' : 'Auto'}
                        </button>
                      )}
                      
                      <button
                        onClick={() => toggleCategoryExpanded(categoryName)}
                        className="p-1 rounded hover:bg-white/50"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {/* Selected item preview */}
                  {selectedItem && !isExpanded && (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="w-12 h-12 bg-white rounded-lg overflow-hidden flex-shrink-0">
                        {selectedItem.images?.[0] ? (
                          <img src={selectedItem.images[0]} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {selectedItem.supplier} {selectedItem.articleNumber}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            selectedItem.availabilityType === 'immediate'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            🚚 {selectedItem.deliveryInfo}
                          </span>
                          {selectedItem.isAutoSelected && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                              <Sparkles className="w-3 h-3 inline mr-1" />
                              Auto
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => updateQuantity(selectedItem.id, selectedItem.quantity - 1)}
                          className="w-8 h-8 rounded-full bg-white border border-gray-300 hover:bg-gray-100 flex items-center justify-center font-bold"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-medium">{selectedItem.quantity}</span>
                        <button
                          onClick={() => updateQuantity(selectedItem.id, selectedItem.quantity + 1)}
                          className="w-8 h-8 rounded-full bg-white border border-gray-300 hover:bg-gray-100 flex items-center justify-center font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Prompt when nothing selected */}
                  {!selectedItem && !isExpanded && isManual && (
                    <p className="mt-2 text-sm text-amber-600">
                      Bitte wählen Sie ein Teil aus den Optionen unten
                    </p>
                  )}
                </div>
                
                {/* Expanded options */}
                {isExpanded && (
                  <div className="p-4 bg-white border-t border-gray-200 space-y-3">
                    {categoryArticles.map((article) => {
                      const isThisSelected = isSelected(article.id);
                      const isBest = article.id === best?.id;
                      
                      return (
                        <div
                          key={article.id}
                          onClick={() => selectProduct(article, categoryName)}
                          className={`relative flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all ${
                            isThisSelected
                              ? 'bg-primary-100 border-2 border-primary-500'
                              : 'bg-gray-50 border-2 border-transparent hover:border-gray-300'
                          }`}
                        >
                          {/* Selection indicator */}
                          {isThisSelected && (
                            <div className="absolute top-2 right-2 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                          
                          {/* Best badge */}
                          {isBest && !isThisSelected && (
                            <div className="absolute top-2 right-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              Empfohlen
                            </div>
                          )}
                          
                          {/* Image */}
                          <div className="w-16 h-16 bg-white rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                            {article.images?.[0] ? (
                              <img src={article.images[0]} alt="" className="w-full h-full object-contain" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-8 h-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                          
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900">
                              {article.supplier} {article.articleNumber}
                            </p>
                            <p className="text-sm text-gray-600 truncate">{article.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                article.stock > 5 
                                  ? 'bg-green-100 text-green-700' 
                                  : article.stock > 0 
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {article.stock > 0 ? `${article.stock} auf Lager` : 'Nicht lagernd'}
                              </span>
                              {article.deliveryInfo && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  article.availabilityType === 'immediate'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  🚚 {article.deliveryInfo}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Quantity when selected */}
                          {isThisSelected && (
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => updateQuantity(article.id, (selectedProducts.find(p => p.id === article.id)?.quantity || 1) - 1)}
                                className="w-8 h-8 rounded-full bg-white border border-gray-300 hover:bg-gray-100 flex items-center justify-center font-bold"
                              >
                                -
                              </button>
                              <span className="w-6 text-center font-medium">
                                {selectedProducts.find(p => p.id === article.id)?.quantity || 1}
                              </span>
                              <button
                                onClick={() => updateQuantity(article.id, (selectedProducts.find(p => p.id === article.id)?.quantity || 1) + 1)}
                                className="w-8 h-8 rounded-full bg-white border border-gray-300 hover:bg-gray-100 flex items-center justify-center font-bold"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Selected products summary */}
          {selectedProducts.length > 0 && (
            <div className={`mt-6 p-4 border rounded-lg ${orderSuccess ? 'bg-emerald-50 border-emerald-200' : 'bg-primary-50 border-primary-200'}`}>
              {orderSuccess ? (
                <div className="flex items-center gap-3 text-emerald-800">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                  <div>
                    <p className="font-medium">Bestellung erfolgreich übermittelt!</p>
                    <p className="text-sm text-emerald-600">
                      Die Teile wurden bei Derendinger bestellt.
                      {orderNumber && <> Bestellnr: <strong>{orderNumber}</strong></>}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-primary-600" />
                      <span className="font-medium text-primary-900">
                        {selectedProducts.length} Artikel für Bestellung
                      </span>
                    </div>
                    
                    {showOrderButton && (
                      <button
                        onClick={placeOrder}
                        disabled={isOrdering}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-all ${
                          isOrdering
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-orange-500 hover:bg-orange-600'
                        }`}
                      >
                        {isOrdering ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Bestellen...
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4" />
                            Bei Derendinger bestellen
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <ul className="text-sm text-primary-800 space-y-1">
                    {selectedProducts.map((p) => (
                      <li key={p.id} className="flex items-center gap-2">
                        <span>• {p.quantity}x {p.supplier} {p.articleNumber}</span>
                        {p.isAutoSelected && (
                          <span className="text-xs text-purple-600">(Auto)</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
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

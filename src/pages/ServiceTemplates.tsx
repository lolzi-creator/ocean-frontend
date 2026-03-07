import { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  Plus,
  Settings,
  Edit,
  Trash2,
  X,
  Package,
  Clock,
  Check,
  Wrench,
  DollarSign,
  ShoppingBag,
} from 'lucide-react';
import DerendingerCategoryBrowser from '../components/DerendingerCategoryBrowser';
import type { ServiceTemplate, ServiceTemplatePart, CustomArticle } from '../types';

export default function ServiceTemplates() {
  const [templates, setTemplates] = useState<ServiceTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ServiceTemplate | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    estimatedHours: '1',
    hourlyRate: '120',
  });
  const [selectedParts, setSelectedParts] = useState<ServiceTemplatePart[]>([]);
  const [customArticles, setCustomArticles] = useState<CustomArticle[]>([]);
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/service-templates');
      setTemplates(response.data);
    } catch (error) {
      toast.error('Service-Vorlagen konnten nicht geladen werden');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePartSelection = (part: { partCode: string; name: string; functionalGroup: string }) => {
    const existingIndex = selectedParts.findIndex(
      (p) => p.partCode === part.partCode
    );

    if (existingIndex >= 0) {
      setSelectedParts(selectedParts.filter((_, i) => i !== existingIndex));
    } else {
      setSelectedParts([
        ...selectedParts,
        {
          partCode: part.partCode,
          name: part.name,
          functionalGroup: part.functionalGroup,
          quantity: 1,
        },
      ]);
    }
  };

  const updatePartQuantity = (partCode: string, quantity: number) => {
    if (quantity < 1) {
      setSelectedParts(selectedParts.filter((p) => p.partCode !== partCode));
    } else {
      setSelectedParts(
        selectedParts.map((p) =>
          p.partCode === partCode ? { ...p, quantity } : p
        )
      );
    }
  };

  const isPartSelected = (partCode: string) =>
    selectedParts.some((p) => p.partCode === partCode);

  // Custom articles helpers
  const addCustomArticle = () => {
    setCustomArticles([...customArticles, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const updateCustomArticle = (index: number, field: keyof CustomArticle, value: string | number) => {
    setCustomArticles(customArticles.map((a, i) => i === index ? { ...a, [field]: value } : a));
  };

  const removeCustomArticle = (index: number) => {
    setCustomArticles(customArticles.filter((_, i) => i !== index));
  };

  const customArticlesTotal = customArticles.reduce((sum, a) => sum + a.quantity * a.unitPrice, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate: need at least 1 part OR 1 custom article
    const validArticles = customArticles.filter(a => a.description.trim() && a.unitPrice > 0);
    if (selectedParts.length === 0 && validArticles.length === 0) {
      toast.error('Bitte wählen Sie mindestens ein Teil oder einen eigenen Artikel aus');
      return;
    }

    try {
      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        estimatedHours: parseFloat(formData.estimatedHours) || 1,
        hourlyRate: parseFloat(formData.hourlyRate) || 120,
        parts: selectedParts,
        customArticles: validArticles,
      };

      if (editingTemplate) {
        await api.patch(`/service-templates/${editingTemplate.id}`, payload);
        toast.success('Service-Vorlage erfolgreich aktualisiert');
      } else {
        await api.post('/service-templates', payload);
        toast.success('Service-Vorlage erfolgreich erstellt');
      }

      setShowModal(false);
      resetForm();
      fetchTemplates();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          'Service-Vorlage konnte nicht gespeichert werden'
      );
    }
  };

  const handleEdit = (template: ServiceTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      estimatedHours: template.estimatedHours.toString(),
      hourlyRate: (template.hourlyRate || 120).toString(),
    });
    setSelectedParts(template.parts || []);
    setCustomArticles(template.customArticles || []);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm('Sind Sie sicher, dass Sie diese Vorlage löschen möchten?')
    )
      return;

    try {
      await api.delete(`/service-templates/${id}`);
      toast.success('Service-Vorlage erfolgreich gelöscht');
      fetchTemplates();
    } catch (error) {
      toast.error('Service-Vorlage konnte nicht gelöscht werden');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      estimatedHours: '1',
      hourlyRate: '120',
    });
    setSelectedParts([]);
    setCustomArticles([]);
    setEditingTemplate(null);
  };

  const getTemplateArticleCount = (t: ServiceTemplate) => {
    return (t.parts?.length || 0) + (t.customArticles?.length || 0);
  };

  const getTemplateMaterialTotal = (t: ServiceTemplate) => {
    return (t.customArticles || []).reduce((sum, a) => sum + a.quantity * a.unitPrice, 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Service-Vorlagen</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {templates.length} Vorlagen &bull; {templates.filter(t => t.isActive).length} aktiv
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4" />
          Neue Vorlage
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{templates.length}</p>
              <p className="text-xs text-neutral-500">Vorlagen</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
              <Check className="w-5 h-5 text-success-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{templates.filter(t => t.isActive).length}</p>
              <p className="text-xs text-neutral-500">Aktiv</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-neutral-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{templates.reduce((sum, t) => sum + getTemplateArticleCount(t), 0)}</p>
              <p className="text-xs text-neutral-500">Artikel</p>
            </div>
          </div>
        </div>
      </div>

      {/* Templates List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Settings className="w-8 h-8 text-primary-600 animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="card text-center py-12">
          <Settings className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-900 mb-1">Keine Vorlagen</h3>
          <p className="text-sm text-neutral-500 mb-4">Erstellen Sie Ihre erste Service-Vorlage</p>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" />
            Vorlage erstellen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => {
            const materialTotal = getTemplateMaterialTotal(template);
            const articleCount = getTemplateArticleCount(template);

            return (
              <div key={template.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Wrench className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-900">{template.name}</h3>
                      {template.description && (
                        <p className="text-xs text-neutral-500 line-clamp-1">{template.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {template.isDefault && (
                      <span className="badge badge-primary text-[10px]">Standard</span>
                    )}
                    <span className={`badge ${template.isActive ? 'badge-success' : 'badge-gray'}`}>
                      {template.isActive ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-neutral-500 mb-3">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {template.estimatedHours}h
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    CHF {(template.hourlyRate || 120).toFixed(0)}/h
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="w-3.5 h-3.5" />
                    {articleCount} Artikel
                  </span>
                </div>

                {/* Parts + custom articles preview */}
                {articleCount > 0 && (
                  <div className="bg-neutral-50 rounded-lg p-2 mb-3">
                    <div className="flex flex-wrap gap-1">
                      {(template.parts || []).slice(0, 2).map((part, i) => (
                        <span key={`p${i}`} className="px-2 py-0.5 bg-white rounded text-xs text-neutral-600 border border-neutral-200">
                          {part.name}
                        </span>
                      ))}
                      {(template.customArticles || []).slice(0, 2).map((art, i) => (
                        <span key={`a${i}`} className="px-2 py-0.5 bg-amber-50 rounded text-xs text-amber-700 border border-amber-200">
                          {art.description}
                        </span>
                      ))}
                      {articleCount > 4 && (
                        <span className="px-2 py-0.5 bg-primary-50 rounded text-xs text-primary-600">
                          +{articleCount - 4}
                        </span>
                      )}
                    </div>
                    {materialTotal > 0 && (
                      <p className="text-xs text-neutral-500 mt-1.5 pl-1">
                        Material: CHF {materialTotal.toFixed(2)}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(template)}
                    className="flex-1 btn btn-sm btn-secondary"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Bearbeiten
                  </button>
                  {!template.isDefault && (
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="p-2 hover:bg-danger-50 rounded-lg transition-colors"
                      title="Löschen"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl animate-slide-up max-h-[90vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between rounded-t-3xl z-10">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  {editingTemplate
                    ? 'Vorlage bearbeiten'
                    : 'Neue Service-Vorlage'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {editingTemplate
                    ? 'Aktualisieren Sie die Vorlagedaten'
                    : 'Erstellen Sie ein eigenes Service-Paket mit Teilen und Artikeln'}
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

            <form
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto p-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left column - Basic info + selected parts + custom articles */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary-600" />
                    Grundinformationen
                  </h3>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                      className="input"
                      placeholder="z.B. Premium Winterservice"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Beschreibung
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      className="input"
                      rows={2}
                      placeholder="Optionale Beschreibung..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Geschätzte Stunden
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={formData.estimatedHours}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            estimatedHours: e.target.value,
                          })
                        }
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Stundensatz (CHF)
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={formData.hourlyRate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            hourlyRate: e.target.value,
                          })
                        }
                        className="input"
                      />
                    </div>
                  </div>

                  {/* Selected Derendinger parts */}
                  <div className="mt-4">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Package className="w-5 h-5 text-primary-600" />
                      Derendinger-Teile ({selectedParts.length})
                    </h4>

                    {selectedParts.length === 0 ? (
                      <div className="bg-gray-50 rounded-lg p-3 text-center text-gray-500">
                        <p className="text-sm">
                          Wählen Sie Teile aus dem Katalog rechts
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {selectedParts.map((part) => (
                          <div
                            key={part.partCode}
                            className="flex items-center justify-between p-2.5 bg-primary-50 rounded-lg border border-primary-200"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm truncate">
                                {part.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {part.partCode}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              <button
                                type="button"
                                onClick={() =>
                                  updatePartQuantity(
                                    part.partCode,
                                    part.quantity - 1
                                  )
                                }
                                className="w-6 h-6 rounded-full bg-white border border-gray-300 hover:bg-gray-100 flex items-center justify-center font-bold text-xs"
                              >
                                -
                              </button>
                              <span className="w-5 text-center font-medium text-sm">
                                {part.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  updatePartQuantity(
                                    part.partCode,
                                    part.quantity + 1
                                  )
                                }
                                className="w-6 h-6 rounded-full bg-white border border-gray-300 hover:bg-gray-100 flex items-center justify-center font-bold text-xs"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Custom articles section */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-amber-600" />
                        Eigene Artikel ({customArticles.length})
                      </h4>
                      <button
                        type="button"
                        onClick={addCustomArticle}
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Artikel hinzufügen
                      </button>
                    </div>

                    {customArticles.length === 0 ? (
                      <div className="bg-amber-50 rounded-lg p-3 text-center text-amber-700 border border-amber-200">
                        <p className="text-sm">
                          Eigene Artikel hinzufügen (z.B. Lagerbestand)
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {customArticles.map((article, index) => (
                          <div
                            key={index}
                            className="p-3 bg-amber-50 rounded-lg border border-amber-200"
                          >
                            <div className="flex items-start gap-2">
                              <div className="flex-1 space-y-2">
                                <input
                                  type="text"
                                  value={article.description}
                                  onChange={(e) => updateCustomArticle(index, 'description', e.target.value)}
                                  className="input text-sm"
                                  placeholder="Artikelbezeichnung..."
                                />
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <label className="text-xs text-gray-500">Anzahl</label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={article.quantity}
                                      onChange={(e) => updateCustomArticle(index, 'quantity', parseInt(e.target.value) || 1)}
                                      className="input text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500">Preis/Stk.</label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.50"
                                      value={article.unitPrice}
                                      onChange={(e) => updateCustomArticle(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                      className="input text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500">Total</label>
                                    <p className="input text-sm bg-gray-100 flex items-center">
                                      CHF {(article.quantity * article.unitPrice).toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeCustomArticle(index)}
                                className="p-1 hover:bg-red-100 rounded-lg transition-colors mt-1"
                              >
                                <X className="w-4 h-4 text-red-500" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {customArticlesTotal > 0 && (
                          <div className="text-right text-sm font-semibold text-amber-700 pr-2">
                            Material Total: CHF {customArticlesTotal.toFixed(2)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right column - Parts catalog */}
                <div className="space-y-4">
                  <DerendingerCategoryBrowser
                    onPartSelect={togglePartSelection}
                    isPartSelected={isPartSelected}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="btn btn-secondary flex-1"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  disabled={selectedParts.length === 0 && customArticles.filter(a => a.description.trim() && a.unitPrice > 0).length === 0}
                >
                  {editingTemplate ? 'Aktualisieren' : 'Erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

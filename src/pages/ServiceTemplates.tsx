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
  ChevronDown,
  ChevronUp,
  Wrench,
  Search,
} from 'lucide-react';
import { AVAILABLE_PARTS } from '../data/derendinger-parts';

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
  createdBy?: {
    id: string;
    name?: string;
    email: string;
  };
  createdAt: string;
}

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
  });
  const [selectedParts, setSelectedParts] = useState<ServiceTemplatePart[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [partsSearch, setPartsSearch] = useState('');

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
      // Remove
      setSelectedParts(selectedParts.filter((_, i) => i !== existingIndex));
    } else {
      // Add
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

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
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

  // Filter parts based on search
  const filteredParts = partsSearch.trim()
    ? AVAILABLE_PARTS.map(category => ({
        ...category,
        parts: category.parts.filter(part =>
          part.name.toLowerCase().includes(partsSearch.toLowerCase()) ||
          part.partCode.toLowerCase().includes(partsSearch.toLowerCase())
        )
      })).filter(category => category.parts.length > 0)
    : AVAILABLE_PARTS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedParts.length === 0) {
      toast.error('Bitte wählen Sie mindestens ein Teil aus');
      return;
    }

    try {
      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        estimatedHours: parseFloat(formData.estimatedHours) || 1,
        parts: selectedParts,
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
    });
    setSelectedParts(template.parts || []);
    setPartsSearch('');
    setExpandedCategories(new Set());
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
    });
    setSelectedParts([]);
    setPartsSearch('');
    setExpandedCategories(new Set());
    setEditingTemplate(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Service-Vorlagen</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {templates.length} Vorlagen • {templates.filter(t => t.isActive).length} aktiv
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
              <p className="text-2xl font-bold text-neutral-900">{templates.reduce((sum, t) => sum + (t.parts?.length || 0), 0)}</p>
              <p className="text-xs text-neutral-500">Teile</p>
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
          {templates.map((template) => (
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
                <span className={`badge ${template.isActive ? 'badge-success' : 'badge-gray'}`}>
                  {template.isActive ? 'Aktiv' : 'Inaktiv'}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-neutral-500 mb-3">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {template.estimatedHours}h
                </span>
                <span className="flex items-center gap-1">
                  <Package className="w-3.5 h-3.5" />
                  {template.parts?.length || 0} Teile
                </span>
              </div>

              {/* Parts preview */}
              {template.parts && template.parts.length > 0 && (
                <div className="bg-neutral-50 rounded-lg p-2 mb-3">
                  <div className="flex flex-wrap gap-1">
                    {template.parts.slice(0, 3).map((part, i) => (
                      <span key={i} className="px-2 py-0.5 bg-white rounded text-xs text-neutral-600 border border-neutral-200">
                        {part.name}
                      </span>
                    ))}
                    {template.parts.length > 3 && (
                      <span className="px-2 py-0.5 bg-primary-50 rounded text-xs text-primary-600">
                        +{template.parts.length - 3}
                      </span>
                    )}
                  </div>
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
                <button
                  onClick={() => handleDelete(template.id)}
                  className="p-2 hover:bg-danger-50 rounded-lg transition-colors"
                  title="Löschen"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl animate-slide-up max-h-[90vh] overflow-hidden flex flex-col">
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
                    : 'Erstellen Sie ein eigenes Service-Paket mit Teilen'}
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
                {/* Left column - Basic info */}
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
                      rows={3}
                      placeholder="Optionale Beschreibung..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Geschätzte Arbeitsstunden
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

                  {/* Selected parts summary */}
                  <div className="mt-6">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Package className="w-5 h-5 text-primary-600" />
                      Ausgewählte Teile ({selectedParts.length})
                    </h4>

                    {selectedParts.length === 0 ? (
                      <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                        <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">
                          Wählen Sie Teile aus dem Katalog rechts
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {selectedParts.map((part) => (
                          <div
                            key={part.partCode}
                            className="flex items-center justify-between p-3 bg-primary-50 rounded-lg border border-primary-200"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {part.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                Code: {part.partCode}
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
                                className="w-7 h-7 rounded-full bg-white border border-gray-300 hover:bg-gray-100 flex items-center justify-center font-bold text-sm"
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
                                className="w-7 h-7 rounded-full bg-white border border-gray-300 hover:bg-gray-100 flex items-center justify-center font-bold text-sm"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right column - Parts catalog */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary-600" />
                    Teile auswählen
                  </h3>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={partsSearch}
                      onChange={(e) => setPartsSearch(e.target.value)}
                      className="input pl-10"
                      placeholder="Teile suchen... (z.B. Ölfilter, Bremse)"
                    />
                  </div>

                  <p className="text-xs text-gray-500">
                    {AVAILABLE_PARTS.reduce((sum, cat) => sum + cat.parts.length, 0)} Teile in {AVAILABLE_PARTS.length} Kategorien verfügbar
                  </p>

                  {/* Parts list */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
                    {filteredParts.map((category) => {
                      const isExpanded = expandedCategories.has(category.category);
                      const selectedCount = category.parts.filter((p) =>
                        isPartSelected(p.partCode)
                      ).length;

                      return (
                        <div
                          key={category.category}
                          className="border-b border-gray-200 last:border-b-0"
                        >
                          <button
                            type="button"
                            onClick={() => toggleCategory(category.category)}
                            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 text-sm">
                                {category.category}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({category.parts.length})
                              </span>
                              {selectedCount > 0 && (
                                <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
                                  {selectedCount} ausgewählt
                                </span>
                              )}
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </button>

                          {isExpanded && (
                            <div className="p-2 space-y-1 bg-white">
                              {category.parts.map((part) => {
                                const selected = isPartSelected(part.partCode);
                                return (
                                  <button
                                    key={part.partCode}
                                    type="button"
                                    onClick={() => togglePartSelection(part)}
                                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all ${
                                      selected
                                        ? 'bg-primary-100 border border-primary-300'
                                        : 'hover:bg-gray-50 border border-transparent'
                                    }`}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-gray-900 text-sm truncate">
                                        {part.name}
                                      </p>
                                      <p className="text-xs text-gray-400">
                                        {part.partCode}
                                      </p>
                                    </div>
                                    <div
                                      className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ml-2 ${
                                        selected
                                          ? 'bg-primary-500 text-white'
                                          : 'bg-gray-200'
                                      }`}
                                    >
                                      {selected && <Check className="w-3 h-3" />}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
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
                  disabled={selectedParts.length === 0}
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

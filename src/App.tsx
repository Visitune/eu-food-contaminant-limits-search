import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, RefreshCw, Loader2, Globe, Info, AlertTriangle, ChevronDown, Download, HelpCircle, X, FileSpreadsheet, FileText, CheckCircle, Circle, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchContaminantLimits, getCategories, getRegulationInfo, ContaminantLimit, Category } from './services/contaminantService';
import { checkRegulationUpdates, getLatestRegulationUrl } from './services/eurlexService';

type Lang = 'fr' | 'en';
type SearchMode = 'contains' | 'exact';

const CATEGORY_COLORS: Record<string, { bg: string; border: string; badge: string; chip: string; chipActive: string; header: string; headerText: string }> = {
  '1': { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-200 text-amber-900', chip: 'bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100', chipActive: 'bg-amber-500 text-white border border-amber-500', header: 'bg-amber-100 border-amber-200', headerText: 'text-amber-900' },
  '2': { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-200 text-green-900', chip: 'bg-green-50 border border-green-300 text-green-800 hover:bg-green-100', chipActive: 'bg-green-600 text-white border border-green-600', header: 'bg-green-100 border-green-200', headerText: 'text-green-900' },
  '3': { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-200 text-red-900', chip: 'bg-red-50 border border-red-300 text-red-800 hover:bg-red-100', chipActive: 'bg-red-600 text-white border border-red-600', header: 'bg-red-100 border-red-200', headerText: 'text-red-900' },
  '4': { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-200 text-purple-900', chip: 'bg-purple-50 border border-purple-300 text-purple-800 hover:bg-purple-100', chipActive: 'bg-purple-600 text-white border border-purple-600', header: 'bg-purple-100 border-purple-200', headerText: 'text-purple-900' },
  '5': { bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-200 text-orange-900', chip: 'bg-orange-50 border border-orange-300 text-orange-800 hover:bg-orange-100', chipActive: 'bg-orange-500 text-white border border-orange-500', header: 'bg-orange-100 border-orange-200', headerText: 'text-orange-900' },
  '6': { bg: 'bg-sky-50', border: 'border-sky-200', badge: 'bg-sky-200 text-sky-900', chip: 'bg-sky-50 border border-sky-300 text-sky-800 hover:bg-sky-100', chipActive: 'bg-sky-600 text-white border border-sky-600', header: 'bg-sky-100 border-sky-200', headerText: 'text-sky-900' },
};

const getCatId = (code: string) => code.charAt(0);
const getSubId = (code: string) => code.split('.').slice(0, 2).join('.');

const exportToCSV = (data: ContaminantLimit[], lang: Lang) => {
  const headers = ['Code', 'Catégorie', 'Sous-catégorie', 'Produit', 'Limite', 'Notes'];
  const rows = data.map(item => [
    item.code,
    item.category.fr,
    item.contaminant.fr,
    item.product,
    item.limit,
    item.notes
  ]);
  const csvContent = [headers, ...rows].map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(';')).join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `contaminants_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
};

const exportToExcel = async (data: ContaminantLimit[], lang: Lang) => {
  const headers = ['Code', 'Catégorie', 'Sous-catégorie', 'Produit', 'Limite', 'Notes'];
  const rows = data.map(item => [
    item.code,
    item.category.fr,
    item.contaminant.fr,
    item.product,
    item.limit,
    item.notes
  ]);
  
  const xlsxContent = [
    headers.join('\t'),
    ...rows.map(row => row.join('\t'))
  ].join('\n');
  
  const blob = new Blob([xlsxContent], { type: 'application/vnd.ms-excel' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `contaminants_${new Date().toISOString().split('T')[0]}.xls`;
  link.click();
};

export default function App() {
  const [lang, setLang] = useState<Lang>('fr');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('contains');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [results, setResults] = useState<ContaminantLimit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [regulationInfo, setRegulationInfo] = useState<any>(null);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [showHelp, setShowHelp] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    setLoading(true);
    const [data, cats, regInfo, updateInfo] = await Promise.all([
      fetchContaminantLimits(),
      getCategories(),
      Promise.resolve(getRegulationInfo()),
      checkRegulationUpdates().catch(() => ({ hasUpdate: false, sourceUrl: '' })),
    ]);
    setResults(data);
    setCategories(cats);
    setRegulationInfo(regInfo);
    setHasUpdate(updateInfo.hasUpdate);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowExport(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredResults = useMemo(() => {
    return results.filter(item => {
      const q = searchTerm.toLowerCase().trim();
      if (!q) return selectedCategory === 'all' || getCatId(item.code) === selectedCategory;
      let matchesSearch = false;
      if (searchMode === 'exact') {
        const productLower = item.product.toLowerCase();
        const contaminantFr = item.contaminant.fr.toLowerCase();
        const contaminantEn = item.contaminant.en.toLowerCase();
        matchesSearch = productLower === q || contaminantFr === q || contaminantEn === q || item.code.toLowerCase() === q;
      } else {
        matchesSearch = item.product.toLowerCase().includes(q) || item.contaminant.fr.toLowerCase().includes(q) || item.contaminant.en.toLowerCase().includes(q) || item.category.fr.toLowerCase().includes(q) || item.code.toLowerCase().includes(q);
      }
      const matchesCategory = selectedCategory === 'all' || getCatId(item.code) === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [results, searchTerm, searchMode, selectedCategory]);

  const groupedResults = useMemo(() => {
    const groups: { subId: string; subcategory: { fr: string; en: string }; catId: string; items: ContaminantLimit[] }[] = [];
    const seen: Record<string, number> = {};
    for (const item of filteredResults) {
      const subId = getSubId(item.code);
      if (seen[subId] === undefined) {
        seen[subId] = groups.length;
        groups.push({ subId, subcategory: item.subcategory, catId: getCatId(item.code), items: [] });
      }
      groups[seen[subId]].items.push(item);
    }
    return groups;
  }, [filteredResults]);

  useEffect(() => {
    if (searchTerm) {
      const expanded: Record<string, boolean> = {};
      groupedResults.forEach(g => { expanded[g.subId] = true; });
      setExpandedGroups(expanded);
    }
  }, [searchTerm, groupedResults]);

  const toggleGroup = (subId: string) => setExpandedGroups(prev => ({ ...prev, [subId]: prev[subId] === false }));

  const expandAll = () => {
    const expanded: Record<string, boolean> = {};
    groupedResults.forEach(g => { expanded[g.subId] = true; });
    setExpandedGroups(expanded);
  };

  const collapseAll = () => setExpandedGroups({});

  const toggleRowSelection = (id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectFiltered = () => {
    setSelectedRows(new Set(filteredResults.map(r => r.id)));
  };

  const handleSelectAll = () => {
    setSelectedRows(new Set(results.map(r => r.id)));
  };

  const handleDeselectAll = () => {
    setSelectedRows(new Set());
  };

  const exportSelected = (format: 'csv' | 'excel') => {
    const dataToExport = selectedRows.size > 0 ? filteredResults.filter(r => selectedRows.has(r.id)) : filteredResults;
    if (format === 'csv') exportToCSV(dataToExport, lang);
    else exportToExcel(dataToExport, lang);
  };

  const t = {
    title: lang === 'fr' ? 'Limites de contaminants alimentaires — UE' : 'Food Contaminant Limits — EU',
    subtitle: lang === 'fr' ? `Règlement (UE) 2023/915 · Version consolidée ${regulationInfo?.lastUpdated ?? '2025-10-08'}` : `Regulation (EU) 2023/915 · Consolidated ${regulationInfo?.lastUpdated ?? '2025-10-08'}`,
    search: lang === 'fr' ? 'Rechercher par contaminant, produit, code...' : 'Search by contaminant, product, code...',
    refresh: lang === 'fr' ? 'Actualiser' : 'Refresh',
    all: lang === 'fr' ? 'Toutes catégories' : 'All categories',
    results: lang === 'fr' ? 'résultats' : 'results',
    limit: lang === 'fr' ? 'Limite max.' : 'Max. limit',
    newVersion: lang === 'fr' ? 'Mise à jour disponible' : 'Update available',
    noResults: lang === 'fr' ? 'Aucun résultat' : 'No results',
    limits: lang === 'fr' ? 'limites disponibles' : 'limits available',
    consolidated: lang === 'fr' ? 'Consolidé au :' : 'Consolidated:',
    amendments: lang === 'fr' ? 'amendements intégrés' : 'amendments included',
    help: lang === 'fr' ? 'Aide' : 'Help',
    export: lang === 'fr' ? 'Exporter' : 'Export',
    exportCSV: lang === 'fr' ? 'Télécharger CSV' : 'Download CSV',
    exportExcel: lang === 'fr' ? 'Télécharger Excel' : 'Download Excel',
    helpTitle: lang === 'fr' ? 'Guide d\'utilisation' : 'User Guide',
    helpIntro: lang === 'fr' ? 'Cette application permet de rechercher les limites maximales de contaminants dans les denrées alimentaires selon le Règlement (UE) 2023/915.' : 'This application allows you to search for maximum contaminant limits in foodstuffs according to Regulation (EU) 2023/915.',
    helpSearch: lang === 'fr' ? '🔍 Recherche' : '🔍 Search',
    helpSearchDesc: lang === 'fr' ? 'Tapez un contaminant (ex: Aflatoxine), un produit (ex: Arachides), ou un code (ex: 1.1.1)' : 'Type a contaminant (e.g., Aflatoxin), a product (e.g., Peanuts), or a code (e.g., 1.1.1)',
    helpFilter: lang === 'fr' ? '🏷️ Filtrer par catégorie' : '🏷️ Filter by category',
    helpFilterDesc: lang === 'fr' ? 'Cliquez sur une catégorie pour filtrer les résultats. Cliquez à nouveau pour tout afficher.' : 'Click on a category to filter results. Click again to show all.',
    helpExpand: lang === 'fr' ? '📋 Développer/Réduire' : '📋 Expand/Collapse',
    helpExpandDesc: lang === 'fr' ? 'Cliquez sur un en-tête de groupe pour développer ou réduire les limites.' : 'Click on a group header to expand or collapse the limits.',
    helpExport: lang === 'fr' ? '📥 Exporter' : '📥 Export',
    helpExportDesc: lang === 'fr' ? 'Téléchargez les résultats filtrés en CSV ou Excel.' : 'Download filtered results in CSV or Excel.',
    helpLang: lang === 'fr' ? '🌐 Langue' : '🌐 Language',
    helpLangDesc: lang === 'fr' ? 'Basculez entre français et anglais.' : 'Switch between French and English.',
    close: lang === 'fr' ? 'Fermer' : 'Close',
    expandAll: lang === 'fr' ? 'Tout développer' : 'Expand all',
    collapseAll: lang === 'fr' ? 'Tout réduire' : 'Collapse all',
    exactSearch: lang === 'fr' ? 'Exakte' : 'Exact',
    containsSearch: lang === 'fr' ? 'Contient' : 'Contains',
    selectFiltered: lang === 'fr' ? 'Sélectionner résultats' : 'Select results',
    selectAll: lang === 'fr' ? 'Tout sélectionner' : 'Select all',
    deselectAll: lang === 'fr' ? 'Tout désélectionner' : 'Deselect all',
    rowsSelected: lang === 'fr' ? 'ligne(s) sélectionnée(s)' : 'row(s) selected',
    exportSelected: lang === 'fr' ? 'Exporter sélection' : 'Export selection',
    filters: lang === 'fr' ? 'Filtres' : 'Filters',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-4 sticky top-0 z-20 shadow-md">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">{t.title}</h1>
            <p className="text-xs sm:text-sm text-blue-100 mt-1">{t.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasUpdate && (
              <a href={getLatestRegulationUrl()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 text-xs font-medium">
                <AlertTriangle size={14} />
                <span className="hidden sm:inline">{t.newVersion}</span>
              </a>
            )}
            <button type="button" onClick={() => setShowHelp(true)} className="flex items-center gap-1.5 bg-white/20 text-white px-3 py-1.5 rounded-lg hover:bg-white/30 text-xs font-medium">
              <HelpCircle size={14} />
              <span className="hidden sm:inline">{t.help}</span>
            </button>
            <button type="button" onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')} className="flex items-center gap-1.5 bg-white/20 text-white px-3 py-1.5 rounded-lg hover:bg-white/30 text-xs font-medium">
              <Globe size={14} />
              {lang.toUpperCase()}
            </button>
            <button type="button" onClick={loadData} disabled={loading} className="flex items-center gap-1.5 bg-white/20 text-white px-3 py-1.5 rounded-lg hover:bg-white/30 disabled:opacity-50 text-xs font-medium">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{t.refresh}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
        {regulationInfo && (
          <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 flex items-start gap-2 sm:gap-3 shadow-sm">
            <Info size={18} className="text-blue-500 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-semibold text-gray-900 leading-snug">{regulationInfo.title}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs sm:text-sm text-gray-600">
                <span>{t.consolidated} <strong className="text-gray-900">{regulationInfo.lastUpdated}</strong></span>
                <span className="hidden sm:inline">|</span>
                <span><strong className="text-gray-900">{results.length}</strong> {t.limits}</span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={t.search} className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-3 sm:py-3.5 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm sm:text-base" />
            {searchTerm && (
              <button type="button" onClick={() => setSearchTerm('')} className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-2xl leading-none" aria-label="Effacer">×</button>
            )}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${showFilters ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-100 text-gray-700 border border-gray-300'}`}><Filter size={14} /><span>{t.filters}</span></button>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <button type="button" onClick={() => setSearchMode('contains')} className={`px-3 py-1.5 text-xs font-medium ${searchMode === 'contains' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>{t.containsSearch}</button>
                <button type="button" onClick={() => setSearchMode('exact')} className={`px-3 py-1.5 text-xs font-medium ${searchMode === 'exact' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>{t.exactSearch}</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setSelectedCategory('all')} className={`px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${selectedCategory === 'all' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>{t.all}</button>
              {categories.map(cat => {
                const c = CATEGORY_COLORS[cat.id] ?? CATEGORY_COLORS['6'];
                const active = selectedCategory === cat.id;
                return (
                  <button type="button" key={cat.id} onClick={() => setSelectedCategory(active ? 'all' : cat.id)} className={`px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${active ? c.chipActive : c.chip}`}>{cat.id}. {lang === 'fr' ? cat.name : cat.nameEn}</button>
                );
              })}
            </div>
          </div>
          {showFilters && (
            <div className="pt-3 border-t border-gray-200">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-600">
                <span>{lang === 'fr' ? 'Sélection:' : 'Selection:'}</span>
                <button type="button" onClick={handleSelectFiltered} className="text-blue-600 hover:underline">{t.selectFiltered} ({filteredResults.length})</button>
                <span>|</span>
                <button type="button" onClick={handleSelectAll} className="text-blue-600 hover:underline">{t.selectAll} ({results.length})</button>
                <span>|</span>
                <button type="button" onClick={handleDeselectAll} className="text-blue-600 hover:underline">{t.deselectAll}</button>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {(searchTerm || selectedCategory !== 'all') && !loading && <p className="text-sm text-gray-500">{filteredResults.length} {t.results}{searchTerm && <span> pour <em className="text-gray-700">"{searchTerm}"</em></span>}</p>}
          <div className="flex items-center gap-2">
            {selectedRows.size > 0 && <span className="text-xs text-gray-500">{selectedRows.size} {t.rowsSelected}</span>}
            <div className="relative" ref={dropdownRef}>
              <button type="button" onClick={() => setShowExport(!showExport)} disabled={filteredResults.length === 0} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-xs sm:text-sm font-medium"><Download size={14} /><span className="hidden sm:inline">{selectedRows.size > 0 ? t.exportSelected : t.export}</span><ChevronDown size={14} className={`transition-transform ${showExport ? 'rotate-180' : ''}`} /></button>
              <AnimatePresence>
                {showExport && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-30">
                    <button type="button" onClick={() => { exportSelected('csv'); setShowExport(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"><FileText size={16} className="text-green-600" />{t.exportCSV}</button>
                    <button type="button" onClick={() => { exportSelected('excel'); setShowExport(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"><FileSpreadsheet size={16} className="text-green-600" />{t.exportExcel}</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-48 sm:h-64">
            <Loader2 size={48} className="animate-spin text-blue-600" />
          </div>
        ) : groupedResults.length === 0 ? (
          <div className="text-center py-16 sm:py-24 text-gray-400">
            <Search size={48} className="mx-auto mb-4 opacity-25" />
            <p className="text-base sm:text-lg">{t.noResults}</p>
            <button type="button" onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }} className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium">
              {lang === 'fr' ? 'Réinitialiser les filtres' : 'Reset filters'}
            </button>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {groupedResults.map(group => {
              const c = CATEGORY_COLORS[group.catId] ?? CATEGORY_COLORS['6'];
              const isExpanded = expandedGroups[group.subId] !== false;
              const subName = lang === 'fr' ? group.subcategory.fr : group.subcategory.en;
              return (
                <div key={group.subId} className={`rounded-xl border ${c.border} overflow-hidden bg-white shadow-sm`}>
                  <button type="button" onClick={() => toggleGroup(group.subId)} className={`w-full flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 ${c.header} border-b ${c.border} text-left transition-all hover:opacity-90`}>
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <span className={`text-xs sm:text-sm font-bold px-2 py-0.5 sm:py-1 rounded ${c.badge} shrink-0`}>{group.subId}</span>
                      <span className={`font-semibold text-sm sm:text-base ${c.headerText} truncate`}>{subName}</span>
                      <span className={`text-xs opacity-60 ${c.headerText} shrink-0`}>({group.items.length})</span>
                    </div>
                    <ChevronDown size={18} className={`${c.headerText} opacity-60 transition-transform shrink-0 ml-2 ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                        <div className={`divide-y ${c.border}`}>
                          {group.items.map(item => {
                            const isSelected = selectedRows.has(item.id);
                            return (
                              <div key={item.id} className={`px-4 sm:px-5 py-3 sm:py-4 ${c.bg} ${isSelected ? 'bg-blue-50' : ''}`}>
                                <div className="flex items-start gap-3">
                                  <button type="button" onClick={(e) => { e.stopPropagation(); toggleRowSelection(item.id); }} className="shrink-0 mt-0.5">
                                    {isSelected ? <CheckCircle size={20} className="text-blue-600" /> : <Circle size={20} className="text-gray-400 hover:text-blue-500" />}
                                  </button>
                                  <div className="flex-1 min-w-0" onClick={() => toggleRowSelection(item.id)}>
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm sm:text-base text-gray-800 leading-snug">{item.product}</p>
                                        {item.notes && <p className="text-xs text-gray-500 mt-1 italic leading-snug line-clamp-2">{item.notes}</p>}
                                      </div>
                                      <div className="shrink-0 text-left sm:text-right">
                                        <span className="text-sm sm:text-base font-bold text-gray-900 whitespace-nowrap">{item.limit}</span>
                                        <p className="text-xs text-gray-400 mt-0.5 sm:mt-1">{item.code}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="bg-gray-100 border-t border-gray-200 py-4 sm:py-6 mt-8">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-xs sm:text-sm text-gray-500">
            {lang === 'fr' ? 'Application basée sur le' : 'Application based on'} <a href="https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32023R0915" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Règlement (UE) 2023/915</a>
            {lang === 'fr' ? ' · Vérification automatique des mises à jour via GitHub Actions' : ' · Automatic update verification via GitHub Actions'}
          </p>
        </div>
      </footer>

      <AnimatePresence>
        {showHelp && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">{t.helpTitle}</h2>
                <button type="button" onClick={() => setShowHelp(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
                  <X size={20} />
                </button>
              </div>
              <div className="p-5 space-y-5">
                <p className="text-sm text-gray-600 leading-relaxed">{t.helpIntro}</p>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <span className="text-2xl">{t.helpSearch.split(' ')[0]}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{t.helpSearch}</h3>
                      <p className="text-sm text-gray-600">{t.helpSearchDesc}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-2xl">{t.helpFilter.split(' ')[0]}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{t.helpFilter}</h3>
                      <p className="text-sm text-gray-600">{t.helpFilterDesc}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-2xl">{t.helpExpand.split(' ')[0]}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{t.helpExpand}</h3>
                      <p className="text-sm text-gray-600">{t.helpExpandDesc}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-2xl">{t.helpExport.split(' ')[0]}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{t.helpExport}</h3>
                      <p className="text-sm text-gray-600">{t.helpExportDesc}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-2xl">{t.helpLang.split(' ')[0]}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{t.helpLang}</h3>
                      <p className="text-sm text-gray-600">{t.helpLangDesc}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                <button type="button" onClick={() => setShowHelp(false)} className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">{t.close}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { Search, RefreshCw, Loader2, Globe, Info, AlertTriangle, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchContaminantLimits, getCategories, getRegulationInfo, ContaminantLimit, Category } from './services/contaminantService';
import { checkRegulationUpdates, getLatestRegulationUrl } from './services/eurlexService';

type Lang = 'fr' | 'en';

const CATEGORY_COLORS: Record<string, {
  bg: string; border: string; badge: string;
  chip: string; chipActive: string; header: string; headerText: string;
}> = {
  '1': { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-200 text-amber-900', chip: 'bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100', chipActive: 'bg-amber-500 text-white border border-amber-500', header: 'bg-amber-100 border-amber-200', headerText: 'text-amber-900' },
  '2': { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-200 text-green-900', chip: 'bg-green-50 border border-green-300 text-green-800 hover:bg-green-100', chipActive: 'bg-green-600 text-white border border-green-600', header: 'bg-green-100 border-green-200', headerText: 'text-green-900' },
  '3': { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-200 text-red-900', chip: 'bg-red-50 border border-red-300 text-red-800 hover:bg-red-100', chipActive: 'bg-red-600 text-white border border-red-600', header: 'bg-red-100 border-red-200', headerText: 'text-red-900' },
  '4': { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-200 text-purple-900', chip: 'bg-purple-50 border border-purple-300 text-purple-800 hover:bg-purple-100', chipActive: 'bg-purple-600 text-white border border-purple-600', header: 'bg-purple-100 border-purple-200', headerText: 'text-purple-900' },
  '5': { bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-200 text-orange-900', chip: 'bg-orange-50 border border-orange-300 text-orange-800 hover:bg-orange-100', chipActive: 'bg-orange-500 text-white border border-orange-500', header: 'bg-orange-100 border-orange-200', headerText: 'text-orange-900' },
  '6': { bg: 'bg-sky-50', border: 'border-sky-200', badge: 'bg-sky-200 text-sky-900', chip: 'bg-sky-50 border border-sky-300 text-sky-800 hover:bg-sky-100', chipActive: 'bg-sky-600 text-white border border-sky-600', header: 'bg-sky-100 border-sky-200', headerText: 'text-sky-900' },
};

const getCatId = (code: string) => code.charAt(0);
const getSubId = (code: string) => code.split('.').slice(0, 2).join('.');

export default function App() {
  const [lang, setLang] = useState<Lang>('fr');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [results, setResults] = useState<ContaminantLimit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [regulationInfo, setRegulationInfo] = useState<any>(null);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

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

  const filteredResults = useMemo(() => results.filter(item => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      item.contaminant.fr.toLowerCase().includes(q) ||
      item.contaminant.en.toLowerCase().includes(q) ||
      item.product.toLowerCase().includes(q) ||
      item.category.fr.toLowerCase().includes(q) ||
      item.code.toLowerCase().includes(q);
    const matchesCategory = selectedCategory === 'all' || getCatId(item.code) === selectedCategory;
    return matchesSearch && matchesCategory;
  }), [results, searchTerm, selectedCategory]);

  // Regroupe les résultats par sous-catégorie en préservant l'ordre
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

  // Ouvre tous les groupes quand une recherche est active
  useEffect(() => {
    if (searchTerm) {
      const expanded: Record<string, boolean> = {};
      groupedResults.forEach(g => { expanded[g.subId] = true; });
      setExpandedGroups(expanded);
    }
  }, [searchTerm, groupedResults]);

  const toggleGroup = (subId: string) =>
    setExpandedGroups(prev => ({ ...prev, [subId]: prev[subId] === false }));

  const t = {
    title: lang === 'fr' ? 'Limites de contaminants alimentaires — UE' : 'Food Contaminant Limits — EU',
    subtitle: lang === 'fr'
      ? `Règlement (UE) 2023/915 · Version consolidée ${regulationInfo?.lastUpdated ?? '2025-10-08'}`
      : `Regulation (EU) 2023/915 · Consolidated ${regulationInfo?.lastUpdated ?? '2025-10-08'}`,
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
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ── Header sticky ─────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto flex justify-between items-center gap-4">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-900 leading-tight">{t.title}</h1>
            <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">{t.subtitle}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {hasUpdate && (
              <a
                href={getLatestRegulationUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 bg-red-100 text-red-700 px-2.5 py-1.5 rounded-lg hover:bg-red-200 text-xs font-medium"
              >
                <AlertTriangle size={12} />
                {t.newVersion}
              </a>
            )}
            <button
              type="button"
              onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
              className="flex items-center gap-1 bg-white border border-gray-300 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 text-xs font-medium"
            >
              <Globe size={12} />
              {lang.toUpperCase()}
            </button>
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2.5 py-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-xs font-medium"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              {t.refresh}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5 space-y-4">
        {/* ── Bandeau réglementation ─────────────────────────────── */}
        {regulationInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
            <Info size={15} className="text-blue-500 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-blue-900 leading-snug line-clamp-2">{regulationInfo.title}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-blue-700">
                <span>{t.consolidated} <strong>{regulationInfo.lastUpdated}</strong></span>
                {regulationInfo.amendments && (
                  <span><strong>{regulationInfo.amendments.length}</strong> {t.amendments}</span>
                )}
                <span><strong>{results.length}</strong> {t.limits}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Recherche ──────────────────────────────────────────── */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={t.search}
            className="w-full pl-9 pr-9 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-xl leading-none"
              aria-label="Effacer"
            >
              ×
            </button>
          )}
        </div>

        {/* ── Filtres par catégorie ──────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-gray-800 text-white'
                : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t.all}
          </button>
          {categories.map(cat => {
            const c = CATEGORY_COLORS[cat.id] ?? CATEGORY_COLORS['6'];
            const active = selectedCategory === cat.id;
            return (
              <button
                type="button"
                key={cat.id}
                onClick={() => setSelectedCategory(active ? 'all' : cat.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${active ? c.chipActive : c.chip}`}
              >
                {cat.id}. {lang === 'fr' ? cat.name : cat.nameEn}
              </button>
            );
          })}
        </div>

        {/* ── Compteur ───────────────────────────────────────────── */}
        {(searchTerm || selectedCategory !== 'all') && !loading && (
          <p className="text-xs text-gray-500">
            {filteredResults.length} {t.results}
            {searchTerm && <span> pour <em>"{searchTerm}"</em></span>}
          </p>
        )}

        {/* ── Résultats ──────────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 size={36} className="animate-spin text-blue-500" />
          </div>
        ) : groupedResults.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Search size={36} className="mx-auto mb-3 opacity-25" />
            <p className="text-sm">{t.noResults}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupedResults.map(group => {
              const c = CATEGORY_COLORS[group.catId] ?? CATEGORY_COLORS['6'];
              const isExpanded = expandedGroups[group.subId] !== false;
              const subName = lang === 'fr' ? group.subcategory.fr : group.subcategory.en;

              return (
                <div key={group.subId} className={`rounded-xl border ${c.border} overflow-hidden bg-white shadow-sm`}>
                  {/* En-tête de la sous-catégorie */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.subId)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 ${c.header} border-b ${c.border} text-left transition-opacity hover:opacity-80`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${c.badge} shrink-0`}>
                        {group.subId}
                      </span>
                      <span className={`font-semibold text-sm ${c.headerText} truncate`}>{subName}</span>
                      <span className={`text-xs opacity-50 ${c.headerText} shrink-0`}>
                        ({group.items.length})
                      </span>
                    </div>
                    <ChevronDown
                      size={15}
                      className={`${c.headerText} opacity-60 transition-transform shrink-0 ml-2 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Lignes de résultats */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                      >
                        <div className={`divide-y ${c.border}`}>
                          {group.items.map(item => (
                            <div key={item.id} className={`px-4 py-2.5 ${c.bg}`}>
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-800 leading-snug">{item.product}</p>
                                  {item.notes && (
                                    <p className="text-xs text-gray-400 mt-0.5 italic leading-snug">{item.notes}</p>
                                  )}
                                </div>
                                <div className="shrink-0 text-right">
                                  <span className="text-sm font-bold text-gray-900 whitespace-nowrap">{item.limit}</span>
                                  <p className="text-xs text-gray-400 mt-0.5">{item.code}</p>
                                </div>
                              </div>
                            </div>
                          ))}
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
    </div>
  );
}

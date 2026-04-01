import reglementData from '../../reglement_2023_915_data.json';

export interface ContaminantLimit {
  id: string;
  contaminant: { fr: string; en: string };
  product: string;
  limit: string;
  category: { fr: string; en: string };
  subcategory: { fr: string; en: string };
  code: string;
  notes: string;
  lastUpdated: string;
}

export interface Category {
  id: string;
  name: string;
  nameEn: string;
}

export interface Subcategory {
  id: string;
  name: string;
  nameEn: string;
  categoryId: string;
}

const categoryMap: Record<string, Category> = {
  '1': { id: '1', name: 'Mycotoxines', nameEn: 'Mycotoxins' },
  '2': { id: '2', name: 'Toxines végétales', nameEn: 'Plant toxins' },
  '3': { id: '3', name: 'Métaux et autres éléments', nameEn: 'Metals and other elements' },
  '4': { id: '4', name: 'Polluants organiques persistants halogénés', nameEn: 'Halogenated persistent organic pollutants' },
  '5': { id: '5', name: 'Contaminants liés aux procédés de transformation', nameEn: 'Process-related contaminants' },
  '6': { id: '6', name: 'Autres contaminants', nameEn: 'Other contaminants' },
};

const getSubcategoryName = (sub: { name?: string; nameEn?: string }): { fr: string; en: string } => {
  return { fr: sub.name || '', en: sub.nameEn || '' };
};

const parseLimit = (limitData: any): string => {
  if (typeof limitData === 'string') return limitData;
  if (limitData?.limit) return limitData.limit;
  if (limitData?.limitB1) {
    const parts = [];
    if (limitData.limitB1 !== '-' && limitData.limitB1) parts.push(`B1: ${limitData.limitB1}`);
    if (limitData.limitSum && limitData.limitSum !== '-') parts.push(` Somme: ${limitData.limitSum}`);
    if (limitData.limitM1 && limitData.limitM1 !== '-') parts.push(` M1: ${limitData.limitM1}`);
    return parts.join(', ') || '-';
  }
  if (limitData?.limitAtropine) {
    return `Atropine: ${limitData.limitAtropine}, Scopolamine: ${limitData.limitScopolamine}`;
  }
  if (limitData?.limitDioxines) {
    return `Dioxines: ${limitData.limitDioxines}, Somme: ${limitData.limitDioxinesPCB}, PCB: ${limitData.limitPCB}`;
  }
  if (limitData?.limitPFOS) {
    return `PFOS: ${limitData.limitPFOS}, PFOA: ${limitData.limitPFOA}, PFNA: ${limitData.limitPFNA}`;
  }
  if (limitData?.limitBaP) {
    return `BaP: ${limitData.limitBaP}, Somme HAP: ${limitData.limitSumHAP}`;
  }
  return '-';
};

const flattenContaminants = (): ContaminantLimit[] => {
  const results: ContaminantLimit[] = [];
  const regulation = reglementData.regulation;
  
  for (const category of reglementData.categories) {
    const categoryInfo = categoryMap[category.id] || { id: category.id, name: category.name, nameEn: category.nameEn };
    
    if (category.subcategories) {
      for (const subcategory of category.subcategories) {
        if (subcategory.limits && subcategory.limits.length > 0) {
          for (const limitEntry of subcategory.limits) {
            results.push({
              id: limitEntry.code || `${subcategory.id}_${results.length}`,
              contaminant: getSubcategoryName(subcategory),
              product: limitEntry.product || '-',
              limit: parseLimit(limitEntry),
              category: { fr: categoryInfo.name, en: categoryInfo.nameEn },
              subcategory: getSubcategoryName(subcategory),
              code: limitEntry.code || '',
              notes: limitEntry.notes || '',
              lastUpdated: regulation.lastUpdated || '2023-04-25',
            });
          }
        }
      }
    }
  }
  
  return results;
};

export const fetchContaminantLimits = async (): Promise<ContaminantLimit[]> => {
  return flattenContaminants();
};

export const getCategories = async (): Promise<Category[]> => {
  return Object.values(categoryMap);
};

export const searchContaminants = async (query: string): Promise<ContaminantLimit[]> => {
  const allLimits = flattenContaminants();
  const lowerQuery = query.toLowerCase();
  
  return allLimits.filter(item => 
    item.product.toLowerCase().includes(lowerQuery) ||
    item.contaminant.fr.toLowerCase().includes(lowerQuery) ||
    item.contaminant.en.toLowerCase().includes(lowerQuery) ||
    item.category.fr.toLowerCase().includes(lowerQuery) ||
    item.code.toLowerCase().includes(lowerQuery)
  );
};

export const getRegulationInfo = () => {
  return {
    id: reglementData.regulation.id,
    title: reglementData.regulation.title,
    officialJournal: reglementData.regulation.officialJournal,
    date: reglementData.regulation.date,
    effectiveDate: reglementData.regulation.effectiveDate,
    abrogates: reglementData.regulation.abrogates,
    lastUpdated: reglementData.regulation.lastUpdated,
    sourceUrl: reglementData.regulation.sourceUrl,
  };
};

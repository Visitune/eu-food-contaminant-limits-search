export interface RegulationUpdate {
  hasUpdate: boolean;
  latestVersion?: string;
  latestDate?: string;
  changes?: string;
  sourceUrl: string;
}

export const checkRegulationUpdates = async (): Promise<RegulationUpdate> => {
  const currentRegulationId = 'UE-2023-915';
  const eurlexBaseUrl = 'https://eur-lex.europa.eu';
  
  try {
    const response = await fetch(
      `${eurlexBaseUrl}/api/search?type=REGULATION&number=2023/915&lang=fr`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      return {
        hasUpdate: false,
        sourceUrl: `${eurlexBaseUrl}/legal-content/FR/TXT/?uri=CELEX:${currentRegulationId}`,
      };
    }
    
    const data = await response.json();
    
    const latestDate = data.date || data.primaryCreationDate;
    const currentDate = '2023-04-25';
    
    const hasUpdate = latestDate && latestDate > currentDate;
    
    return {
      hasUpdate,
      latestVersion: data.version || '2023/915',
      latestDate: latestDate,
      sourceUrl: `${eurlexBaseUrl}/legal-content/FR/TXT/?uri=CELEX:${currentRegulationId}`,
    };
  } catch (error) {
    console.error('Error checking regulation updates:', error);
    return {
      hasUpdate: false,
      sourceUrl: `${eurlexBaseUrl}/legal-content/FR/TXT/?uri=CELEX:${currentRegulationId}`,
    };
  }
};

export const getLatestRegulationUrl = (): string => {
  return 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32023R0915';
};

export const getRegulationHistoryUrl = (): string => {
  return 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32023R0915&q=transpositions';
};

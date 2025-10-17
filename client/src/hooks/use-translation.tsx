import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiRequest } from '@/lib/queryClient';

export interface Translation {
  id: number;
  keyId: number;
  languageId: number;
  value: string;
  key?: string;
}

export interface TranslationKey {
  id: number;
  key: string;
  namespaceId: number;
  description?: string;
}

export interface Language {
  id: number;
  name: string;
  nativeName: string;
  code: string;
  isActive: boolean | null;
  isDefault: boolean | null;
  direction: string | null;
  flagIcon?: string | null;
}

export interface TranslationContextType {
  currentLanguage: Language | null;
  languages: Language[];
  translations: Record<string, string>;
  isLoading: boolean;
  t: (key: string, fallback?: string, variables?: Record<string, any>) => string;
  changeLanguage: (languageCode: string) => Promise<void>;
  refreshTranslations: () => Promise<void>;
}

const TranslationContext = createContext<TranslationContextType | null>(null);

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState<Language | null>(null);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  const getStoredLanguage = (): string => {
    return localStorage.getItem('preferred-language') || 'en';
  };

  const storeLanguage = (languageCode: string) => {
    localStorage.setItem('preferred-language', languageCode);
  };

  const fetchLanguages = async (): Promise<Language[]> => {
    try {
      const res = await apiRequest('GET', '/api/languages');
      if (!res.ok) {
        console.error('Failed to fetch languages, status:', res.status);
        throw new Error('Failed to fetch languages');
      }
      const data = await res.json();
      return data;
    } catch (error) {
      console.error('Error fetching languages:', error);
      return [];
    }
  };

  const fetchTranslations = async (languageCode: string): Promise<Record<string, string>> => {
    try {
      const res = await apiRequest('GET', `/api/translations/language/${languageCode}`);
      if (!res.ok) throw new Error('Failed to fetch translations');
      const data = await res.json();

      const translationMap: Record<string, string> = {};

      for (const namespaceName in data) {
        const namespaceTranslations = data[namespaceName];
        for (const key in namespaceTranslations) {
          const fullKey = `${namespaceName}.${key}`;
          translationMap[fullKey] = namespaceTranslations[key];
        }
      }

      return translationMap;
    } catch (error) {
      console.error('Error fetching translations:', error);
      return {};
    }
  };

  const t = (key: string, fallback?: string, variables?: Record<string, any>): string => {
    let translation = translations[key] || fallback || key;

    if (variables) {
      Object.entries(variables).forEach(([varKey, varValue]) => {
        const placeholder = `{{${varKey}}}`;
        translation = translation.replace(new RegExp(placeholder, 'g'), String(varValue));
      });
    }

    return translation;
  };

  const changeLanguageWithLanguages = async (languageCode: string, availableLanguages: Language[]): Promise<void> => {
    setIsLoading(true);
    try {
      const newTranslations = await fetchTranslations(languageCode);

      const language = availableLanguages.find(lang => lang.code === languageCode);

      if (language) {
        setCurrentLanguage(language);
        setTranslations(newTranslations);
        storeLanguage(languageCode);



        const isOnAuthPage = window.location.pathname === '/auth' || 
                            window.location.pathname === '/login' || 
                            window.location.pathname === '/register';
        
        if (!isOnAuthPage) {
          try {
            const testRes = await fetch('/api/user', {
              method: 'GET',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' }
            });

            if (testRes.ok) {
              await apiRequest('PUT', '/api/user/language', { languageCode });
            }
          } catch (err) {

          }
        }

        document.documentElement.lang = languageCode;
        document.documentElement.dir = language.direction || 'ltr';
      } else {
        console.error('Language not found in provided languages array');
      }
    } catch (error) {
      console.error('Error changing language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const changeLanguage = async (languageCode: string): Promise<void> => {
    setIsLoading(true);
    try {
      const newTranslations = await fetchTranslations(languageCode);

      const language = languages.find(lang => lang.code === languageCode);

      if (language) {
        setCurrentLanguage(language);
        setTranslations(newTranslations);
        storeLanguage(languageCode);



        const isOnAuthPage = window.location.pathname === '/auth' || 
                            window.location.pathname === '/login' || 
                            window.location.pathname === '/register';
        
        if (!isOnAuthPage) {
          try {
            const testRes = await fetch('/api/user', {
              method: 'GET',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' }
            });

            if (testRes.ok) {
              await apiRequest('PUT', '/api/user/language', { languageCode });
            }
          } catch (err) {

          }
        }

        document.documentElement.lang = languageCode;
        document.documentElement.dir = language.direction || 'ltr';
      } else {
        console.error('Language not found in languages array');
      }
    } catch (error) {
      console.error('Error changing language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshTranslations = async (): Promise<void> => {
    if (currentLanguage) {
      const newTranslations = await fetchTranslations(currentLanguage.code);
      setTranslations(newTranslations);
    }
  };

  useEffect(() => {
    const initializeTranslations = async () => {
      setIsLoading(true);

      try {
        const availableLanguages = await fetchLanguages();
        setLanguages(availableLanguages);

        if (availableLanguages.length > 0) {
          const storedLanguageCode = getStoredLanguage();
          const preferredLanguage =
            availableLanguages.find(lang => lang.code === storedLanguageCode) ||
            availableLanguages.find(lang => lang.isDefault === true) ||
            availableLanguages[0];

          if (preferredLanguage) {
            await changeLanguageWithLanguages(preferredLanguage.code, availableLanguages);
          }
        } else {
          
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error initializing translations:', error);
        setIsLoading(false);
      }
    };

    initializeTranslations();
  }, []);



  const value: TranslationContextType = {
    currentLanguage,
    languages,
    translations,
    isLoading,
    t,
    changeLanguage,
    refreshTranslations,
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation(): TranslationContextType {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}

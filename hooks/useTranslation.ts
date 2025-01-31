import { useCallback } from 'react';
import i18n from '../translations/i18n';

export const useTranslation = () => {
  const t = useCallback((key: string, options?: object) => {
    return i18n.t(key, options);
  }, []);

  return { t };
};
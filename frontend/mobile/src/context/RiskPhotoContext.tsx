import React, { createContext, useContext, useState, useCallback } from 'react';

type RiskPhoto = {
  title: string;
  uri: string;
};

type RiskPhotoContextType = {
  photos: RiskPhoto[];
  addPhoto: (title: string, uri: string) => void;
  getPhoto: (title: string) => string | undefined;
  clearPhotos: () => void;
};

const RiskPhotoContext = createContext<RiskPhotoContextType>({
  photos: [],
  addPhoto: () => {},
  getPhoto: () => undefined,
  clearPhotos: () => {},
});

export function RiskPhotoProvider({ children }: { children: React.ReactNode }) {
  const [photos, setPhotos] = useState<RiskPhoto[]>([]);

  const addPhoto = useCallback((title: string, uri: string) => {
    setPhotos(prev => {
      const filtered = prev.filter(p => p.title !== title);
      return [...filtered, { title, uri }];
    });
  }, []);

  const getPhoto = useCallback(
    (title: string) => photos.find(p => p.title === title)?.uri,
    [photos],
  );

  const clearPhotos = useCallback(() => setPhotos([]), []);

  return (
    <RiskPhotoContext.Provider value={{ photos, addPhoto, getPhoto, clearPhotos }}>
      {children}
    </RiskPhotoContext.Provider>
  );
}

export function useRiskPhotos() {
  return useContext(RiskPhotoContext);
}

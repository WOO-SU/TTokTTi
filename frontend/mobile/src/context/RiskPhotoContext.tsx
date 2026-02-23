import React, { createContext, useContext, useState, useCallback } from 'react';

type RiskPhoto = {
  title: string;
  uri: string;
};

type RiskPhotoContextType = {
  photos: RiskPhoto[];
  assessmentId: number | undefined;
  setAssessmentId: (id: number | undefined) => void;
  addPhoto: (title: string, uri: string) => void;
  getPhoto: (title: string) => string | undefined;
  clearPhotos: () => void;
};

const RiskPhotoContext = createContext<RiskPhotoContextType>({
  photos: [],
  assessmentId: undefined,
  setAssessmentId: () => { },
  addPhoto: () => { },
  getPhoto: () => undefined,
  clearPhotos: () => { },
});

export function RiskPhotoProvider({ children }: { children: React.ReactNode }) {
  const [photos, setPhotos] = useState<RiskPhoto[]>([]);
  const [assessmentId, setAssessmentId] = useState<number | undefined>(undefined);

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

  const clearPhotos = useCallback(() => {
    setPhotos([]);
    setAssessmentId(undefined);
  }, []);

  return (
    <RiskPhotoContext.Provider value={{ photos, assessmentId, setAssessmentId, addPhoto, getPhoto, clearPhotos }}>
      {children}
    </RiskPhotoContext.Provider>
  );
}

export function useRiskPhotos() {
  return useContext(RiskPhotoContext);
}

import React, { createContext, useState, useContext } from 'react';
import type { ReactNode } from 'react';

type WorkSessionContextType = {
    workSessionId: number | null;
    completedItems: string[];
    startSession: (id: number) => void;
    resumeSession: (id: number, items?: string[]) => void;
    markItemAsCompleted: (title: string) => void;
    endSession: () => void;
};

const WorkSessionContext = createContext<WorkSessionContextType | undefined>(
    undefined,
);

export function WorkSessionProvider({ children }: { children: ReactNode }) {
    const [workSessionId, setWorkSessionId] = useState<number | null>(null);
    const [completedItems, setCompletedItems] = useState<string[]>([]);

    const startSession = (id: number) => {
        setWorkSessionId(id);
        setCompletedItems([]);
    };

    const resumeSession = (id: number, items: string[] = []) => {
        setWorkSessionId(id);
        setCompletedItems(items);
    };

    const markItemAsCompleted = (title: string) => {
        setCompletedItems(prev => {
            if (prev.includes(title)) {
                return prev;
            }
            return [...prev, title];
        });
    };

    const endSession = () => {
        setWorkSessionId(null);
        setCompletedItems([]);
    };

    return (
        <WorkSessionContext.Provider
            value={{
                workSessionId,
                completedItems,
                startSession,
                resumeSession,
                markItemAsCompleted,
                endSession,
            }}>
            {children}
        </WorkSessionContext.Provider>
    );
}

export function useWorkSession() {
    const context = useContext(WorkSessionContext);
    if (context === undefined) {
        throw new Error('useWorkSession must be used within a WorkSessionProvider');
    }
    return context;
}

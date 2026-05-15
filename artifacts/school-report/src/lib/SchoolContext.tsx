import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useListSchools } from "@workspace/api-client-react";

interface SchoolContextType {
  activeSchoolId: number | null;
  setActiveSchoolId: (id: number | null) => void;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export function SchoolProvider({ children }: { children: ReactNode }) {
  const [activeSchoolId, setActiveSchoolId] = useState<number | null>(null);
  const { data: schools } = useListSchools();

  useEffect(() => {
    const saved = localStorage.getItem("activeSchoolId");
    if (saved) {
      setActiveSchoolId(Number(saved));
    } else if (schools && schools.length > 0 && !activeSchoolId) {
      setActiveSchoolId(schools[0].id);
      localStorage.setItem("activeSchoolId", schools[0].id.toString());
    }
  }, [schools, activeSchoolId]);

  const handleSetActiveSchoolId = (id: number | null) => {
    setActiveSchoolId(id);
    if (id) {
      localStorage.setItem("activeSchoolId", id.toString());
    } else {
      localStorage.removeItem("activeSchoolId");
    }
  };

  return (
    <SchoolContext.Provider value={{ activeSchoolId, setActiveSchoolId: handleSetActiveSchoolId }}>
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchool() {
  const context = useContext(SchoolContext);
  if (context === undefined) {
    throw new Error("useSchool must be used within a SchoolProvider");
  }
  return context;
}

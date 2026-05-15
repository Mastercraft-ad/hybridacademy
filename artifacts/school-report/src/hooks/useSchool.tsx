import React, { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface School {
  id: number;
  name: string;
  address: string;
  motto: string;
  logoUrl: string | null;
}

interface SchoolContextValue {
  school: School | null;
  schools: School[];
  setSchoolId: (id: number) => void;
  loading: boolean;
}

const SchoolContext = createContext<SchoolContextValue>({
  school: null,
  schools: [],
  setSchoolId: () => {},
  loading: true,
});

export function SchoolProvider({ children }: { children: React.ReactNode }) {
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolId, setSchoolId] = useState<number | null>(() => {
    const saved = localStorage.getItem("selectedSchoolId");
    return saved ? Number(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<School[]>("/schools")
      .then((data) => {
        setSchools(data);
        if (!schoolId && data.length > 0) {
          setSchoolId(data[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSetSchoolId = (id: number) => {
    setSchoolId(id);
    localStorage.setItem("selectedSchoolId", String(id));
  };

  const school = schools.find((s) => s.id === schoolId) ?? null;

  return (
    <SchoolContext.Provider value={{ school, schools, setSchoolId: handleSetSchoolId, loading }}>
      {children}
    </SchoolContext.Provider>
  );
}

export const useSchool = () => useContext(SchoolContext);

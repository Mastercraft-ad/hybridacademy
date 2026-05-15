import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useSchool } from "@/hooks/useSchool";
import { useState } from "react";
import { Users, BookOpen, GraduationCap, TrendingUp, Award, BarChart3 } from "lucide-react";

interface Term {
  id: number;
  session: string;
  term: number;
}

interface DashboardSummary {
  totalStudents: number;
  totalClasses: number;
  totalSubjects: number;
  passRate: number;
  schoolAverage: number;
  classAverages: { classId: number; className: string; average: number; studentCount: number }[];
}

interface TopStudent {
  studentId: number;
  studentName: string;
  admissionNo: string;
  className: string;
  average: number;
  position: number;
}

export default function Dashboard() {
  const { school } = useSchool();
  const [termId, setTermId] = useState<number | null>(null);

  const { data: terms = [] } = useQuery<Term[]>({
    queryKey: ["terms", school?.id],
    queryFn: () => apiFetch(`/schools/${school!.id}/terms`),
    enabled: !!school,
  });

  const selectedTermId = termId ?? terms[terms.length - 1]?.id;

  const { data: summary } = useQuery<DashboardSummary>({
    queryKey: ["dashboard-summary", school?.id, selectedTermId],
    queryFn: () => apiFetch(`/dashboard/summary?schoolId=${school!.id}&termId=${selectedTermId}`),
    enabled: !!school && !!selectedTermId,
  });

  const { data: topStudents = [] } = useQuery<TopStudent[]>({
    queryKey: ["top-students", selectedTermId],
    queryFn: () => apiFetch(`/dashboard/top-students?termId=${selectedTermId}&limit=5`),
    enabled: !!selectedTermId,
  });

  if (!school) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">No school selected. Go to Schools to add one.</p>
      </div>
    );
  }

  const statCards = [
    { label: "Total Students", value: summary?.totalStudents ?? "—", icon: Users, color: "bg-blue-500" },
    { label: "Total Classes", value: summary?.totalClasses ?? "—", icon: GraduationCap, color: "bg-purple-500" },
    { label: "Total Subjects", value: summary?.totalSubjects ?? "—", icon: BookOpen, color: "bg-orange-500" },
    { label: "School Average", value: summary ? `${summary.schoolAverage}%` : "—", icon: BarChart3, color: "bg-green-600" },
    { label: "Pass Rate", value: summary ? `${summary.passRate}%` : "—", icon: TrendingUp, color: "bg-teal-500" },
    { label: "Classes", value: summary?.totalClasses ?? "—", icon: Award, color: "bg-pink-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">{school.name} — {school.address}</p>
        </div>
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          value={selectedTermId ?? ""}
          onChange={(e) => setTermId(Number(e.target.value))}
        >
          {terms.map((t) => (
            <option key={t.id} value={t.id}>
              {t.session} — Term {t.term}
            </option>
          ))}
        </select>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.slice(0, 5).map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
              <div className={`${card.color} w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-xs text-gray-500">{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class averages */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Class Performance</h2>
          {summary?.classAverages.length ? (
            <div className="space-y-3">
              {summary.classAverages.map((c) => (
                <div key={c.classId}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{c.className}</span>
                    <span className="font-medium text-gray-900">{c.average}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(c.average, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{c.studentCount} students</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No data yet. Generate report cards first.</p>
          )}
        </div>

        {/* Top students */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Top Students</h2>
          {topStudents.length ? (
            <div className="space-y-3">
              {topStudents.map((s, i) => (
                <div key={s.studentId} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    i === 0 ? "bg-yellow-400 text-yellow-900" :
                    i === 1 ? "bg-gray-300 text-gray-700" :
                    i === 2 ? "bg-orange-300 text-orange-800" :
                    "bg-gray-100 text-gray-500"
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.studentName}</p>
                    <p className="text-xs text-gray-400">{s.className} · {s.admissionNo}</p>
                  </div>
                  <span className="text-sm font-bold text-green-700">{s.average}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No report cards generated yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useSchool } from "@/hooks/useSchool";
import { useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";

interface Term { id: number; session: string; term: number; startDate: string | null; endDate: string | null; nextTermBegins: string | null; }
interface GradeConfig { id: number; minScore: number; maxScore: number; grade: string; remark: string; }
interface Trait { id: number; name: string; displayOrder: number; }

interface TermForm { session: string; term: string; startDate: string; endDate: string; nextTermBegins: string; }
interface GradeForm { minScore: string; maxScore: string; grade: string; remark: string; }
interface TraitForm { name: string; }

const emptyTerm: TermForm = { session: "", term: "1", startDate: "", endDate: "", nextTermBegins: "" };
const emptyGrade: GradeForm = { minScore: "", maxScore: "", grade: "", remark: "" };
const emptyTrait: TraitForm = { name: "" };

export default function Settings() {
  const qc = useQueryClient();
  const { school } = useSchool();

  const [termForm, setTermForm] = useState<TermForm>(emptyTerm);
  const [gradeForm, setGradeForm] = useState<GradeForm>(emptyGrade);
  const [traitForm, setTraitForm] = useState<TraitForm>(emptyTrait);

  const { data: terms = [] } = useQuery<Term[]>({
    queryKey: ["terms", school?.id],
    queryFn: () => apiFetch(`/schools/${school!.id}/terms`),
    enabled: !!school,
  });
  const { data: gradeConfigs = [] } = useQuery<GradeConfig[]>({
    queryKey: ["grading", school?.id],
    queryFn: () => apiFetch(`/schools/${school!.id}/grading`),
    enabled: !!school,
  });
  const { data: traits = [] } = useQuery<Trait[]>({
    queryKey: ["traits", school?.id],
    queryFn: () => apiFetch(`/schools/${school!.id}/traits`),
    enabled: !!school,
  });

  const createTermMutation = useMutation({
    mutationFn: (data: any) => apiFetch(`/schools/${school!.id}/terms`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["terms"] }); setTermForm(emptyTerm); },
  });
  const deleteTermMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/terms/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["terms"] }),
  });
  const createGradeMutation = useMutation({
    mutationFn: (data: any) => apiFetch(`/schools/${school!.id}/grading`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grading"] }); setGradeForm(emptyGrade); },
  });
  const deleteGradeMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/grading/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["grading"] }),
  });
  const createTraitMutation = useMutation({
    mutationFn: (data: any) => apiFetch(`/schools/${school!.id}/traits`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["traits"] }); setTraitForm(emptyTrait); },
  });
  const deleteTraitMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/traits/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["traits"] }),
  });

  if (!school) return <div className="text-gray-400 text-center py-16">Select a school first.</div>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Academic Terms */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-bold text-gray-900 mb-4">Academic Terms</h2>
        <div className="grid grid-cols-5 gap-3 mb-4">
          <input placeholder="Session (e.g. 2025/2026)" value={termForm.session} onChange={(e) => setTermForm({ ...termForm, session: e.target.value })}
            className="col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          <select value={termForm.term} onChange={(e) => setTermForm({ ...termForm, term: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="1">Term 1</option><option value="2">Term 2</option><option value="3">Term 3</option>
          </select>
          <input type="date" placeholder="Start" value={termForm.startDate} onChange={(e) => setTermForm({ ...termForm, startDate: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          <button onClick={() => termForm.session && createTermMutation.mutate({ session: termForm.session, term: Number(termForm.term), startDate: termForm.startDate || null, endDate: termForm.endDate || null, nextTermBegins: termForm.nextTermBegins || null })}
            className="flex items-center justify-center gap-1 bg-green-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-800">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
        <div className="space-y-2">
          {terms.map((t) => (
            <div key={t.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
              <span className="text-sm font-medium">{t.session} — Term {t.term}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{t.startDate ?? "No dates set"}</span>
                <button onClick={() => { if (confirm("Delete this term?")) deleteTermMutation.mutate(t.id); }} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          {terms.length === 0 && <p className="text-gray-400 text-sm">No terms yet.</p>}
        </div>
      </section>

      {/* Grading scale */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-bold text-gray-900 mb-1">Grading Scale (Nigerian WAEC)</h2>
        <p className="text-xs text-gray-400 mb-4">Scores are out of 100 (Test 40% + Exam 60%)</p>
        <div className="grid grid-cols-5 gap-3 mb-4">
          <input type="number" placeholder="Min" value={gradeForm.minScore} onChange={(e) => setGradeForm({ ...gradeForm, minScore: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          <input type="number" placeholder="Max" value={gradeForm.maxScore} onChange={(e) => setGradeForm({ ...gradeForm, maxScore: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          <input placeholder="Grade (A1, B2...)" value={gradeForm.grade} onChange={(e) => setGradeForm({ ...gradeForm, grade: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          <input placeholder="Remark" value={gradeForm.remark} onChange={(e) => setGradeForm({ ...gradeForm, remark: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          <button onClick={() => gradeForm.grade && createGradeMutation.mutate({ minScore: Number(gradeForm.minScore), maxScore: Number(gradeForm.maxScore), grade: gradeForm.grade, remark: gradeForm.remark })}
            className="flex items-center justify-center gap-1 bg-green-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-800">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
        <div className="overflow-hidden rounded-lg border border-gray-100">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50">
              <th className="text-left px-4 py-2 font-medium text-gray-600">Min</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Max</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Grade</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Remark</th>
              <th className="px-4 py-2"></th>
            </tr></thead>
            <tbody>
              {[...gradeConfigs].sort((a, b) => b.minScore - a.minScore).map((g) => (
                <tr key={g.id} className="border-t border-gray-50">
                  <td className="px-4 py-2">{g.minScore}</td>
                  <td className="px-4 py-2">{g.maxScore}</td>
                  <td className="px-4 py-2 font-bold text-green-700">{g.grade}</td>
                  <td className="px-4 py-2 text-gray-500">{g.remark}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => deleteGradeMutation.mutate(g.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {gradeConfigs.length === 0 && <tr><td colSpan={5} className="text-center text-gray-400 py-6">No grades configured.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* Psychomotor traits */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-bold text-gray-900 mb-4">Psychomotor Traits</h2>
        <div className="flex gap-3 mb-4">
          <input placeholder="Trait name (e.g. Punctuality)" value={traitForm.name} onChange={(e) => setTraitForm({ name: e.target.value })}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          <button onClick={() => traitForm.name && createTraitMutation.mutate({ name: traitForm.name, displayOrder: traits.length })}
            className="flex items-center gap-1 bg-green-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-800">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {traits.map((t) => (
            <div key={t.id} className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-3 py-1.5 text-sm text-green-800">
              {t.name}
              <button onClick={() => deleteTraitMutation.mutate(t.id)} className="text-green-500 hover:text-red-600 ml-1"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
          {traits.length === 0 && <p className="text-gray-400 text-sm">No traits defined.</p>}
        </div>
      </section>
    </div>
  );
}

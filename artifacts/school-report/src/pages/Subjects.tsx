import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useSchool } from "@/hooks/useSchool";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Subject { id: number; schoolId: number; name: string; code: string | null; }
interface FormData { name: string; code: string; }
const empty: FormData = { name: "", code: "" };

export default function Subjects() {
  const qc = useQueryClient();
  const { school } = useSchool();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState<FormData>(empty);

  const { data: subjects = [], isLoading } = useQuery<Subject[]>({
    queryKey: ["subjects", school?.id],
    queryFn: () => apiFetch(`/schools/${school!.id}/subjects`),
    enabled: !!school,
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => apiFetch(`/schools/${school!.id}/subjects`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subjects"] }); closeForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<FormData> }) => apiFetch(`/subjects/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subjects"] }); closeForm(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/subjects/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subjects"] }),
  });

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(empty); };
  const openCreate = () => { setEditing(null); setForm(empty); setShowForm(true); };
  const openEdit = (s: Subject) => { setEditing(s); setForm({ name: s.name, code: s.code ?? "" }); setShowForm(true); };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  if (!school) return <div className="text-gray-400 text-center py-16">Select a school first.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Subjects</h1>
        <button onClick={openCreate} className="flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-800 transition">
          <Plus className="w-4 h-4" /> Add Subject
        </button>
      </div>

      {isLoading ? <div className="text-gray-400">Loading...</div> : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-medium text-gray-600">#</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Subject Name</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Code</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s, i) => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-5 py-3 font-medium text-gray-900">{s.name}</td>
                  <td className="px-5 py-3"><span className="bg-green-50 text-green-700 px-2 py-0.5 rounded text-xs font-mono">{s.code ?? "—"}</span></td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded mr-1"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => { if (confirm("Delete this subject?")) deleteMutation.mutate(s.id); }} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {subjects.length === 0 && <tr><td colSpan={4} className="text-center text-gray-400 py-10">No subjects yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{editing ? "Edit Subject" : "Add Subject"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mathematics"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Code</label>
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. MTH, ENG"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeForm} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 bg-green-700 text-white py-2 rounded-lg text-sm hover:bg-green-800">{editing ? "Save" : "Add Subject"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

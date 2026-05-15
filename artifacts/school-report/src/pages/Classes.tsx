import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useSchool } from "@/hooks/useSchool";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface ClassData { id: number; schoolId: number; name: string; section: string | null; }
interface FormData { name: string; section: string; }
const empty: FormData = { name: "", section: "" };

export default function Classes() {
  const qc = useQueryClient();
  const { school } = useSchool();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ClassData | null>(null);
  const [form, setForm] = useState<FormData>(empty);

  const { data: classes = [], isLoading } = useQuery<ClassData[]>({
    queryKey: ["classes", school?.id],
    queryFn: () => apiFetch(`/schools/${school!.id}/classes`),
    enabled: !!school,
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => apiFetch(`/schools/${school!.id}/classes`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["classes"] }); closeForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<FormData> }) =>
      apiFetch(`/classes/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["classes"] }); closeForm(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/classes/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["classes"] }),
  });

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(empty); };
  const openCreate = () => { setEditing(null); setForm(empty); setShowForm(true); };
  const openEdit = (c: ClassData) => { setEditing(c); setForm({ name: c.name, section: c.section ?? "" }); setShowForm(true); };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  if (!school) return <div className="text-gray-400 text-center py-16">Select a school first.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
        <button onClick={openCreate} className="flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-800 transition">
          <Plus className="w-4 h-4" /> Add Class
        </button>
      </div>

      {isLoading ? <div className="text-gray-400">Loading...</div> : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-medium text-gray-600">Class Name</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Section</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-5 py-3 text-gray-500">{c.section ?? "—"}</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded mr-1"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => { if (confirm("Delete this class?")) deleteMutation.mutate(c.id); }} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {classes.length === 0 && <tr><td colSpan={3} className="text-center text-gray-400 py-10">No classes yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{editing ? "Edit Class" : "Add Class"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. JSS 1, SSS 3"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                <input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="e.g. A, B, Gold"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeForm} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 bg-green-700 text-white py-2 rounded-lg text-sm hover:bg-green-800">{editing ? "Save" : "Add Class"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

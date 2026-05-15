import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useSchool } from "@/hooks/useSchool";
import { useState } from "react";
import { Plus, Pencil, Trash2, School } from "lucide-react";

interface SchoolData {
  id: number;
  name: string;
  address: string;
  motto: string;
  logoUrl: string | null;
}

interface FormData {
  name: string;
  address: string;
  motto: string;
}

const empty: FormData = { name: "", address: "", motto: "" };

export default function Schools() {
  const qc = useQueryClient();
  const { setSchoolId } = useSchool();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SchoolData | null>(null);
  const [form, setForm] = useState<FormData>(empty);

  const { data: schools = [], isLoading } = useQuery<SchoolData[]>({
    queryKey: ["schools"],
    queryFn: () => apiFetch("/schools"),
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => apiFetch("/schools", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["schools"] }); closeForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<FormData> }) =>
      apiFetch(`/schools/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["schools"] }); closeForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/schools/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schools"] }),
  });

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(empty); };

  const openCreate = () => { setEditing(null); setForm(empty); setShowForm(true); };
  const openEdit = (s: SchoolData) => { setEditing(s); setForm({ name: s.name, address: s.address, motto: s.motto }); setShowForm(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Schools</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-800 transition"
        >
          <Plus className="w-4 h-4" /> Add School
        </button>
      </div>

      {isLoading ? (
        <div className="text-gray-400">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schools.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <School className="w-6 h-6 text-green-700" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-gray-900 truncate">{s.name}</h2>
                <p className="text-sm text-gray-500 truncate">{s.address}</p>
                <p className="text-xs text-green-700 italic mt-1">{s.motto}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setSchoolId(s.id)}
                  className="text-xs bg-green-700 text-white px-2 py-1 rounded hover:bg-green-800"
                >
                  Select
                </button>
                <button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { if (confirm("Delete this school?")) deleteMutation.mutate(s.id); }}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {schools.length === 0 && (
            <p className="text-gray-400 col-span-2 text-center py-10">No schools yet. Add one to get started.</p>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{editing ? "Edit School" : "Add School"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">School Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                <input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motto *</label>
                <input required value={form.motto} onChange={(e) => setForm({ ...form, motto: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeForm} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 bg-green-700 text-white py-2 rounded-lg text-sm hover:bg-green-800">
                  {editing ? "Save Changes" : "Add School"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

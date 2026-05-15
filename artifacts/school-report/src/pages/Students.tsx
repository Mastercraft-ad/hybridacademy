import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useSchool } from "@/hooks/useSchool";
import { useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

interface ClassData { id: number; name: string; }
interface Student {
  id: number; schoolId: number; classId: number; name: string;
  admissionNo: string; gender: string | null; dateOfBirth: string | null; className: string | null;
}
interface FormData { classId: string; name: string; admissionNo: string; gender: string; dateOfBirth: string; }
const empty: FormData = { classId: "", name: "", admissionNo: "", gender: "", dateOfBirth: "" };

export default function Students() {
  const qc = useQueryClient();
  const { school } = useSchool();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState<FormData>(empty);
  const [filterClass, setFilterClass] = useState<number | "">("");
  const [search, setSearch] = useState("");

  const { data: classes = [] } = useQuery<ClassData[]>({
    queryKey: ["classes", school?.id],
    queryFn: () => apiFetch(`/schools/${school!.id}/classes`),
    enabled: !!school,
  });

  const classQuery = filterClass ? `&classId=${filterClass}` : "";
  const { data: students = [], isLoading } = useQuery<Student[]>({
    queryKey: ["students", school?.id, filterClass],
    queryFn: () => apiFetch(`/schools/${school!.id}/students?${classQuery}`),
    enabled: !!school,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiFetch(`/schools/${school!.id}/students`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["students"] }); closeForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiFetch(`/students/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["students"] }); closeForm(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/students/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["students"] }),
  });

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(empty); };
  const openCreate = () => { setEditing(null); setForm(empty); setShowForm(true); };
  const openEdit = (s: Student) => {
    setEditing(s);
    setForm({ classId: String(s.classId), name: s.name, admissionNo: s.admissionNo, gender: s.gender ?? "", dateOfBirth: s.dateOfBirth ?? "" });
    setShowForm(true);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...form, classId: Number(form.classId) };
    if (editing) updateMutation.mutate({ id: editing.id, data });
    else createMutation.mutate(data);
  };

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.admissionNo.toLowerCase().includes(search.toLowerCase())
  );

  if (!school) return <div className="text-gray-400 text-center py-16">Select a school first.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Students</h1>
        <button onClick={openCreate} className="flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-800 transition">
          <Plus className="w-4 h-4" /> Add Student
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or admission no..."
            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <select value={filterClass} onChange={(e) => setFilterClass(e.target.value ? Number(e.target.value) : "")}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="">All Classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {isLoading ? <div className="text-gray-400">Loading...</div> : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Admission No</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Class</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Gender</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div>{s.name}</div>
                    <div className="text-xs text-gray-400 sm:hidden">{s.admissionNo}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{s.admissionNo}</td>
                  <td className="px-4 py-3 text-gray-500">{s.className ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{s.gender ?? "—"}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded mr-1"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => { if (confirm("Delete this student?")) deleteMutation.mutate(s.id); }} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={5} className="text-center text-gray-400 py-10">No students found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{editing ? "Edit Student" : "Add Student"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class *</label>
                <select required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">Select class...</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admission No *</label>
                <input required value={form.admissionNo} onChange={(e) => setForm({ ...form, admissionNo: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">Select...</option>
                    <option>Male</option><option>Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeForm} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 bg-green-700 text-white py-2 rounded-lg text-sm hover:bg-green-800">{editing ? "Save" : "Add Student"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

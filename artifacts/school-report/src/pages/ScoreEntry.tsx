import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiFetchRaw } from "@/lib/api";
import { useSchool } from "@/hooks/useSchool";
import { useState, useEffect, useRef } from "react";
import { Save, RefreshCw, Upload, X, CheckCircle, AlertCircle, FileSpreadsheet } from "lucide-react";

interface ClassData { id: number; name: string; }
interface Term { id: number; session: string; term: number; }
interface Subject { id: number; name: string; code: string | null; }
interface Student { id: number; name: string; admissionNo: string; }
interface Score { studentId: number; subjectId: number; testScore: number; examScore: number; total: number; grade: string; remark: string; }
type ScoreKey = `${number}-${number}`;
type ScoreMap = Record<ScoreKey, { testScore: string; examScore: string }>;

interface ImportResult { imported: number; skipped: number; total: number; errors: { row: number; reason: string }[]; }

export default function ScoreEntry() {
  const qc = useQueryClient();
  const { school } = useSchool();
  const [classId, setClassId] = useState<number | "">("");
  const [termId, setTermId] = useState<number | "">("");
  const [scores, setScores] = useState<ScoreMap>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [importTermId, setImportTermId] = useState<number | "">("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: classes = [] } = useQuery<ClassData[]>({
    queryKey: ["classes", school?.id],
    queryFn: () => apiFetch(`/schools/${school!.id}/classes`),
    enabled: !!school,
  });
  const { data: terms = [] } = useQuery<Term[]>({
    queryKey: ["terms", school?.id],
    queryFn: () => apiFetch(`/schools/${school!.id}/terms`),
    enabled: !!school,
  });
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["subjects", school?.id],
    queryFn: () => apiFetch(`/schools/${school!.id}/subjects`),
    enabled: !!school,
  });
  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ["students", school?.id, classId],
    queryFn: () => apiFetch(`/schools/${school!.id}/students?classId=${classId}`),
    enabled: !!school && !!classId,
  });
  const { data: existingScores } = useQuery<Score[]>({
    queryKey: ["scores", termId, classId],
    queryFn: () => apiFetch(`/scores?termId=${termId}&classId=${classId}`),
    enabled: !!termId && !!classId,
  });

  useEffect(() => {
    if (!existingScores) return;
    const map: ScoreMap = {};
    existingScores.forEach((s) => {
      map[`${s.studentId}-${s.subjectId}`] = {
        testScore: String(s.testScore),
        examScore: String(s.examScore),
      };
    });
    setScores(map);
  }, [existingScores]);

  const handleChange = (studentId: number, subjectId: number, field: "testScore" | "examScore", val: string) => {
    const key: ScoreKey = `${studentId}-${subjectId}`;
    setScores((prev) => ({ ...prev, [key]: { ...prev[key] ?? { testScore: "0", examScore: "0" }, [field]: val } }));
  };

  const handleSave = async () => {
    if (!termId || !classId) return;
    setSaving(true);
    try {
      const scoreList = students.flatMap((student) =>
        subjects.map((subject) => {
          const key: ScoreKey = `${student.id}-${subject.id}`;
          const entry = scores[key] ?? { testScore: "0", examScore: "0" };
          return {
            studentId: student.id,
            subjectId: subject.id,
            termId: Number(termId),
            testScore: Number(entry.testScore) || 0,
            examScore: Number(entry.examScore) || 0,
          };
        })
      );
      await apiFetch("/scores/bulk", { method: "POST", body: JSON.stringify({ scores: scoreList }) });
      qc.invalidateQueries({ queryKey: ["scores"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const openImport = () => {
    setImportTermId(termId || "");
    setImportFile(null);
    setImportResult(null);
    setShowImport(true);
  };

  const handleImport = async () => {
    if (!importFile || !importTermId || !school) return;
    setImporting(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append("file", importFile);
      const res = await apiFetchRaw(`/schools/${school.id}/import/scores?termId=${importTermId}`, {
        method: "POST",
        body: fd,
      });
      const data: ImportResult = await res.json();
      if (!res.ok) { setImportResult({ imported: 0, skipped: 0, total: 0, errors: [{ row: 0, reason: (data as any).error ?? "Import failed" }] }); return; }
      setImportResult(data);
      qc.invalidateQueries({ queryKey: ["scores"] });
      qc.invalidateQueries({ queryKey: ["subjects"] });
    } catch (e: any) {
      setImportResult({ imported: 0, skipped: 0, total: 0, errors: [{ row: 0, reason: e.message }] });
    } finally {
      setImporting(false);
    }
  };

  const closeImport = () => { setShowImport(false); setImportFile(null); setImportResult(null); };

  if (!school) return <div className="text-gray-400 text-center py-16">Select a school first.</div>;

  const ready = !!classId && !!termId && students.length > 0 && subjects.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">Score Entry</h1>
        <div className="flex gap-2">
          <button onClick={openImport}
            className="flex items-center gap-2 border border-green-700 text-green-700 px-3 py-2 rounded-lg text-sm hover:bg-green-50 transition">
            <Upload className="w-4 h-4" /> Import CSV/Excel
          </button>
          {ready && (
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-800 disabled:opacity-50 transition">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving..." : saved ? "Saved!" : "Save All Scores"}
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select value={termId} onChange={(e) => setTermId(e.target.value ? Number(e.target.value) : "")}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="">Select Term...</option>
          {terms.map((t) => <option key={t.id} value={t.id}>{t.session} — Term {t.term}</option>)}
        </select>
        <select value={classId} onChange={(e) => setClassId(e.target.value ? Number(e.target.value) : "")}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="">Select Class...</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {ready ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="text-xs w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-3 py-3 font-medium text-gray-600 sticky left-0 bg-gray-50 z-10 min-w-[160px]">Student</th>
                {subjects.map((s) => (
                  <th key={s.id} colSpan={2} className="text-center px-2 py-3 font-medium text-gray-600 border-l border-gray-100">
                    <div className="text-[11px] leading-tight">{s.name}</div>
                    <div className="flex gap-1 justify-center text-[10px] text-gray-400 font-normal mt-0.5">
                      <span>T(40)</span><span>E(60)</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-b border-gray-50 hover:bg-green-50/30">
                  <td className="px-3 py-2 sticky left-0 bg-white z-10">
                    <div className="font-medium text-gray-900 truncate max-w-[140px]">{student.name}</div>
                    <div className="text-gray-400">{student.admissionNo}</div>
                  </td>
                  {subjects.map((subject) => {
                    const key: ScoreKey = `${student.id}-${subject.id}`;
                    const entry = scores[key] ?? { testScore: "", examScore: "" };
                    return (
                      <td key={subject.id} className="border-l border-gray-100 px-1 py-1">
                        <div className="flex gap-1">
                          <input
                            type="number" min="0" max="40" value={entry.testScore}
                            onChange={(e) => handleChange(student.id, subject.id, "testScore", e.target.value)}
                            className="w-12 border border-gray-200 rounded px-1 py-1 text-center text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                            placeholder="0"
                          />
                          <input
                            type="number" min="0" max="60" value={entry.examScore}
                            onChange={(e) => handleChange(student.id, subject.id, "examScore", e.target.value)}
                            className="w-12 border border-gray-200 rounded px-1 py-1 text-center text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                            placeholder="0"
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center text-gray-400">
          Select a term and class above to enter scores.
        </div>
      )}

      {showImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Import Scores from File</h2>
              <button onClick={closeImport} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Academic Term *</label>
                <select value={importTermId} onChange={(e) => setImportTermId(e.target.value ? Number(e.target.value) : "")}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">Select term...</option>
                  {terms.map((t) => <option key={t.id} value={t.id}>{t.session} — Term {t.term}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">File (CSV or Excel) *</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setImportFile(f); }}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-green-400 hover:bg-green-50/40 transition"
                >
                  <FileSpreadsheet className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  {importFile ? (
                    <p className="text-sm font-medium text-green-700">{importFile.name}</p>
                  ) : (
                    <>
                      <p className="text-sm text-gray-500">Click to browse or drag & drop</p>
                      <p className="text-xs text-gray-400 mt-1">.csv, .xlsx, .xls accepted</p>
                    </>
                  )}
                  <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) setImportFile(f); }} />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
                <p className="font-medium text-gray-700">Expected columns:</p>
                <p><span className="font-mono bg-white px-1 rounded border">AdmissionNo</span> or <span className="font-mono bg-white px-1 rounded border">StudentName</span> — student identifier</p>
                <p><span className="font-mono bg-white px-1 rounded border">Subject</span> — subject name (auto-created if new)</p>
                <p><span className="font-mono bg-white px-1 rounded border">TestScore</span> (max 40) + <span className="font-mono bg-white px-1 rounded border">ExamScore</span> (max 60)</p>
                <p className="text-gray-400">Or just <span className="font-mono bg-white px-1 rounded border">Score</span> (total out of 100, split 40%/60%)</p>
              </div>

              {importResult && (
                <div className={`rounded-lg p-4 text-sm ${importResult.imported > 0 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                  <div className="flex items-center gap-2 font-medium mb-2">
                    {importResult.imported > 0
                      ? <><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-green-800">Import complete</span></>
                      : <><AlertCircle className="w-4 h-4 text-red-600" /><span className="text-red-800">Import failed</span></>
                    }
                  </div>
                  {importResult.total > 0 && (
                    <div className="text-gray-600 space-y-0.5">
                      <p>{importResult.imported} of {importResult.total} rows imported successfully</p>
                      {importResult.skipped > 0 && <p>{importResult.skipped} rows skipped</p>}
                    </div>
                  )}
                  {importResult.errors.length > 0 && (
                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                      {importResult.errors.map((e, i) => (
                        <p key={i} className="text-red-700 text-xs">{e.row > 0 ? `Row ${e.row}: ` : ""}{e.reason}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={closeImport} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
                {importResult?.imported ? "Done" : "Cancel"}
              </button>
              {!importResult?.imported && (
                <button onClick={handleImport} disabled={!importFile || !importTermId || importing}
                  className="flex-1 bg-green-700 text-white py-2 rounded-lg text-sm hover:bg-green-800 disabled:opacity-50 flex items-center justify-center gap-2 transition">
                  {importing ? <><RefreshCw className="w-4 h-4 animate-spin" /> Importing...</> : <><Upload className="w-4 h-4" /> Import</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

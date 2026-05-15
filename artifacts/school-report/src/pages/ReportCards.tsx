import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useSchool } from "@/hooks/useSchool";
import { useState } from "react";
import { FileText, RefreshCw, Eye, Printer } from "lucide-react";

interface ClassData { id: number; name: string; }
interface Term { id: number; session: string; term: number; }
interface ReportCardSummary {
  id: number; studentId: number; termId: number; totalScore: number; average: number;
  position: number; outOf: number; studentName: string | null; admissionNo: string | null;
  className: string | null; session: string | null; term: number | null;
}
interface Score {
  id: number; subjectId: number; testScore: number; examScore: number;
  total: number; grade: string; remark: string; subjectName: string | null;
}
interface Rating { traitId: number; rating: number; traitName: string | null; }
interface ReportCardDetail extends ReportCardSummary {
  gender: string | null; schoolName: string | null; schoolAddress: string | null;
  schoolMotto: string | null; schoolLogoUrl: string | null;
  daysPresent: number | null; daysAbsent: number | null;
  teacherRemark: string | null; principalRemark: string | null; nextTermBegins: string | null;
  scores: Score[]; ratings: Rating[];
}

function gradeColor(grade: string) {
  if (grade === "A1") return "text-green-700 font-bold";
  if (grade.startsWith("B")) return "text-blue-600 font-semibold";
  if (grade.startsWith("C")) return "text-yellow-600";
  if (grade.startsWith("D") || grade === "E8") return "text-orange-500";
  return "text-red-600";
}

function ReportCardView({ card, onClose }: { card: ReportCardDetail; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6" id="report-card-print">
          {/* Header */}
          <div className="text-center border-b-2 border-green-800 pb-4 mb-4">
            <div className="w-16 h-16 bg-green-800 rounded-full mx-auto mb-2 flex items-center justify-center">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-bold text-green-900 uppercase">{card.schoolName}</h1>
            <p className="text-sm text-gray-500">{card.schoolAddress}</p>
            <p className="text-xs italic text-green-700 mt-1">"{card.schoolMotto}"</p>
            <h2 className="text-base font-bold text-gray-800 mt-3 uppercase tracking-wide">
              Student Report Card
            </h2>
            <p className="text-sm text-gray-600">{card.session} Academic Session — Term {card.term}</p>
          </div>

          {/* Student info */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-4">
            <div><span className="text-gray-500">Name:</span> <strong>{card.studentName}</strong></div>
            <div><span className="text-gray-500">Admission No:</span> <strong>{card.admissionNo}</strong></div>
            <div><span className="text-gray-500">Class:</span> <strong>{card.className}</strong></div>
            <div><span className="text-gray-500">Gender:</span> <strong>{card.gender ?? "—"}</strong></div>
            <div><span className="text-gray-500">Position:</span> <strong className="text-green-700">{card.position}{ordinal(card.position)} of {card.outOf}</strong></div>
            <div><span className="text-gray-500">Average:</span> <strong className="text-green-700">{card.average}%</strong></div>
          </div>

          {/* Scores table */}
          <table className="w-full text-xs border border-gray-200 mb-4">
            <thead>
              <tr className="bg-green-800 text-white">
                <th className="text-left px-3 py-2">Subject</th>
                <th className="px-2 py-2">Test (40)</th>
                <th className="px-2 py-2">Exam (60)</th>
                <th className="px-2 py-2">Total</th>
                <th className="px-2 py-2">Grade</th>
                <th className="px-2 py-2">Remark</th>
              </tr>
            </thead>
            <tbody>
              {card.scores.map((s) => (
                <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-1.5 text-gray-900">{s.subjectName}</td>
                  <td className="px-2 py-1.5 text-center">{s.testScore}</td>
                  <td className="px-2 py-1.5 text-center">{s.examScore}</td>
                  <td className="px-2 py-1.5 text-center font-semibold">{s.total}</td>
                  <td className={`px-2 py-1.5 text-center ${gradeColor(s.grade)}`}>{s.grade}</td>
                  <td className="px-2 py-1.5 text-center text-gray-600">{s.remark}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Psychomotor */}
          {card.ratings.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-bold text-gray-700 uppercase mb-2">Psychomotor Skills (5 = Excellent)</h3>
              <div className="grid grid-cols-2 gap-2">
                {card.ratings.map((r) => (
                  <div key={r.traitId} className="flex items-center justify-between bg-gray-50 rounded px-3 py-1">
                    <span className="text-xs text-gray-600">{r.traitName}</span>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map((n) => (
                        <div key={n} className={`w-3 h-3 rounded-full ${n <= r.rating ? "bg-green-600" : "bg-gray-200"}`} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attendance & remarks */}
          <div className="grid grid-cols-2 gap-3 text-xs mb-4">
            <div className="bg-gray-50 rounded p-3">
              <p className="text-gray-500 mb-1">Attendance</p>
              <p>Days Present: <strong>{card.daysPresent ?? "—"}</strong></p>
              <p>Days Absent: <strong>{card.daysAbsent ?? "—"}</strong></p>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <p className="text-gray-500 mb-1">Next Term Begins</p>
              <p><strong>{card.nextTermBegins ?? "—"}</strong></p>
            </div>
          </div>
          {(card.teacherRemark || card.principalRemark) && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><p className="text-gray-500">Class Teacher's Remark:</p><p className="italic">{card.teacherRemark ?? "—"}</p></div>
              <div><p className="text-gray-500">Principal's Remark:</p><p className="italic">{card.principalRemark ?? "—"}</p></div>
            </div>
          )}
        </div>
        <div className="flex gap-3 p-4 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">Close</button>
          <button onClick={() => window.print()} className="flex items-center justify-center gap-2 flex-1 bg-green-700 text-white py-2 rounded-lg text-sm hover:bg-green-800">
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>
    </div>
  );
}

function ordinal(n: number) {
  const s = ["th","st","nd","rd"], v = n % 100;
  return s[(v-20)%10] || s[v] || s[0];
}

export default function ReportCards() {
  const qc = useQueryClient();
  const { school } = useSchool();
  const [classId, setClassId] = useState<number | "">("");
  const [termId, setTermId] = useState<number | "">("");
  const [viewCard, setViewCard] = useState<ReportCardDetail | null>(null);
  const [generating, setGenerating] = useState(false);

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
  const { data: cards = [], isLoading } = useQuery<ReportCardSummary[]>({
    queryKey: ["reportcards", termId, classId],
    queryFn: () => apiFetch(`/reportcards?termId=${termId}&classId=${classId}`),
    enabled: !!termId && !!classId,
  });

  const handleGenerate = async () => {
    if (!classId || !termId) return;
    setGenerating(true);
    try {
      await apiFetch("/reportcards/generate", { method: "POST", body: JSON.stringify({ classId, termId }) });
      qc.invalidateQueries({ queryKey: ["reportcards"] });
    } finally {
      setGenerating(false);
    }
  };

  const handleView = async (cardId: number) => {
    const detail = await apiFetch<ReportCardDetail>(`/reportcards/${cardId}`);
    setViewCard(detail);
  };

  if (!school) return <div className="text-gray-400 text-center py-16">Select a school first.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Report Cards</h1>
        {classId && termId && (
          <button onClick={handleGenerate} disabled={generating}
            className="flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-800 disabled:opacity-50 transition">
            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {generating ? "Generating..." : "Generate Report Cards"}
          </button>
        )}
      </div>

      <div className="flex gap-3">
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

      {termId && classId ? (
        isLoading ? <div className="text-gray-400">Loading...</div> : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Position</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Student</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Admission No</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-600">Total</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-600">Average</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...cards].sort((a, b) => a.position - b.position).map((card) => (
                  <tr key={card.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <span className={`w-8 h-8 inline-flex items-center justify-center rounded-full text-xs font-bold ${
                        card.position === 1 ? "bg-yellow-400 text-yellow-900" :
                        card.position === 2 ? "bg-gray-300 text-gray-700" :
                        card.position === 3 ? "bg-orange-300 text-orange-800" :
                        "bg-gray-100 text-gray-500"
                      }`}>{card.position}</span>
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-900">{card.studentName}</td>
                    <td className="px-5 py-3 text-gray-500">{card.admissionNo}</td>
                    <td className="px-5 py-3 text-right">{Number(card.totalScore).toFixed(1)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-green-700">{Number(card.average).toFixed(1)}%</td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => handleView(card.id)} className="flex items-center gap-1 ml-auto text-xs bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1.5 rounded-lg transition">
                        <Eye className="w-3 h-3" /> View
                      </button>
                    </td>
                  </tr>
                ))}
                {cards.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-gray-400 py-12">
                    No report cards yet. Click "Generate Report Cards" to create them.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center text-gray-400">
          Select a term and class to view report cards.
        </div>
      )}

      {viewCard && <ReportCardView card={viewCard} onClose={() => setViewCard(null)} />}
    </div>
  );
}

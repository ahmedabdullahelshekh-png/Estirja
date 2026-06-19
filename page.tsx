"use client";

import { useState, useEffect } from "react";

interface Summary {
  id: string;
  subjectId: string;
  title: string;
  content: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewAt: string;
  lastReviewedAt: string | null;
  isFavorite: boolean | null;
  createdAt: string;
  subjectName: string;
  subjectColor: string;
}

interface Subject {
  id: string;
  name: string;
  color: string | null;
}

export default function SummariesPage() {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ subjectId: "", title: "", content: "" });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function fetchData() {
    try {
      const [summariesRes, subjectsRes] = await Promise.all([
        fetch("/api/summaries"),
        fetch("/api/subjects"),
      ]);
      const summariesData = await summariesRes.json();
      const subjectsData = await subjectsRes.json();
      setSummaries(summariesData.summaries || []);
      setSubjects(subjectsData.subjects || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/summaries/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (res.ok) await fetchData();
      } else {
        const res = await fetch("/api/summaries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (res.ok) await fetchData();
      }
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا الملخص؟")) return;
    try {
      await fetch(`/api/summaries/${id}`, { method: "DELETE" });
      setSummaries((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  async function toggleFavorite(summary: Summary) {
    const newValue = !summary.isFavorite;
    setSummaries((prev) =>
      prev.map((s) => (s.id === summary.id ? { ...s, isFavorite: newValue } : s))
    );
    try {
      await fetch(`/api/summaries/${summary.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: newValue }),
      });
    } catch {
      setSummaries((prev) =>
        prev.map((s) => (s.id === summary.id ? { ...s, isFavorite: !newValue } : s))
      );
    }
  }

  function startEdit(summary: Summary) {
    setEditingId(summary.id);
    setForm({ subjectId: summary.subjectId, title: summary.title, content: summary.content });
    setShowForm(true);
  }

  function resetForm() {
    setForm({ subjectId: subjects[0]?.id || "", title: "", content: "" });
    setEditingId(null);
    setShowForm(false);
  }

  const now = new Date();
  const filteredSummaries = summaries.filter((s) => {
    if (filter === "all") return true;
    if (filter === "due") return new Date(s.nextReviewAt) <= now;
    if (filter === "favorites") return s.isFavorite;
    return s.subjectId === filter;
  });

  function getDueStatus(nextReviewAt: string) {
    const d = new Date(nextReviewAt);
    if (d <= now) return { text: "مستحق الآن", cls: "bg-amber-100 text-amber-700" };
    const days = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 1) return { text: "غداً", cls: "bg-blue-100 text-blue-700" };
    return { text: `بعد ${days} يوم`, cls: "bg-slate-100 text-slate-600" };
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">الملخصات</h1>
          <p className="text-text-secondary text-sm mt-1">{summaries.length} ملخص في {subjects.length} مادة</p>
        </div>
        <button
          onClick={() => {
            setForm({ subjectId: subjects[0]?.id || "", title: "", content: "" });
            setEditingId(null);
            setShowForm(true);
          }}
          disabled={subjects.length === 0}
          className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2 self-start disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          إضافة ملخص
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === "all" ? "bg-primary-100 text-primary-700" : "bg-white border border-border text-text-secondary hover:bg-surface-alt"}`}
        >
          الكل ({summaries.length})
        </button>
        <button
          onClick={() => setFilter("due")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === "due" ? "bg-amber-100 text-amber-700" : "bg-white border border-border text-text-secondary hover:bg-surface-alt"}`}
        >
          مستحقة ({summaries.filter((s) => new Date(s.nextReviewAt) <= now).length})
        </button>
        <button
          onClick={() => setFilter("favorites")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === "favorites" ? "bg-pink-100 text-pink-700" : "bg-white border border-border text-text-secondary hover:bg-surface-alt"}`}
        >
          ⭐ المفضلة
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => resetForm()}>
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 animate-fade-in max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">
              {editingId ? "تعديل الملخص" : "إضافة ملخص جديد"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">المادة</label>
                <select
                  value={form.subjectId}
                  onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                >
                  <option value="">اختر المادة</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">العنوان</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                  placeholder="عنوان الملخص"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">المحتوى</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  required
                  rows={10}
                  className="w-full px-4 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all resize-none font-mono text-sm"
                  placeholder="اكتب الملخص هنا... يمكنك استخدام تنسيق Markdown"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-xl font-medium transition-all disabled:opacity-50"
                >
                  {saving ? "جاري الحفظ..." : editingId ? "حفظ التعديلات" : "إضافة الملخص"}
                </button>
                <button type="button" onClick={resetForm} className="px-5 py-2.5 border border-border rounded-xl text-text-secondary hover:bg-surface-alt transition-all">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Summaries list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-border p-5 space-y-2">
              <div className="h-5 w-1/3 bg-slate-200 rounded animate-pulse-soft" />
              <div className="h-4 w-2/3 bg-slate-200 rounded animate-pulse-soft" />
              <div className="h-4 w-1/2 bg-slate-200 rounded animate-pulse-soft" />
            </div>
          ))}
        </div>
      ) : filteredSummaries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="font-bold text-lg mb-2">
            {summaries.length === 0 ? "لا توجد ملخصات بعد" : "لا توجد نتائج"}
          </h3>
          <p className="text-text-secondary text-sm">
            {summaries.length === 0 ? (subjects.length === 0 ? "أضف مادة أولاً ثم أضف ملخصاتك" : "أضف ملخصك الأول لبدء المراجعة") : "جرب تغيير الفلتر"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSummaries.map((summary, i) => {
            const status = getDueStatus(summary.nextReviewAt);
            const isExpanded = expandedId === summary.id;

            return (
              <div
                key={summary.id}
                className="bg-white rounded-2xl border border-border hover:shadow-sm transition-all animate-fade-in"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                          style={{ backgroundColor: summary.subjectColor }}
                        >
                          {summary.subjectName}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.cls}`}>
                          {status.text}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm mb-1">{summary.title}</h3>
                      <p className="text-xs text-text-muted">
                        المراجعة #{summary.repetitions} · الفترة: {summary.interval} يوم
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => toggleFavorite(summary)}
                        className="p-1.5 hover:bg-surface-alt rounded-lg transition-all"
                      >
                        <svg
                          className={`w-5 h-5 ${summary.isFavorite ? "text-amber-400 fill-amber-400" : "text-text-muted"}`}
                          fill={summary.isFavorite ? "currentColor" : "none"}
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : summary.id)}
                        className="p-1.5 hover:bg-surface-alt rounded-lg transition-all"
                      >
                        <svg
                          className={`w-5 h-5 text-text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-border pt-4 animate-fade-in">
                    <div className="bg-surface-alt rounded-xl p-4 mb-3 max-h-80 overflow-y-auto">
                      <div className="text-sm whitespace-pre-wrap leading-relaxed">{summary.content}</div>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => startEdit(summary)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-surface-alt transition-all text-text-secondary"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => handleDelete(summary.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition-all text-red-600"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

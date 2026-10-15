"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ExamSubject = {
  _id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
  questionCount: number;
  activeQuestionCount: number;
};

type ExamQuestion = {
  _id: string;
  subjectId: string;
  questionText: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  topic: string;
  isActive: boolean;
  hasAttemptHistory: boolean;
};

type ExamAttemptSummary = {
  id: string;
  studentName: string;
  studentEmail: string;
  course: string;
  subject: string;
  status: string;
  score: number;
  attemptNumber: number;
  startedAt: string;
  submittedAt?: string;
};

type SubjectDraft = {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
};

type QuestionDraft = {
  id: string;
  questionText: string;
  options: [string, string, string, string];
  correctAnswer: number;
  explanation: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  topic: string;
  isActive: boolean;
};

const emptySubject: SubjectDraft = {
  id: "",
  name: "",
  slug: "",
  category: "",
  description: "",
  isActive: true,
  sortOrder: 0,
};

const emptyQuestion: QuestionDraft = {
  id: "",
  questionText: "",
  options: ["", "", "", ""],
  correctAnswer: 0,
  explanation: "",
  difficulty: "beginner",
  topic: "",
  isActive: true,
};

const inputClass =
  "mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
const buttonClass =
  "rounded-xl px-3.5 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50";

async function readData<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { message?: string };
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data;
}

export default function ExamsAdmin() {
  const [subjects, setSubjects] = useState<ExamSubject[]>([]);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [attempts, setAttempts] = useState<ExamAttemptSummary[]>([]);
  const [stats, setStats] = useState({
    subjects: 0,
    activeSubjects: 0,
    totalAttempts: 0,
    passedAttempts: 0,
    passRate: 0,
    certificates: 0,
  });
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [subjectDraft, setSubjectDraft] = useState<SubjectDraft>(emptySubject);
  const [questionDraft, setQuestionDraft] = useState<QuestionDraft>(emptyQuestion);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [questionSearch, setQuestionSearch] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingSubject, setSavingSubject] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);

  const fetchAdminData = useCallback(async () => {
    const response = await fetch("/api/admin/exams");
    return readData<{
      subjects: ExamSubject[];
      attempts: ExamAttemptSummary[];
      stats: typeof stats;
    }>(response);
  }, []);

  const loadAdminData = useCallback(async () => {
    const data = await fetchAdminData();
    setSubjects(data.subjects);
    setAttempts(data.attempts);
    setStats(data.stats);
    setSelectedSubjectId((current) =>
      data.subjects.some((subject) => subject._id === current)
        ? current
        : data.subjects[0]?._id || "",
    );
  }, [fetchAdminData]);

  const fetchQuestions = useCallback(async (subjectId: string) => {
    if (!subjectId) {
      return [];
    }
    const response = await fetch(
      `/api/admin/exams/questions?subjectId=${encodeURIComponent(subjectId)}`,
    );
    const data = await readData<{ questions: ExamQuestion[] }>(response);
    return data.questions;
  }, []);

  const loadQuestions = useCallback(
    async (subjectId: string) => {
      setQuestions(await fetchQuestions(subjectId));
    },
    [fetchQuestions],
  );

  useEffect(() => {
    let active = true;
    async function loadInitialAdminData() {
      const data = await fetchAdminData();
      if (!active) return;
      setSubjects(data.subjects);
      setAttempts(data.attempts);
      setStats(data.stats);
      setSelectedSubjectId((current) =>
        data.subjects.some((subject) => subject._id === current)
          ? current
          : data.subjects[0]?._id || "",
      );
    }

    void loadInitialAdminData()
      .catch((cause) => {
        if (active)
          setError(cause instanceof Error ? cause.message : "Could not load exam management data.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchAdminData]);

  useEffect(() => {
    let active = true;
    async function loadSelectedQuestions() {
      const data = await fetchQuestions(selectedSubjectId);
      if (active) setQuestions(data);
    }

    void loadSelectedQuestions().catch((cause) => {
      if (active)
        setError(cause instanceof Error ? cause.message : "Could not load questions.");
    });
    return () => {
      active = false;
    };
  }, [fetchQuestions, selectedSubjectId]);

  const selectedSubject = subjects.find(
    (subject) => subject._id === selectedSubjectId,
  );
  const filteredSubjects = useMemo(
    () =>
      subjects.filter((subject) =>
        `${subject.name} ${subject.category} ${subject.slug}`
          .toLowerCase()
          .includes(subjectSearch.toLowerCase()),
      ),
    [subjectSearch, subjects],
  );
  const filteredQuestions = useMemo(
    () =>
      questions.filter((question) =>
        `${question.questionText} ${question.topic} ${question.difficulty}`
          .toLowerCase()
          .includes(questionSearch.toLowerCase()),
      ),
    [questionSearch, questions],
  );

  function notifyError(cause: unknown) {
    setError(cause instanceof Error ? cause.message : "The requested change failed.");
    setStatus("");
  }

  async function saveSubject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingSubject) return;
    setSavingSubject(true);
    setError("");
    setStatus("");
    try {
      const response = await fetch("/api/admin/exams", {
        method: subjectDraft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subjectDraft),
      });
      const data = await readData<{ subject: ExamSubject }>(response);
      setStatus(subjectDraft.id ? "Subject updated." : "Subject created.");
      setSelectedSubjectId(data.subject._id);
      setSubjectDraft(emptySubject);
      await loadAdminData();
    } catch (cause) {
      notifyError(cause);
    } finally {
      setSavingSubject(false);
    }
  }

  async function toggleSubject(subject: ExamSubject) {
    setError("");
    setStatus("");
    try {
      const response = await fetch("/api/admin/exams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...subject, id: subject._id, isActive: !subject.isActive }),
      });
      await readData(response);
      setStatus(`${subject.name} ${subject.isActive ? "disabled" : "published"}.`);
      await loadAdminData();
    } catch (cause) {
      notifyError(cause);
    }
  }

  async function deleteSubject(subject: ExamSubject) {
    if (
      !window.confirm(
        `Delete "${subject.name}" and its questions? Exam history prevents deletion; in that case, disable the subject instead.`,
      )
    )
      return;
    setError("");
    setStatus("");
    try {
      const response = await fetch(
        `/api/admin/exams?id=${encodeURIComponent(subject._id)}`,
        { method: "DELETE" },
      );
      await readData(response);
      setStatus("Subject and its unused questions deleted.");
      if (subjectDraft.id === subject._id) setSubjectDraft(emptySubject);
      setQuestionDraft(emptyQuestion);
      await loadAdminData();
    } catch (cause) {
      notifyError(cause);
    }
  }

  async function saveQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSubjectId || savingQuestion) return;
    setSavingQuestion(true);
    setError("");
    setStatus("");
    try {
      const response = await fetch("/api/admin/exams/questions", {
        method: questionDraft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...questionDraft,
          subjectId: selectedSubjectId,
        }),
      });
      await readData(response);
      setQuestionDraft(emptyQuestion);
      setStatus(questionDraft.id ? "Question updated." : "Question added.");
      await loadQuestions(selectedSubjectId);
      await loadAdminData();
    } catch (cause) {
      notifyError(cause);
    } finally {
      setSavingQuestion(false);
    }
  }

  async function toggleQuestion(question: ExamQuestion) {
    setError("");
    setStatus("");
    try {
      const response = await fetch("/api/admin/exams/questions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: question._id,
          subjectId: question.subjectId,
          questionText: question.questionText,
          options: question.options,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          difficulty: question.difficulty,
          topic: question.topic,
          isActive: !question.isActive,
        }),
      });
      await readData(response);
      setStatus(`Question ${question.isActive ? "disabled" : "activated"}.`);
      await loadQuestions(selectedSubjectId);
      await loadAdminData();
    } catch (cause) {
      notifyError(cause);
    }
  }

  async function deleteQuestion(question: ExamQuestion) {
    if (
      !window.confirm(
        question.hasAttemptHistory
          ? "This question appears in saved exam history. It will be disabled so prior results stay intact. Continue?"
          : "Permanently delete this question?",
      )
    )
      return;
    setError("");
    setStatus("");
    try {
      const response = await fetch(
        `/api/admin/exams/questions?id=${encodeURIComponent(question._id)}`,
        { method: "DELETE" },
      );
      const data = await readData<{ archived?: boolean; message?: string }>(response);
      setStatus(data.message || (data.archived ? "Question disabled." : "Question deleted."));
      if (questionDraft.id === question._id) setQuestionDraft(emptyQuestion);
      await loadQuestions(selectedSubjectId);
      await loadAdminData();
    } catch (cause) {
      notifyError(cause);
    }
  }

  if (loading)
    return (
      <div role="status" className="rounded-2xl border bg-white p-8 text-sm text-slate-500">
        Loading exam management…
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-indigo-700">Assessment management</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">Exams & Certificates</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Build subject banks, manage four-option questions, publish or disable content, and review exam attempts.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSubjectDraft(emptySubject);
            setQuestionDraft(emptyQuestion);
            void loadAdminData();
          }}
          className={`${buttonClass} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
        >
          Refresh data
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </p>
      )}
      {status && (
        <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {status}
        </p>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Subjects", stats.subjects],
          ["Published subjects", stats.activeSubjects],
          ["Exam attempts", stats.totalAttempts],
          ["Pass rate", `${stats.passRate}%`],
          ["Exam certificates", stats.certificates],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-black text-[#26335f]">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(250px,.8fr)_minmax(0,1.6fr)]">
        <div className="space-y-5">
          <form onSubmit={saveSubject} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-black">{subjectDraft.id ? "Edit subject" : "Add exam subject"}</h2>
              {subjectDraft.id && (
                <button type="button" onClick={() => setSubjectDraft(emptySubject)} className="text-xs font-bold text-slate-500 hover:text-indigo-700">
                  Cancel edit
                </button>
              )}
            </div>
            <label className="mt-4 block text-sm font-bold">
              Subject name
              <input required maxLength={80} value={subjectDraft.name} onChange={(event) => setSubjectDraft((draft) => ({ ...draft, name: event.target.value }))} className={inputClass} placeholder="e.g. Python" />
            </label>
            <label className="mt-3 block text-sm font-bold">
              URL slug
              <input required maxLength={100} value={subjectDraft.slug} onChange={(event) => setSubjectDraft((draft) => ({ ...draft, slug: event.target.value }))} className={inputClass} placeholder="python" />
            </label>
            <label className="mt-3 block text-sm font-bold">
              Category
              <input required maxLength={80} value={subjectDraft.category} onChange={(event) => setSubjectDraft((draft) => ({ ...draft, category: event.target.value }))} className={inputClass} placeholder="Programming" />
            </label>
            <label className="mt-3 block text-sm font-bold">
              Description
              <textarea maxLength={500} rows={3} value={subjectDraft.description} onChange={(event) => setSubjectDraft((draft) => ({ ...draft, description: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
            </label>
            <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={subjectDraft.isActive} onChange={(event) => setSubjectDraft((draft) => ({ ...draft, isActive: event.target.checked }))} />
              Published and available to students
            </label>
            <button disabled={savingSubject} className={`${buttonClass} mt-4 w-full bg-[#26335f] py-2.5 text-white hover:bg-[#394879]`}>
              {savingSubject ? "Saving…" : subjectDraft.id ? "Save subject changes" : "Create subject"}
            </button>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-black">Subject bank</h2>
              <span className="text-xs font-semibold text-slate-500">{subjects.length} total</span>
            </div>
            <input value={subjectSearch} onChange={(event) => setSubjectSearch(event.target.value)} className={inputClass} placeholder="Search subjects" aria-label="Search exam subjects" />
            <div className="mt-3 max-h-[560px] space-y-2 overflow-y-auto pr-1">
              {filteredSubjects.map((subject) => (
                <article key={subject._id} className={`rounded-xl border p-3 ${selectedSubjectId === subject._id ? "border-indigo-300 bg-indigo-50/60" : "border-slate-100"}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSubjectId(subject._id);
                      setQuestionDraft(emptyQuestion);
                      setStatus("");
                    }}
                    className="w-full text-left"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <b className="truncate text-sm">{subject.name}</b>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${subject.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                        {subject.isActive ? "Published" : "Disabled"}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {subject.category} · {subject.activeQuestionCount} active / {subject.questionCount} total
                    </span>
                  </button>
                  <div className="mt-2 flex gap-2 border-t border-slate-200/70 pt-2">
                    <button type="button" onClick={() => setSubjectDraft({ id: subject._id, name: subject.name, slug: subject.slug, category: subject.category, description: subject.description, isActive: subject.isActive, sortOrder: subject.sortOrder })} className="text-xs font-bold text-indigo-700 hover:underline">Edit</button>
                    <button type="button" onClick={() => void toggleSubject(subject)} className="text-xs font-bold text-slate-600 hover:underline">{subject.isActive ? "Disable" : "Publish"}</button>
                    <button type="button" onClick={() => void deleteSubject(subject)} className="text-xs font-bold text-rose-700 hover:underline">Delete</button>
                  </div>
                </article>
              ))}
              {!filteredSubjects.length && <p className="py-5 text-center text-sm text-slate-500">No subjects found.</p>}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <form onSubmit={saveQuestion} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">{selectedSubject?.name || "Choose a subject"}</p>
                <h2 className="mt-1 text-lg font-black">{questionDraft.id ? "Edit MCQ" : "Add question"}</h2>
              </div>
              {questionDraft.id && (
                <button type="button" onClick={() => setQuestionDraft(emptyQuestion)} className="text-xs font-bold text-slate-500 hover:text-indigo-700">Cancel edit</button>
              )}
            </div>
            {!selectedSubjectId ? (
              <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Create or select a subject first.</p>
            ) : (
              <>
                <label className="mt-4 block text-sm font-bold">
                  Question
                  <textarea required maxLength={1000} rows={3} value={questionDraft.questionText} onChange={(event) => setQuestionDraft((draft) => ({ ...draft, questionText: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" placeholder="Write a clear, technically accurate question" />
                </label>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {questionDraft.options.map((option, index) => (
                    <label key={index} className="block text-sm font-bold">
                      <span className="flex items-center gap-2">
                        <input type="radio" name="correct-answer" checked={questionDraft.correctAnswer === index} onChange={() => setQuestionDraft((draft) => ({ ...draft, correctAnswer: index }))} aria-label={`Mark option ${String.fromCharCode(65 + index)} correct`} />
                        Option {String.fromCharCode(65 + index)} {questionDraft.correctAnswer === index && <span className="text-xs text-emerald-700">(correct)</span>}
                      </span>
                      <input required maxLength={500} value={option} onChange={(event) => setQuestionDraft((draft) => ({ ...draft, options: draft.options.map((item, itemIndex) => itemIndex === index ? event.target.value : item) as QuestionDraft["options"] }))} className={inputClass} />
                    </label>
                  ))}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-bold">
                    Topic
                    <input required maxLength={100} value={questionDraft.topic} onChange={(event) => setQuestionDraft((draft) => ({ ...draft, topic: event.target.value }))} className={inputClass} placeholder="Data types" />
                  </label>
                  <label className="block text-sm font-bold">
                    Difficulty
                    <select value={questionDraft.difficulty} onChange={(event) => setQuestionDraft((draft) => ({ ...draft, difficulty: event.target.value as QuestionDraft["difficulty"] }))} className={inputClass}>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </label>
                </div>
                <label className="mt-3 block text-sm font-bold">
                  Explanation shown after submission
                  <textarea required maxLength={1000} rows={2} value={questionDraft.explanation} onChange={(event) => setQuestionDraft((draft) => ({ ...draft, explanation: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                </label>
                <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" checked={questionDraft.isActive} onChange={(event) => setQuestionDraft((draft) => ({ ...draft, isActive: event.target.checked }))} />
                  Include in future exams
                </label>
                <button disabled={savingQuestion} className={`${buttonClass} mt-4 bg-indigo-600 py-2.5 text-white hover:bg-indigo-700`}>
                  {savingQuestion ? "Saving…" : questionDraft.id ? "Save question changes" : "Add question"}
                </button>
              </>
            )}
          </form>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-black">Question bank</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedSubject ? `${selectedSubject.activeQuestionCount} active · 20 required to run an exam` : "Select a subject"}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{filteredQuestions.length} questions</span>
            </div>
            {!!questions.length && (
              <input value={questionSearch} onChange={(event) => setQuestionSearch(event.target.value)} className={inputClass} placeholder="Search question or topic" aria-label="Search questions" />
            )}
            <div className="mt-4 space-y-3">
              {filteredQuestions.map((question) => (
                <article key={question._id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${question.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{question.isActive ? "Active" : "Disabled"}</span>
                        <span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-bold capitalize text-indigo-700">{question.difficulty}</span>
                        <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800">{question.topic}</span>
                      </div>
                      <h3 className="mt-2 font-bold leading-6">{question.questionText}</h3>
                      <div className="mt-2 grid gap-1 sm:grid-cols-2">
                        {question.options.map((option, index) => (
                          <p key={index} className={`rounded-lg px-2 py-1.5 text-xs ${question.correctAnswer === index ? "bg-emerald-50 font-bold text-emerald-800" : "bg-slate-50 text-slate-600"}`}>
                            {String.fromCharCode(65 + index)}. {option}{question.correctAnswer === index ? " · Correct" : ""}
                          </p>
                        ))}
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-500">{question.explanation}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button type="button" onClick={() => setQuestionDraft({ id: question._id, questionText: question.questionText, options: [...question.options] as QuestionDraft["options"], correctAnswer: question.correctAnswer, explanation: question.explanation, difficulty: question.difficulty, topic: question.topic, isActive: question.isActive })} className="text-xs font-bold text-indigo-700 hover:underline">Edit</button>
                      <button type="button" onClick={() => void toggleQuestion(question)} className="text-xs font-bold text-slate-600 hover:underline">{question.isActive ? "Disable" : "Enable"}</button>
                      <button type="button" onClick={() => void deleteQuestion(question)} className="text-xs font-bold text-rose-700 hover:underline">{question.hasAttemptHistory ? "Archive" : "Delete"}</button>
                    </div>
                  </div>
                </article>
              ))}
              {!filteredQuestions.length && (
                <p className="rounded-xl bg-slate-50 p-7 text-center text-sm text-slate-500">
                  {selectedSubject ? "No questions yet. Add the first MCQ above." : "Select a subject to view its question bank."}
                </p>
              )}
            </div>
          </section>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">Recent exam attempts</h2>
            <p className="mt-1 text-xs text-slate-500">Latest 100 student submissions and in-progress attempts.</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">{attempts.length} shown</span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3 font-bold">Student</th>
                <th className="px-3 py-3 font-bold">Course</th>
                <th className="px-3 py-3 font-bold">Subject</th>
                <th className="px-3 py-3 font-bold">Attempt</th>
                <th className="px-3 py-3 font-bold">Score / Status</th>
                <th className="px-3 py-3 font-bold">Date</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((attempt) => (
                <tr key={attempt.id} className="border-b border-slate-100">
                  <td className="px-3 py-3">
                    <b className="block">{attempt.studentName}</b>
                    <span className="text-xs text-slate-500">{attempt.studentEmail}</span>
                  </td>
                  <td className="px-3 py-3">{attempt.course}</td>
                  <td className="px-3 py-3">{attempt.subject}</td>
                  <td className="px-3 py-3">#{attempt.attemptNumber}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${attempt.status === "passed" ? "bg-emerald-50 text-emerald-700" : attempt.status === "failed" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-800"}`}>
                      {attempt.status === "in-progress" ? "In progress" : `${attempt.score}/100 · ${attempt.status}`}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-500">{new Date(attempt.submittedAt || attempt.startedAt).toLocaleString()}</td>
                </tr>
              ))}
              {!attempts.length && (
                <tr><td colSpan={6} className="px-3 py-10 text-center text-slate-500">No exam attempts yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

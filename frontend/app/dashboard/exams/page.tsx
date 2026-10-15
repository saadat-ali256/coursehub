"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import CourseHubLoader from "@/components/CourseHubLoader";
import CourseHubLogo from "@/components/CourseHubLogo";

type CourseAttempt = {
  id: string;
  subject: string;
  status: "in-progress" | "passed" | "failed";
  score: number;
  attemptNumber: number;
  createdAt: string;
};

type EligibleCourse = {
  id: string;
  name: string;
  thumbnail: string;
  attempts: CourseAttempt[];
};

type ExamSubject = {
  _id: string;
  name: string;
  category: string;
  description: string;
  questionCount: number;
  examAvailable: boolean;
};

type ExamQuestion = {
  number: number;
  questionText: string;
  options: string[];
  topic: string;
  difficulty: string;
};

type AdminPreviewQuestion = {
  _id: string;
  questionText: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: string;
  topic: string;
  isActive: boolean;
};

type ExamSession = {
  attemptId: string;
  courseName: string;
  subjectName: string;
  studentDisplayName: string;
  attemptNumber: number;
  attemptsRemaining: number;
  questions: ExamQuestion[];
};

type ReviewQuestion = ExamQuestion & {
  selectedAnswer: number | null;
  correctAnswer: number;
  isCorrect: boolean;
  explanation: string;
};

type ExamResult = {
  attemptId: string;
  studentDisplayName: string;
  courseName: string;
  subjectName: string;
  status: "passed" | "failed";
  score: number;
  percentage: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  attemptNumber: number;
  timeTaken?: number;
  review: ReviewQuestion[];
  certificate?: { certificateId: string };
};

async function readResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { message?: string };
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data;
}

export default function DashboardExamsPage() {
  const [courses, setCourses] = useState<EligibleCourse[]>([]);
  const [subjects, setSubjects] = useState<ExamSubject[]>([]);
  const [dashboardHref, setDashboardHref] = useState("/dashboard");
  const [isAdmin, setIsAdmin] = useState(false);
  const [previewQuestions, setPreviewQuestions] = useState<AdminPreviewQuestion[] | null>(null);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");
  const [subjectCategory, setSubjectCategory] = useState("All categories");
  const [displayName, setDisplayName] = useState("");
  const [exam, setExam] = useState<ExamSession | null>(null);
  const [answers, setAnswers] = useState<Array<number | null>>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadCourses = useCallback(async () => {
    const [subjectResponse, userResponse] = await Promise.all([
      fetch("/api/exams/subjects"),
      fetch("/api/auth/me"),
    ]);
    const [subjectData, userData] = await Promise.all([
      readResponse<{ subjects: ExamSubject[] }>(subjectResponse),
      readResponse<{
        user?: {
          name?: string;
          role?: string;
          adminPermissions?: string[];
        };
      }>(userResponse),
    ]);
    const user = userData.user;
    const admin = user?.role === "admin";
    const courseData = admin
      ? { courses: [] as EligibleCourse[] }
      : await readResponse<{ courses: EligibleCourse[] }>(
          await fetch("/api/exams/eligible-courses"),
        );
    return {
      courses: courseData.courses,
      subjects: subjectData.subjects,
      displayName: user?.name || "",
      dashboardHref: admin ? "/admin" : "/dashboard",
      isAdmin: admin,
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadExamData() {
      const data = await loadCourses();
      if (!active) return;
      setCourses(data.courses);
      setSubjects(data.subjects);
      setDisplayName(data.displayName);
      setDashboardHref(data.dashboardHref);
      setIsAdmin(data.isAdmin);
    }

    void loadExamData()
      .catch((cause) => {
        if (active)
          setError(cause instanceof Error ? cause.message : "Could not load exam data.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadCourses]);

  const selectedCourseInfo = courses.find((course) => course.id === selectedCourse);
  const subjectCategories = Array.from(
    new Set(subjects.map((subject) => subject.category)),
  ).sort();
  const visibleSubjects = subjects.filter((subject) => {
    const matchesCategory =
      subjectCategory === "All categories" ||
      subject.category === subjectCategory;
    const matchesSearch =
      !subjectSearch.trim() ||
      `${subject.name} ${subject.description}`
        .toLowerCase()
        .includes(subjectSearch.trim().toLowerCase());
    return matchesCategory && matchesSearch;
  });
  const current = exam?.questions[currentQuestion];

  async function startExam() {
    if (!selectedCourse || !selectedSubject || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/exams/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourse,
          subjectId: selectedSubject,
          studentDisplayName: displayName,
        }),
      });
      const data = await readResponse<{
        attemptId: string;
        course: { name: string };
        subject: { name: string };
        studentDisplayName: string;
        attemptNumber: number;
        attemptsRemaining: number;
        questions: ExamQuestion[];
      }>(response);
      setExam({
        attemptId: data.attemptId,
        courseName: data.course.name,
        subjectName: data.subject.name,
        studentDisplayName: data.studentDisplayName,
        attemptNumber: data.attemptNumber,
        attemptsRemaining: data.attemptsRemaining,
        questions: data.questions,
      });
      setAnswers(Array<number | null>(20).fill(null));
      setCurrentQuestion(0);
      setResult(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start exam.");
    } finally {
      setBusy(false);
    }
  }

  async function previewAdminTest(subjectId: string) {
    setSelectedSubject(subjectId);
    setPreviewQuestions(null);
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/exams/questions?subjectId=${encodeURIComponent(subjectId)}`,
      );
      const data = await readResponse<{ questions: AdminPreviewQuestion[] }>(
        response,
      );
      setPreviewQuestions(data.questions.filter((question) => question.isActive));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load test preview.");
    } finally {
      setBusy(false);
    }
  }

  async function openAttempt(attemptId: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/exams/${encodeURIComponent(attemptId)}`);
      const data = await readResponse<{
        attempt: {
          id: string;
          course: string;
          subject: string;
          studentDisplayName: string;
          status: "in-progress" | "passed" | "failed";
          score: number;
          percentage: number;
          correctCount: number;
          incorrectCount: number;
          unansweredCount: number;
          attemptNumber: number;
          timeTaken?: number;
          answers?: Array<number | null>;
          questions?: ExamQuestion[];
          review?: ReviewQuestion[];
        };
      }>(response);
      if (data.attempt.status === "in-progress") {
        setExam({
          attemptId: data.attempt.id,
          courseName: data.attempt.course,
          subjectName: data.attempt.subject,
          studentDisplayName: data.attempt.studentDisplayName,
          attemptNumber: data.attempt.attemptNumber,
          attemptsRemaining: 0,
          questions: data.attempt.questions || [],
        });
        setAnswers(data.attempt.answers || Array<number | null>(20).fill(null));
        setCurrentQuestion(0);
        setResult(null);
      } else {
        setResult({
          attemptId: data.attempt.id,
          studentDisplayName: data.attempt.studentDisplayName,
          courseName: data.attempt.course,
          subjectName: data.attempt.subject,
          status: data.attempt.status,
          score: data.attempt.score,
          percentage: data.attempt.percentage,
          correctCount: data.attempt.correctCount,
          incorrectCount: data.attempt.incorrectCount,
          unansweredCount: data.attempt.unansweredCount,
          attemptNumber: data.attempt.attemptNumber,
          timeTaken: data.attempt.timeTaken,
          review: data.attempt.review || [],
        });
        setExam(null);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load this exam.");
    } finally {
      setBusy(false);
    }
  }

  async function submitExam() {
    if (!exam || busy) return;
    if (!window.confirm("Submit your final answers? You cannot change them after submission.")) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/exams/${encodeURIComponent(exam.attemptId)}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers }),
        },
      );
      const data = await readResponse<{ result: ExamResult }>(response);
      setResult({
        ...data.result,
        courseName: exam.courseName,
        subjectName: exam.subjectName,
      });
      setExam(null);
      const courseData = await loadCourses();
      setCourses(courseData.courses);
      setSubjects(courseData.subjects);
      setDisplayName(courseData.displayName);
      setDashboardHref(courseData.dashboardHref);
      setIsAdmin(courseData.isAdmin);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not submit exam.");
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return <CourseHubLoader fullScreen label="Loading your certification exams..." />;

  return (
    <main className="coursehub-page min-h-screen bg-[radial-gradient(ellipse_at_top_right,_rgba(79,70,229,0.10),_transparent_38%),linear-gradient(180deg,#f7f8fc_0%,#f1f3f9_100%)] px-0 py-0 text-slate-900">
      <div className="w-full">
        <nav className="glass sticky top-0 z-50">
          <div className="container site-navbar-inner flex min-h-12 items-center justify-between gap-3 py-0">
            <Link
              href="/"
              aria-label="CourseHub home"
              className="navbar-wordmark shrink-0 text-2xl font-black tracking-tight"
            >
              <CourseHubLogo size="sm" subtitle="CERTIFICATION CENTER" />
            </Link>
              <div
                aria-label="Exam navigation"
                className="flex shrink-0 items-center justify-end gap-2"
              >
                <Link
                  href={dashboardHref}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 sm:px-4"
                >
                  Back to dashboard
                </Link>
                <Link
                  href="/certificates"
                  className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 sm:px-4"
                >
                  My Certificates
                </Link>
              </div>
          </div>
        </nav>

        <section className="relative isolate overflow-hidden rounded-none bg-gradient-to-br from-indigo-700 via-indigo-700 to-indigo-900 px-6 py-8 text-white shadow-[0_24px_60px_rgba(67,56,202,.22)] sm:px-9 sm:py-10 lg:flex lg:items-center lg:justify-between lg:gap-8">
          <div aria-hidden="true" className="absolute -right-16 -top-28 -z-10 h-80 w-80 rounded-full border border-white/10 bg-indigo-400/25 blur-[1px]" />
          <div aria-hidden="true" className="absolute -bottom-36 right-1/4 -z-10 h-72 w-72 rounded-full bg-[#e8c77b]/10 blur-3xl" />
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#e8c77b]/30 bg-[#e8c77b]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.2em] text-[#f0d994] sm:text-xs">
              <span aria-hidden="true">✦</span> CourseHub certification
            </span>
            <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              Prove what you know.
              <span className="mt-1 block font-serif font-medium italic text-indigo-100">Earn what you deserve.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-indigo-100 sm:text-base">
              Complete a course’s required lessons, pass its final exam, and earn a verified CourseHub certificate.
            </p>
          </div>
          <div className="relative mt-7 grid grid-cols-3 gap-2 lg:mt-0 lg:min-w-[330px]">
            {[
              ["20", "Questions"],
              ["75%", "Pass mark"],
              ["3", "Attempts"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-white/15 bg-white/[.09] px-3 py-4 text-center backdrop-blur-sm sm:px-4">
                <div className="text-xl font-black text-white sm:text-2xl">{value}</div>
                <div className="mt-1 text-[10px] font-semibold text-indigo-100 sm:text-xs">{label}</div>
              </div>
            ))}
          </div>
        </section>
        {error && (
          <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </p>
        )}

        {result ? (
          <section className="mt-7 rounded-3xl border border-white bg-white/90 p-5 shadow-[0_18px_50px_rgba(29,35,66,.08)] sm:p-8">
            <div className={`rounded-[1.75rem] border p-5 sm:p-7 ${result.status === "passed" ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white text-emerald-900" : "border-rose-200 bg-gradient-to-br from-rose-50 to-white text-rose-900"}`}>
              <p className="text-sm font-black uppercase tracking-wider">
                {result.status === "passed" ? "Exam passed" : "Exam not passed"}
              </p>
              <h2 className="mt-2 text-3xl font-black">{result.score}/100</h2>
              <p className="mt-2 text-sm">
                {result.correctCount} correct · {result.incorrectCount} incorrect · {result.unansweredCount} unanswered
              </p>
              <p className="mt-1 text-sm">
                {result.courseName} · {result.subjectName} · Attempt {result.attemptNumber}
              </p>
              {result.certificate?.certificateId && (
                <Link
                  href={`/certificates/${encodeURIComponent(result.certificate.certificateId)}`}
                  className="mt-4 inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white"
                >
                  View certificate
                </Link>
              )}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-black">Answer review</h3>
              <button
                onClick={() => {
                  setSelectedCourse(
                    courses.find((course) => course.name === result.courseName)?.id ||
                      selectedCourse,
                  );
                  setSelectedSubject("");
                  setSubjectSearch("");
                  setSubjectCategory("All categories");
                  setResult(null);
                }}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
              >
                Take another test
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Choose another available subject, or retake this one if you still have attempts left. Each subject allows up to three attempts.
            </p>
            <div className="mt-4 space-y-4">
              {result.review.map((item) => (
                <article key={item.number} className={`rounded-[1.75rem] border p-4 ${item.isCorrect ? "border-emerald-200 bg-emerald-50/50" : "border-rose-200 bg-rose-50/50"}`}>
                  <p className="font-bold">{item.number}. {item.questionText}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {item.options.map((option, index) => (
                      <p key={index} className={`rounded-lg px-3 py-2 text-sm ${index === item.correctAnswer ? "bg-emerald-100 font-bold text-emerald-900" : index === item.selectedAnswer ? "bg-rose-100 text-rose-900" : "bg-white text-slate-600"}`}>
                        {String.fromCharCode(65 + index)}. {option}
                        {index === item.correctAnswer ? " · Correct answer" : index === item.selectedAnswer ? " · Your answer" : ""}
                      </p>
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-slate-700">{item.explanation}</p>
                </article>
              ))}
            </div>
          </section>
        ) : exam && current ? (
          <section className="mt-7 rounded-3xl border border-white bg-white/95 p-5 shadow-[0_18px_50px_rgba(29,35,66,.08)] sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-indigo-700">{exam.courseName} · {exam.subjectName}</p>
                <h2 className="mt-1 text-xl font-black">Question {currentQuestion + 1} of {exam.questions.length}</h2>
              </div>
              <p className="text-sm font-semibold text-slate-500">
                {answers.filter((answer) => answer !== null).length} answered · {answers.filter((answer) => answer === null).length} remaining
              </p>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${((currentQuestion + 1) / exam.questions.length) * 100}%` }} />
            </div>
            <div className="mt-6 flex flex-wrap gap-2" aria-label="Question navigation">
              {exam.questions.map((question, index) => (
                <button
                  key={question.number}
                  onClick={() => setCurrentQuestion(index)}
                  aria-label={`Go to question ${index + 1}`}
                  aria-current={currentQuestion === index ? "step" : undefined}
                  className={`grid h-9 w-9 place-items-center rounded-lg text-sm font-bold ${currentQuestion === index ? "bg-indigo-600 text-white" : answers[index] !== null ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            <article className="mt-7">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{current.topic} · {current.difficulty}</p>
              <h3 className="mt-2 text-lg font-bold leading-7">{current.questionText}</h3>
              <div className="mt-5 grid gap-3">
                {current.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => setAnswers((old) => old.map((answer, answerIndex) => answerIndex === currentQuestion ? index : answer))}
                    aria-pressed={answers[currentQuestion] === index}
                    className={`rounded-xl border p-4 text-left text-sm transition ${answers[currentQuestion] === index ? "border-indigo-500 bg-indigo-50 font-bold text-indigo-900 ring-2 ring-indigo-100" : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"}`}
                  >
                    <span className="mr-3 inline-grid h-7 w-7 place-items-center rounded-lg bg-white text-xs font-black shadow-sm">{String.fromCharCode(65 + index)}</span>
                    {option}
                  </button>
                ))}
              </div>
            </article>
            <div className="mt-7 flex flex-wrap justify-between gap-3 border-t pt-5">
              <button
                disabled={currentQuestion === 0}
                onClick={() => setCurrentQuestion((index) => Math.max(0, index - 1))}
                className="rounded-xl border px-4 py-2.5 text-sm font-bold disabled:opacity-40"
              >
                ← Previous
              </button>
              {currentQuestion < exam.questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQuestion((index) => Math.min(exam.questions.length - 1, index + 1))}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white"
                >
                  Next →
                </button>
              ) : (
                <button
                  disabled={busy}
                  onClick={() => void submitExam()}
                  className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {busy ? "Submitting…" : "Submit exam"}
                </button>
              )}
            </div>
          </section>
        ) : (
          <section className="mt-7 grid gap-5">
            {isAdmin ? (
              <div className="rounded-3xl border border-white bg-white/95 p-5 shadow-[0_18px_50px_rgba(29,35,66,.08)] sm:p-8">
                <div>
                  <h2 className="text-xl font-black text-[#202949]">Admin test preview</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Preview the active question bank and answer key. Admin previews do not create attempts or certificates.
                  </p>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleSubjects.map((subject) => (
                    <button
                      key={subject._id}
                      onClick={() => void previewAdminTest(subject._id)}
                      disabled={busy}
                      className={`rounded-2xl border p-4 text-left transition disabled:opacity-50 ${selectedSubject === subject._id ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/10" : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30"}`}
                    >
                      <span className="block font-black text-[#202949]">{subject.name}</span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {subject.category} · {subject.questionCount} active questions
                      </span>
                    </button>
                  ))}
                  {!visibleSubjects.length && (
                    <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 sm:col-span-2 lg:col-span-3">
                      No subjects match your search.
                    </p>
                  )}
                </div>
                {busy && selectedSubject && (
                  <p role="status" className="mt-5 text-sm text-slate-500">
                    Loading test preview…
                  </p>
                )}
                {previewQuestions && (
                  <div className="mt-6 space-y-4">
                    <h3 className="text-lg font-black">
                      {subjects.find((subject) => subject._id === selectedSubject)?.name} · Question preview ({previewQuestions.length})
                    </h3>
                    {previewQuestions.map((question, index) => (
                      <article key={question._id} className="rounded-2xl border border-slate-200 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          {index + 1}. {question.topic} · {question.difficulty}
                        </p>
                        <h4 className="mt-2 font-bold">{question.questionText}</h4>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {question.options.map((option, optionIndex) => (
                            <p
                              key={`${question._id}-${optionIndex}`}
                              className={`rounded-lg px-3 py-2 text-sm ${optionIndex === question.correctAnswer ? "bg-emerald-50 font-bold text-emerald-800" : "bg-slate-50 text-slate-600"}`}
                            >
                              {String.fromCharCode(65 + optionIndex)}. {option}
                              {optionIndex === question.correctAnswer ? " · Correct answer" : ""}
                            </p>
                          ))}
                        </div>
                        <p className="mt-3 text-sm text-slate-600">{question.explanation}</p>
                      </article>
                    ))}
                    {!previewQuestions.length && (
                      <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                        This subject has no active questions to preview.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : !courses.length ? (
              <div className="rounded-3xl border bg-white p-8 text-center">
                <h2 className="text-xl font-black">No completed courses yet</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Finish every required published lesson in a course to unlock its final exam.
                </p>
                <Link href={dashboardHref} className="mt-4 inline-block font-bold text-indigo-700">Return to dashboard</Link>
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  {courses.map((course) => (
                    <article key={course.id} className={`group rounded-[1.75rem] border bg-white/90 p-5 shadow-[0_12px_32px_rgba(29,35,66,.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${selectedCourse === course.id ? "border-indigo-500 ring-2 ring-indigo-500/15" : "border-white"}`}>
                      <button onClick={() => { setSelectedCourse(course.id); setSelectedSubject(""); setResult(null); }} className="w-full text-left">
                        <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-lg font-black text-white shadow-md" aria-hidden="true">
                          {course.name.trim().charAt(0).toUpperCase()}
                        </span>
                        <h2 className="text-lg font-black text-[#202949]">{course.name}</h2>
                        <p className="mt-1 text-sm text-slate-500">Final assessment unlocked</p>
                      </button>
                      {!!course.attempts.length && (
                        <div className="mt-4 border-t pt-3">
                          <h3 className="text-xs font-black uppercase tracking-wide text-slate-500">Previous attempts</h3>
                          <div className="mt-2 space-y-2">
                            {course.attempts.map((attempt) => (
                              <button key={attempt.id} onClick={() => void openAttempt(attempt.id)} className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-left text-sm transition hover:border-[#d9d0eb] hover:bg-[#f7f4fb]">
                                <span className="min-w-0 truncate text-slate-700">{attempt.subject} · Attempt {attempt.attemptNumber}</span>
                                <span className="shrink-0 font-bold text-indigo-700">{attempt.status === "in-progress" ? "Resume →" : `${attempt.score}/100 · Review`}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
                {selectedCourseInfo && (
                  <div className="rounded-[1.9rem] border border-white bg-white/95 p-5 shadow-[0_18px_50px_rgba(29,35,66,.08)] sm:p-7">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-[.2em] text-indigo-600">Exam configuration</span>
                        <h2 className="mt-1 text-xl font-black text-[#202949]">Set up your final exam</h2>
                      </div>
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{selectedCourseInfo.name}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{selectedCourseInfo.name}</p>
                    <label className="mt-5 block text-sm font-bold">
                      Name shown on your certificate
                      <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={100} className="mt-2 h-12 w-full rounded-xl border px-4 font-normal" />
                    </label>
                    <h3 className="mt-5 text-sm font-bold">Choose a subject</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
                      <label className="sr-only" htmlFor="exam-subject-search">
                        Search subjects
                      </label>
                      <input
                        id="exam-subject-search"
                        type="search"
                        value={subjectSearch}
                        onChange={(event) => setSubjectSearch(event.target.value)}
                        placeholder="Search technologies and subjects"
                        className="h-11 rounded-xl border px-4 text-sm"
                      />
                      <label className="sr-only" htmlFor="exam-subject-category">
                        Filter subjects by category
                      </label>
                      <select
                        id="exam-subject-category"
                        value={subjectCategory}
                        onChange={(event) => setSubjectCategory(event.target.value)}
                        className="h-11 rounded-xl border bg-white px-3 text-sm"
                      >
                        <option>All categories</option>
                        {subjectCategories.map((category) => (
                          <option key={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {visibleSubjects.map((subject) => (
                        <button
                          key={subject._id}
                          disabled={!subject.examAvailable}
                          onClick={() => setSelectedSubject(subject._id)}
                          className={`rounded-[1.6rem] border p-4 text-left transition duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${selectedSubject === subject._id ? "border-indigo-500 bg-indigo-50 shadow-sm ring-2 ring-indigo-500/10" : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/30"}`}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="font-black text-[#202949]">{subject.name}</span>
                            {subject.examAvailable && <span aria-label="Exam available" className="text-[#9a7a39]">✦</span>}
                          </span>
                          <span className="mt-1 block text-xs text-slate-500">{subject.category} · {subject.questionCount} questions</span>
                          {!subject.examAvailable && <span className="mt-2 block text-xs text-amber-700">Question bank in progress</span>}
                        </button>
                      ))}
                      {!visibleSubjects.length && (
                        <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 sm:col-span-2 lg:col-span-3">
                          No subjects match your search.
                        </p>
                      )}
                    </div>
                    <div className="mt-5 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-white p-4 text-sm leading-6 text-slate-600 sm:p-5">
                      <b className="text-indigo-800">Before you begin</b>
                      <p className="mt-1">20 multiple-choice questions · 5 marks each · 75/100 to pass · 3 attempts maximum. Navigate between questions and change answers until submission. Correct answers are shown only after submitting.</p>
                    </div>
                    <button
                      disabled={!selectedSubject || displayName.trim().length < 2 || busy}
                      onClick={() => void startExam()}
                      className="mt-5 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-900/15 transition hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                    >
                      {busy ? "Starting…" : "Start final exam"}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

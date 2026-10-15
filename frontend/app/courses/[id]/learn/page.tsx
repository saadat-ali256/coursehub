"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CourseHubLoader from "@/components/CourseHubLoader";
import CourseHubLogo from "@/components/CourseHubLogo";

interface Course {
  _id: string;
  name: string;
  description: string;
}

interface Lesson {
  _id: string;
  title: string;
  duration?: number;
  type?: string;
}

export default function LearnCoursePage() {
  const params = useParams();
  const router = useRouter();

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const courseId = String(params.id);

  useEffect(() => {
    let active = true;
    let redirecting = false;

    async function loadCourse() {
      setLoading(true);
      setError("");
      try {
        const courseResponse = await fetch(`/api/courses/${courseId}`);
        const courseData = await courseResponse.json();
        if (!courseResponse.ok || !courseData.success) {
          throw new Error(courseData.message || "Course could not be loaded.");
        }

        const accessResponse = await fetch(`/api/courses/${courseId}/access`);
        const accessData = await accessResponse.json();
        if (
          accessResponse.status === 401 ||
          accessResponse.status === 403 ||
          (accessResponse.ok && !accessData.hasAccess)
        ) {
          redirecting = true;
          router.replace(
            `/subscriptions?next=${encodeURIComponent(`/courses/${courseId}`)}`,
          );
          return;
        }
        if (!accessResponse.ok || !accessData.hasAccess) {
          throw new Error(
            accessData.message || "Could not verify course access.",
          );
        }

        const lessonsResponse = await fetch(
          `/api/courses/${courseId}/lessons`,
        );
        const lessonsData = await lessonsResponse.json();
        if (!lessonsResponse.ok || !lessonsData.success) {
          throw new Error(lessonsData.message || "Course lessons could not be loaded.");
        }

        if (active) {
          setCourse(courseData.course);
          setLessons(lessonsData.lessons || []);
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Course could not be loaded. Please try again.",
          );
        }
      } finally {
        if (active && !redirecting) setLoading(false);
      }
    }

    void loadCourse();
    return () => {
      active = false;
    };
  }, [courseId, retryCount, router]);

  if (loading) {
    return <CourseHubLoader fullScreen label="Checking course access..." />;
  }

  if (!course) {
    return (
      <main className="grid min-h-screen place-items-center bg-gray-100 px-6">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold">Course unavailable</h1>
          <p className="mt-2 text-gray-600">
            {error || "This course could not be loaded."}
          </p>
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="coursehub-page min-h-screen bg-gray-100">
      <nav className="bg-white border-b">
        <div className="site-navbar-inner mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <button
            onClick={() => router.push("/")}
            className="navbar-wordmark text-2xl font-black"
          >
            <CourseHubLogo size="sm" />
          </button>

          <button
            onClick={() => router.push("/dashboard")}
            className="border px-4 py-2 rounded-lg"
          >
            Dashboard
          </button>
        </div>
      </nav>

      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <p className="text-sm text-gray-500 mb-2">My Course</p>

          <h1 className="text-4xl font-bold mb-4">{course.name}</h1>

          <p className="text-gray-600 mb-8">{course.description}</p>

          <div className="border rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4">Course Content</h2>

            <div className="space-y-3">
              {lessons.map((lesson, index) => (
                <div
                  key={lesson._id}
                  className="flex items-center justify-between gap-4 rounded-lg border p-4"
                >
                  <p className="font-semibold">
                    Lesson {index + 1} — {lesson.title}
                  </p>
                  <span className="shrink-0 text-sm text-gray-500">
                    {lesson.duration || 0} min
                  </span>
                </div>
              ))}
              {!lessons.length && (
                <p className="rounded-lg bg-gray-50 p-4 text-gray-600">
                  No published lessons are available yet.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => router.push(`/courses/${courseId}`)}
              className="mt-6 w-full rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white"
            >
              Open course player
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CategoryPicker from "@/components/admin/CategoryPicker";
import CourseHubLoader, { CSpinner } from "@/components/CourseHubLoader";

interface Course {
  _id: string;
  name: string;
}

export default function CreateLessonPage() {
  const router = useRouter();

  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState("");
  const [category, setCategory] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [order, setOrder] = useState("1");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");

  async function loadCourses() {
    try {
      const response = await fetch("/api/admin/courses");

      const data = await response.json();

      if (!data.success) {
        setMessage("Failed to load courses.");
        setLoading(false);
        return;
      }

      setCourses(data.courses);

      if (data.courses.length > 0) {
        setCourseId(data.courses[0]._id);
      }

      setLoading(false);
    } catch (error) {
      console.error(error);

      setMessage("Failed to load courses.");
      setLoading(false);
    }
  }

  useEffect(() => {
    // The loader only updates state after its asynchronous API request returns.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCourses();
  }, []);

  async function handleCreateLesson(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMessage("");
    setCreating(true);

    try {
      const response = await fetch(`/api/courses/${courseId}/lessons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          content,
          category,
          order: Number(order),
          type: "article",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message);
        setCreating(false);
        return;
      }

      setMessage("Lesson created successfully!");

      setTitle("");
      setDescription("");
      setContent("");
      setCategory("");
      setOrder("1");

      setCreating(false);
    } catch (error) {
      console.error(error);

      setMessage("Something went wrong.");
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <CourseHubLoader fullScreen label="Loading courses..." />
    );
  }

  return (
    <main className="admin-workspace min-h-screen bg-gray-100">
      <nav className="bg-white border-b">
        <div className="site-navbar-inner mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <button
            onClick={() => router.push("/")}
            className="text-2xl font-bold"
          >
            CourseHub
          </button>

          <button
            onClick={() => router.push("/dashboard")}
            className="border px-4 py-2 rounded-lg"
          >
            Dashboard
          </button>
        </div>
      </nav>

      <section className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h1 className="text-3xl font-bold mb-2">Create Lesson</h1>

          <p className="text-gray-500 mb-8">Add a lesson to a course.</p>

          {courses.length === 0 ? (
            <div className="text-center">
              <p className="text-gray-500">No courses available.</p>

              <button
                onClick={() => router.push("/admin/courses/new")}
                className="mt-4 bg-black text-white px-5 py-2 rounded-lg"
              >
                Create Course First
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreateLesson} className="space-y-5">
              {/* Course */}
              <div>
                <label className="block font-medium mb-2">Course</label>

                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full border rounded-lg px-4 py-3"
                  required
                >
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>

              <CategoryPicker value={category} onChange={setCategory} />

              {/* Title */}
              <div>
                <label className="block font-medium mb-2">Lesson Title</label>

                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Example: Introduction to Python"
                  className="w-full border rounded-lg px-4 py-3"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block font-medium mb-2">
                  Lesson Description
                </label>

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description of the lesson"
                  rows={3}
                  className="w-full border rounded-lg px-4 py-3"
                  required
                />
              </div>

              {/* Content */}
              <div>
                <label className="block font-medium mb-2">Lesson Content</label>

                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write the lesson content here..."
                  rows={8}
                  className="w-full border rounded-lg px-4 py-3"
                  required
                />
              </div>

              {/* Order */}
              <div>
                <label className="block font-medium mb-2">Lesson Order</label>

                <input
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(e.target.value)}
                  min="1"
                  className="w-full border rounded-lg px-4 py-3"
                  required
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={creating}
                className="w-full bg-black text-white py-3 rounded-lg disabled:opacity-50"
              >
                {creating ? <><CSpinner className="coursehub-loader__mark--small" /> Creating Lesson...</> : "Create Lesson"}
              </button>
            </form>
          )}

          {message && (
            <p className="text-center mt-5 text-gray-700">{message}</p>
          )}
        </div>
      </section>
    </main>
  );
}

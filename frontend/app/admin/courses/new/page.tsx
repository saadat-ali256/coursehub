"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CategoryPicker from "@/components/admin/CategoryPicker";
import { CSpinner } from "@/components/CourseHubLoader";

export default function CreateCoursePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [interval, setInterval] = useState("month");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreateCourse(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          price: Number(price),
          interval,
          category,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message);
        setLoading(false);
        return;
      }

      setMessage("Course created successfully!");

      setName("");
      setDescription("");
      setCategory("");
      setPrice("");
      setInterval("month");

      setLoading(false);
    } catch (error) {
      console.error(error);

      setMessage("Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <main className="admin-workspace min-h-screen bg-gray-100">
      {/* Navbar */}
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

      {/* Form */}
      <section className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h1 className="text-3xl font-bold mb-2">Create Course</h1>

          <p className="text-gray-500 mb-8">Add a new course to CourseHub.</p>

          <form onSubmit={handleCreateCourse} className="space-y-5">
            {/* Course Name */}
            <div>
              <label className="block font-medium mb-2">Course Name</label>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Example: Python Course"
                className="w-full border rounded-lg px-4 py-3"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block font-medium mb-2">Description</label>

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Course description"
                rows={5}
                className="w-full border rounded-lg px-4 py-3"
                required
              />
            </div>

            <CategoryPicker
              value={category}
              onChange={setCategory}
            />

            {/* Price */}
            <div>
              <label className="block font-medium mb-2">Price</label>

              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="10"
                min="0"
                className="w-full border rounded-lg px-4 py-3"
                required
              />
            </div>

            {/* Interval */}
            <div>
              <label className="block font-medium mb-2">Billing Interval</label>

              <select
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
                className="w-full border rounded-lg px-4 py-3"
              >
                <option value="month">Monthly</option>

                <option value="year">Yearly</option>
              </select>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-3 rounded-lg disabled:opacity-50"
            >
              {loading ? <><CSpinner className="coursehub-loader__mark--small" /> Creating Course...</> : "Create Course"}
            </button>
          </form>

          {/* Message */}
          {message && (
            <p className="text-center mt-5 text-gray-700">{message}</p>
          )}
        </div>
      </section>
    </main>
  );
}

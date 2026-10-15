export async function syncCourseHubProfile(
  getToken: () => Promise<string | null>,
) {
  const token = await getToken();
  if (!token) throw new Error("Could not retrieve your Clerk session. Please sign in again.");

  const response = await fetch("/api/auth/sync", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.message || "Unable to set up your CourseHub account.");
  return data;
}

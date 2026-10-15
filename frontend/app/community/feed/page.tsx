
/* AUTO-FORMATTED FOR READABILITY */
/* Page: renders the UI for this route. */
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import CourseHubLogo from "@/components/CourseHubLogo";

type FeedUser = {
  _id?: string;
  id?: string;
  name?: string;
  username?: string;
  avatarUrl?: string;
  coverImage?: string;
  bio?: string;
  role?: string;
  adminPermissions?: string[];
  communityAccess?: boolean;
  lastSeenAt?: string;
  isSubscriber?: boolean;
};

type FeedComment = {
  _id: string;
  userId: FeedUser | string | null;
  text: string;
};

type FeedPost = {
  _id: string;
  userId: FeedUser | string | null;
  text?: string;
  imageUrl?: string;
  contentUrl?: string;
  contentTitle?: string;
  contentImage?: string;
  createdAt: string;
  likes?: string[];
  commentCount?: number;
};

/* NEW COURSES
   These fields are intentionally flexible so the feed can work with
   common CourseHub course fields such as image, thumbnail, title, slug, etc.
*/
type FeedCourse = {
  _id?: string;
  id?: string;
  title?: string;
  name?: string;
  description?: string;
  shortDescription?: string;
  image?: string;
  imageUrl?: string;
  thumbnail?: string;
  thumbnailUrl?: string;
  slug?: string;
  createdAt?: string;
};

type CommunityMeeting = {
  meetingUrl: string;
};

function Avatar({
  user,
  size = "h-11 w-11",
}: {
  user: FeedUser | string | null;
  size?: string;
}) {
  const [failed, setFailed] = useState(false);
  const profileUser = typeof user === "object" && user ? user : null;

  return profileUser?.avatarUrl && !failed ? (
    <Image
      src={profileUser.avatarUrl}
      alt={`${profileUser.name || "User"} profile`}
      onError={() => setFailed(true)}
      className={`${size} rounded-full object-cover`}
      width={44}
      height={44}
      unoptimized
    />
  ) : (
    <div
      className={`${size} grid place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 font-black text-white`}
    >
      {profileUser?.name?.[0]?.toUpperCase() || "U"}
    </div>
  );
}

function PostImage({ imageUrl }: { imageUrl: string }) {
  const [failed, setFailed] = useState(false);

  const safeUrl = (() => {
    if (imageUrl.startsWith("/uploads/") && !imageUrl.startsWith("//")) {
      return imageUrl;
    }

    try {
      const parsed = new URL(imageUrl);

      return parsed.protocol === "https:" || parsed.protocol === "http:"
        ? parsed.href
        : "";
    } catch {
      return "";
    }
  })();

  if (failed || !safeUrl) {
    return (
      <div className="grid min-h-48 place-items-center bg-slate-100 px-5 text-center text-sm text-slate-500">
        This image is no longer available.
      </div>
    );
  }

  return (
    <a
      href={safeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-slate-50"
    >
      <Image
        src={safeUrl}
        alt="Image shared in a community post"
        onError={() => setFailed(true)}
        className="mx-auto max-h-[700px] w-full object-contain"
        width={1200}
        height={800}
        unoptimized
      />
    </a>
  );
}

export default function CommunityFeed() {
  const router = useRouter();

  const [posts, setPosts] = useState<FeedPost[]>([]);

  // NEW COURSES: latest courses shown above the community posts.
  const [courses, setCourses] = useState<FeedCourse[]>([]);

  const [reactionOpen, setReactionOpen] = useState<Record<string, boolean>>(
    {},
  );
  const [me, setMe] = useState<FeedUser | null>(null);
  const [meeting, setMeeting] = useState<CommunityMeeting | null>(null);
  const [modal, setModal] = useState(false);
  const [text, setText] = useState("");
  const [image, setImage] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [users, setUsers] = useState<FeedUser[]>([]);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const [openComments, setOpenComments] = useState<
    Record<string, FeedComment[] | undefined>
  >({});
  const [openPostMenu, setOpenPostMenu] = useState<string | null>(null);
  const [comment, setComment] = useState<Record<string, string>>({});

  async function load() {
    // Load community posts.
    const r = await fetch("/api/community/posts");

    const d: {
      posts?: FeedPost[];
      message?: string;
    } = await r.json();

    if (r.ok) {
      setPosts(d.posts || []);
    } else {
      console.error(d.message || "Could not load community posts.");
    }

    // NEW COURSES: load the latest courses from the CourseHub API.
    // Expected response: { success: true, courses: [...] }
    try {
      const courseResponse = await fetch("/api/courses");
      const courseData: {
        courses?: FeedCourse[];
      } = await courseResponse.json();

      if (courseResponse.ok) {
        const latestCourses = (courseData.courses || [])
          .filter((course) => course && (course._id || course.id))
          .sort((a, b) => {
            const aTime = a.createdAt
              ? new Date(a.createdAt).getTime()
              : 0;
            const bTime = b.createdAt
              ? new Date(b.createdAt).getTime()
              : 0;

            return bTime - aTime;
          })
          .slice(0, 4);

        setCourses(latestCourses);
      }
    } catch (error) {
      // Course loading should not break the community feed.
      console.error("Could not load new courses.", error);
    }
  }

  useEffect(() => {
    load();

    fetch("/api/community/meeting")
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as {
          meeting?: CommunityMeeting | null;
        };
      })
      .then((data) => {
        if (data) setMeeting(data.meeting || null);
      })
      .catch((error) => {
        console.error("Could not load community live meeting.", error);
      });

    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((d) => {
        if (!d?.user) return;
        setMe(d.user);
        return fetch("/api/community/presence", { method: "POST" });
      })
      .catch((error) =>
        console.error("Could not load your profile.", error),
      );
  }, []);

  useEffect(() => {
    function closeCommentsOutside(event: PointerEvent) {
      const target = event.target;
      if (
        target instanceof Element &&
        (target.closest("[data-feed-comments]") ||
          target.closest("[data-comments-toggle]") ||
          target.closest("[data-post-menu]") ||
          target.closest("[data-post-menu-toggle]"))
      )
        return;
      setOpenComments((current) =>
        Object.keys(current).length ? {} : current,
      );
      setOpenPostMenu(null);
    }
    function closeOverlaysOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSearchDropdownOpen(false);
        setOpenComments((current) =>
          Object.keys(current).length ? {} : current,
        );
        setOpenPostMenu(null);
      }
    }
    document.addEventListener("pointerdown", closeCommentsOutside);
    document.addEventListener("keydown", closeOverlaysOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeCommentsOutside);
      document.removeEventListener("keydown", closeOverlaysOnEscape);
    };
  }, []);

  useEffect(() => {
    function closeSearchOnOutsideClick(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !searchDropdownRef.current?.contains(event.target)
      ) {
        setSearchDropdownOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeSearchOnOutsideClick);
    return () =>
      document.removeEventListener("pointerdown", closeSearchOnOutsideClick);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (search.trim().length > 1) {
        fetch(
          "/api/community/users?q=" + encodeURIComponent(search),
        )
          .then((r) => r.json())
          .then((d) => setUsers(d.users || []));
      } else {
        setUsers([]);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [search]);

  async function upload(file: File) {
    const fd = new FormData();

    fd.append("file", file);

    const r = await fetch("/api/community/upload", {
      method: "POST",
      body: fd,
    });

    const d = await r.json();

    if (r.ok) {
      setImage(d.url);
    } else {
      alert(d.message || "Upload failed");
    }
  }

  async function create() {
    if (!text.trim() && !image) return;

    setBusy(true);

    const r = await fetch("/api/community/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        imageUrl: image,
      }),
    });

    if (r.ok) {
      setText("");
      setImage("");
      setModal(false);
      await load();
    } else {
      alert((await r.json()).message || "Could not post");
    }

    setBusy(false);
  }

  async function action(
    id: string,
    action: string,
    extra?: Record<string, string>,
  ) {
    const r = await fetch("/api/community/posts/" + id, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
        ...extra,
      }),
    });

    if (r.ok) {
      load();
    }
  }

  async function comments(id: string) {
    const d = await fetch(
      "/api/community/posts/" + id,
    ).then((r) => r.json());

    setOpenComments((current) =>
      current[id] ? { ...current, [id]: d.comments || [] } : current,
    );
  }

  function toggleComments(id: string) {
    if (openComments[id]) {
      setOpenComments({});
      return;
    }
    setOpenComments({ [id]: [] });
    void comments(id);
  }

  async function sharePost(post: FeedPost) {
    if (!me?.communityAccess) {
      router.push("/subscriptions");
      return;
    }
    const authorId = profileId(post.userId);
    const path = authorId
      ? `/community/profile/${encodeURIComponent(authorId)}#post-${encodeURIComponent(post._id)}`
      : `/community/feed#post-${encodeURIComponent(post._id)}`;
    try {
      const link = ["localhost", "127.0.0.1"].includes(window.location.hostname)
        ? path
        : new URL(path, window.location.origin).href;
      await navigator.clipboard.writeText(link);
      window.alert("Post link copied.");
    } catch (error) {
      console.error("Could not copy post link.", error);
      window.alert("Could not copy the post link. Please check clipboard permissions.");
    }
  }

  async function addComment(id: string) {
    const t = comment[id]?.trim();

    if (!t) return;

    await action(id, "comment", {
      text: t,
    });

    setComment((x) => ({
      ...x,
      [id]: "",
    }));

    comments(id);
  }

  async function remove(id: string) {
    setOpenPostMenu(null);
    try {
      const r = await fetch(
        "/api/community/posts/" + id,
        {
          method: "DELETE",
        },
      );
      const result = await r.json();
      if (!r.ok) {
        window.alert(result.message || "Could not delete this post.");
        return;
      }
      setPosts((current) => current.filter((post) => post._id !== id));
      setOpenComments((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    } catch (error) {
      console.error("Could not delete community post.", error);
      window.alert("Could not delete this post. Please try again.");
    }
  }

  // NEW COURSES: return a course ID for the View Course button.
  const courseId = (course: FeedCourse) =>
    course._id || course.id || "";

  // NEW COURSES: choose whichever title field exists in the API response.
  const courseTitle = (course: FeedCourse) =>
    course.title || course.name || "New Course";

  // NEW COURSES: choose whichever image field exists.
  const courseImage = (course: FeedCourse) =>
    course.imageUrl ||
    course.image ||
    course.thumbnailUrl ||
    course.thumbnail ||
    "";

  // NEW COURSES: choose a short description for the card.
  const courseDescription = (course: FeedCourse) =>
    course.shortDescription ||
    course.description ||
    "Start learning this new CourseHub course.";

  // NEW COURSES: build the course URL. Slug is preferred when available.
  const courseUrl = (course: FeedCourse) =>
    course.slug
      ? `/courses/${encodeURIComponent(course.slug)}`
      : `/courses/${encodeURIComponent(courseId(course))}`;

  const profileId = (
    user: FeedUser | string | null | undefined,
  ) =>
    typeof user === "string"
      ? user
      : user?._id || user?.id || "";

  const userName = (
    user: FeedUser | string | null | undefined,
  ) =>
    typeof user === "object" && user
      ? user.name
      : undefined;

  const openProfile = (
    user: FeedUser | string | null | undefined,
  ) => {
    const id = profileId(user);

    if (id) {
      router.push(
        `/community/profile/${encodeURIComponent(id)}`,
      );
    }
  };

  const visible = posts.filter(
    (p) =>
      !search ||
      userName(p.userId)
        ?.toLowerCase()
        .includes(search.toLowerCase()) ||
      p.text
        ?.toLowerCase()
        .includes(search.toLowerCase()),
  );

  return (
    <main className="coursehub-page min-h-screen bg-[radial-gradient(circle_at_10%_0%,#e0e7ff,transparent_28%),radial-gradient(circle_at_90%_10%,#cffafe,transparent_24%),#eef2f7] pb-16 text-[#172033] md:pb-0">

      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
        <div className="site-navbar-inner relative mx-auto flex h-[74px] w-full items-center gap-2 px-4 sm:gap-3 sm:px-5 lg:px-8 md:h-20">

          <button
            onClick={() => router.push("/")}
            className="navbar-wordmark shrink-0 text-xl font-black sm:text-2xl"
          >
            <CourseHubLogo size="sm" />
          </button>

          <div className="ml-auto hidden shrink-0 rounded-2xl bg-slate-100 p-1 md:flex lg:absolute lg:left-1/2 lg:ml-0 lg:-translate-x-1/2">
            {me?.communityAccess && (
              <button
                onClick={() => router.push("/community")}
                className="rounded-xl px-2 py-2 text-xs font-bold text-slate-500 sm:px-4 sm:text-sm"
              >
                <span className="sm:hidden">Chat</span>
                <span className="hidden sm:inline">💬 Chat</span>
              </button>
            )}

            <button className="rounded-xl bg-white px-2 py-2 text-xs font-black shadow-sm sm:px-4 sm:text-sm">
              <span className="sm:hidden">
                Feed
              </span>
              <span className="hidden sm:inline">
                📰 Feed
              </span>
            </button>

            {me?.communityAccess && (
              <button
                onClick={() => router.push("/community/messages")}
                aria-label="Open private messages"
                className="rounded-xl px-2 py-2 text-xs font-bold text-slate-500 hover:bg-white hover:text-indigo-700 sm:px-3 sm:text-sm"
              >
                <span className="sm:hidden">DMs</span>
                <span className="hidden sm:inline">✉ Messages</span>
              </button>
            )}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {meeting && (
              <a
                href={meeting.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Join live meeting"
                title="Live Meeting"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-lg transition hover:bg-emerald-100 sm:w-auto sm:gap-2 sm:px-3"
              >
                🎥
                <span className="hidden text-sm font-bold text-emerald-800 sm:inline">
                  Live Meeting
                </span>
              </a>
            )}
            <div className="relative" ref={searchDropdownRef}>
              <button
                type="button"
                aria-label="Search community"
                aria-expanded={searchDropdownOpen}
                aria-controls="community-search-dropdown"
                onClick={() => setSearchDropdownOpen((open) => !open)}
                className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-5 w-5"
                >
                  <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="2" />
                  <path d="m16 16 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>

              {searchDropdownOpen && (
                <div
                  id="community-search-dropdown"
                  className="absolute right-0 top-12 z-[70] w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl"
                >
                  <input
                    autoFocus
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search @username or posts..."
                    aria-label="Search usernames or posts"
                    className="w-full rounded-xl bg-slate-100 px-4 py-2.5 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-indigo-200"
                  />

                  {users.length > 0 && (
                    <div className="mt-2 max-h-72 overflow-y-auto">
                      {users.map((user) => (
                        <button
                          key={user._id}
                          type="button"
                          onClick={() => openProfile(user)}
                          className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-slate-50"
                        >
                          <Avatar user={user} size="h-9 w-9" />
                          <span className="min-w-0 flex-1">
                            <b className="block truncate">{user.name}</b>
                            <span className="text-xs text-slate-400">
                              @{user.username || "username unavailable"}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs font-bold text-indigo-600">
                            Profile →
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => router.push("/dashboard")}
              className="hidden shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white sm:block"
            >
              Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT
          PC: almost full width with small side spacing
          Mobile: normal responsive padding
      */}
<div className="desktop-content-width mx-auto grid w-full max-w-none gap-5 px-3 py-6 sm:px-4 lg:grid-cols-[317px_minmax(0,1fr)] lg:px-6 xl:px-8 lg:items-start">
        {/* SIDEBAR */}
  <aside className="hidden lg:sticky lg:top-[94px] lg:block lg:self-start">
          <section className="overflow-hidden rounded-2xl bg-white shadow-sm">

            <div
              className="h-16 bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-500 bg-cover bg-center"
              style={
                me?.coverImage
                  ? { backgroundImage: `url("${me.coverImage}")` }
                  : undefined
              }
            />

            <div className="-mt-8 px-4">

              <button
                onClick={() => openProfile(me)}
                aria-label="Open your profile"
                className="rounded-full ring-4 ring-white"
                disabled={!profileId(me)}
              >
                <Avatar
                  user={me}
                  size="h-16 w-16"
                />
              </button>

              <button
                onClick={() => openProfile(me)}
                disabled={!profileId(me)}
                className="mt-2 block text-left font-black hover:text-indigo-600 disabled:cursor-default"
              >
                {me?.name || "Your profile"}
              </button>

              <p className="mt-1 break-words text-sm leading-5 text-slate-500">
                {me?.bio ||
                  "Add a short bio and profile photo to introduce yourself to the community."}
              </p>

              {me?.username && (
                <p className="mt-2 text-xs font-bold text-slate-500">
                  @{me.username}
                </p>
              )}

              <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Learning community
              </div>

              <button
                onClick={() => openProfile(me)}
                disabled={!profileId(me)}
                className="mb-4 mt-4 w-full rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed"
              >
                View / edit profile
              </button>
            </div>

            <div className="border-t px-4 py-3">
              {me?.communityAccess && (
                <button
                  onClick={() => router.push("/community")}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  <span>💬</span>
                  Community chats
                </button>
              )}

              <button
                onClick={() =>
                  router.push("/dashboard")
                }
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                <span>📚</span>
                Learning dashboard
              </button>
            </div>
          </section>
          {courses.length > 0 && (
            <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600">
                    CourseHub
                  </p>
                  <h2 className="text-lg font-black text-slate-900">
                    New Courses
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Discover the latest courses.
                  </p>
                </div>
                <button
                  onClick={() => router.push("/courses")}
                  className="shrink-0 rounded-xl bg-indigo-50 px-2.5 py-2 text-xs font-black text-indigo-700 hover:bg-indigo-100"
                >
                  View all
                </button>
              </div>
              <div className="space-y-3">
                {courses.map((course) => {
                  const image = courseImage(course);
                  const id = courseId(course);
                  return (
                    <article
                      key={id}
                      className="flex items-center gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-2"
                    >
                      {image ? (
                        <Image
                          src={image}
                          alt={courseTitle(course)}
                          className="h-16 w-16 shrink-0 rounded-lg object-cover"
                          width={64}
                          height={64}
                          unoptimized
                        />
                      ) : (
                        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-500 text-2xl">
                          📚
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-sm font-black text-slate-900">
                          {courseTitle(course)}
                        </h3>
                        <button
                          onClick={() => router.push(courseUrl(course))}
                          className="mt-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-black text-white transition hover:bg-indigo-700"
                        >
                          View Course →
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </aside>

        {/* FEED */}
        <section className="min-w-0 w-full lg:h-[calc(100vh-110px)] lg:overflow-y-auto lg:overscroll-contain lg:pr-2">

          <div className="mb-5 space-y-3">

            {/* CREATE POST */}
            <div className="rounded-2xl bg-white p-3 shadow-sm">
              {me && !me.communityAccess && (
                <p className="mb-3 rounded-xl bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
                  You can browse the community feed. Subscribe to join chats and post.
                </p>
              )}
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">

                <button
                  onClick={() =>
                    openProfile(me)
                  }
                  disabled={!profileId(me)}
                  aria-label="Open your profile"
                >
                  <Avatar user={me} />
                </button>

                <div className="hidden min-w-0 sm:block">
                  <button
                    onClick={() =>
                      openProfile(me)
                    }
                    disabled={!profileId(me)}
                    className="block max-w-36 truncate text-left text-sm font-bold hover:text-indigo-600"
                  >
                    {me?.name || "Your profile"}
                  </button>

                  <span className="text-xs text-slate-400">
                    Share with the community
                  </span>
                </div>

                {me?.communityAccess && (
                  <>
                    <button
                      onClick={() => setModal(true)}
                        className="min-w-0 flex-1 truncate rounded-full bg-slate-100 px-3 py-2.5 text-left text-sm text-slate-500 hover:bg-slate-200 sm:px-4"
                    >
                     learning today?
                    </button>
                    <button
                      onClick={() => setModal(true)}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-indigo-600 text-lg text-white sm:h-10 sm:w-10 sm:text-xl"
                      title="Create post"
                        aria-label="Create post"
                      >
                        ＋
                    </button>
                  </>
                )}

                {/* MOBILE NAV */}
                <nav
                  aria-label="Community navigation"
                  className={`fixed inset-x-0 bottom-0 z-40 grid h-14 border-t bg-white md:hidden ${
                    me?.communityAccess ? "grid-cols-3" : "grid-cols-1"
                  }`}
                >
                  {me?.communityAccess && (
                    <button
                      onClick={() => router.push("/community")}
                      className="text-xs font-bold text-slate-600"
                    >
                      💬 Chat
                    </button>
                  )}

                  <button className="border-t-2 border-indigo-600 text-xs font-black text-indigo-700">
                    📰 Feed
                  </button>

                  {me?.communityAccess && (
                    <button
                      onClick={() => router.push("/community/messages")}
                      className="text-xs font-bold text-slate-600"
                    >
                      ✉ Messages
                    </button>
                  )}
                </nav>
              </div>
            </div>

            {/* QUICK CARDS */}
            <div className="grid grid-cols-3 gap-2">

              <div className="rounded-2xl border border-indigo-100 bg-white p-3 text-center shadow-sm">
                <div className="text-xl">
                  📚
                </div>
                <b className="text-xs">
                  Study Progress
                </b>
              </div>

              <div className="rounded-2xl border border-cyan-100 bg-white p-3 text-center shadow-sm">
                <div className="text-xl">
                  🔥
                </div>
                <b className="text-xs">
                  Learning Streak
                </b>
              </div>

              <div className="rounded-2xl border border-violet-100 bg-white p-3 text-center shadow-sm">
                <div className="text-xl">
                  🏆
                </div>
                <b className="text-xs">
                  Achievements
                </b>
              </div>
            </div>

          </div>

          {/* POSTS */}
          {!me?.communityAccess && (
            <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-black text-slate-900">Subscribe to join the community</p>
                <p className="mt-1 text-sm text-slate-600">
                  Subscribe first to edit your profile and like, comment on, or share posts.
                </p>
              </div>
              <button
                onClick={() => router.push("/subscriptions")}
                className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white"
              >
                View subscriptions
              </button>
            </div>
          )}
          {visible.map((p) => (
            <article
              key={p._id}
              id={`post-${p._id}`}
              className="mb-4 overflow-hidden rounded-2xl bg-white shadow-sm"
            >
              <div className="flex items-center gap-3 p-4">

                <button
                  onClick={() =>
                    openProfile(p.userId)
                  }
                  disabled={!profileId(
                    p.userId,
                  )}
                  aria-label={`Open ${
                    userName(p.userId) ||
                    "author"
                  } profile`}
                >
                  <Avatar
                    user={p.userId}
                  />
                </button>

                <div className="min-w-0 flex-1">

                  <div>
                  {profileId(p.userId) ? (
                    <button
                      onClick={() =>
                        openProfile(
                          p.userId,
                        )
                      }
                      className="font-black hover:text-indigo-600"
                    >
                      {userName(p.userId) ||
                        "CourseHub member"}
                    </button>
                  ) : (
                    <b className="font-black">
                      {userName(p.userId) ||
                        "Former CourseHub member"}
                    </b>
                  )}

                  <span className="mt-0.5 block text-xs text-slate-400">
                    {Number.isNaN(
                      new Date(
                        p.createdAt,
                      ).getTime(),
                    )
                      ? "Community post"
                      : new Date(
                          p.createdAt,
                        ).toLocaleString()}
                  </span>
                  </div>

                  {typeof p.userId ===
                    "object" &&
                    p.userId && (
                      <div className="mt-1 flex items-center gap-1.5">

                        {p.userId.role ===
                          "admin" && (
                          <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                            Admin
                          </span>
                        )}

                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            p.userId
                              .isSubscriber
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {p.userId
                            .isSubscriber
                            ? "Subscriber"
                            : "Free member"}
                        </span>
                      </div>
                    )}
                </div>

                {(profileId(
                  p.userId,
                ) ===
                  String(
                    me?.id ||
                      me?._id,
                  ) ||
                  me?.role === "admin" ||
                  me?.adminPermissions?.includes("moderate_feed")) && (
                  <div className="relative" data-post-menu>
                    <button
                      type="button"
                      data-post-menu-toggle
                      aria-label="Post options"
                      aria-haspopup="menu"
                      aria-expanded={openPostMenu === p._id}
                      onClick={() =>
                        setOpenPostMenu((current) =>
                          current === p._id ? null : p._id,
                        )
                      }
                      className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      •••
                    </button>
                    {openPostMenu === p._id && (
                      <div
                        role="menu"
                        className="absolute right-0 top-full z-20 mt-1 min-w-40 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => void remove(p._id)}
                          className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50"
                        >
                          Delete post
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {p.text && (
                <p className="whitespace-pre-wrap px-4 pb-3 text-[15px] leading-7">
                  {p.text}
                </p>
              )}

              {p.contentUrl && p.contentTitle && (
                <button
                  onClick={() => router.push(p.contentUrl!)}
                  className="mx-4 mb-4 block w-[calc(100%-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-left transition hover:border-indigo-300 hover:bg-indigo-50"
                >
                  {p.contentImage && (
                    <Image
                      src={p.contentImage}
                      alt=""
                      className="max-h-64 w-full object-cover"
                      width={960}
                      height={384}
                      unoptimized
                    />
                  )}
                  <span className="block p-4">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-indigo-600">
                      {p.contentUrl.startsWith("/blog/") ? "Study blog" : "New playlist"}
                    </span>
                    <span className="mt-1 block font-black text-slate-900">
                      {p.contentTitle}
                    </span>
                    <span className="mt-2 block text-sm font-bold text-indigo-600">
                      {p.contentUrl.startsWith("/blog/")
                        ? "Read article →"
                        : "Open playlist →"}
                    </span>
                  </span>
                </button>
              )}

              {p.imageUrl && (
                <PostImage
                  imageUrl={
                    p.imageUrl
                  }
                />
              )}

              <div className="flex items-center justify-between px-4 py-2 text-xs text-slate-500">
                <span>
                  👍{" "}
                  {p.likes?.length ||
                    0}{" "}
                  likes
                </span>

                <span>
                  {p.commentCount ||
                    0}{" "}
                  comments
                </span>
              </div>

              {me?.communityAccess && <div className="relative border-t px-2 py-1">

                <div className="grid grid-cols-3">
                  <button
                    onClick={() =>
                      action(
                        p._id,
                        "like",
                      )
                    }
                    onContextMenu={(e) => {
                      e.preventDefault();

                      setReactionOpen(
                        (x) => ({
                          ...x,
                          [p._id]:
                            !x[
                              p._id
                            ],
                        }),
                      );
                    }}
                    className="rounded-xl py-2.5 text-sm font-bold hover:bg-slate-50"
                  >
                    👍 Like
                  </button>

                  <button
                    data-comments-toggle
                    onClick={() => toggleComments(p._id)}
                    className="rounded-xl py-2.5 text-sm font-bold hover:bg-slate-50"
                  >
                    💬 Comment
                  </button>

                  <button
                    onClick={() => void sharePost(p)}
                    className="rounded-xl py-2.5 text-sm font-bold hover:bg-slate-50"
                  >
                    ↗ Share
                  </button>
                </div>

                {reactionOpen[
                  p._id
                ] && (
                  <div className="flex gap-2 px-2 pb-2">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">
                      React
                    </span>

                    {[
                      "❤️",
                      "👍",
                      "😂",
                      "🔥",
                      "👏",
                      "🎉",
                    ].map((e) => (
                      <button
                        key={e}
                        onClick={() => {
                          action(
                            p._id,
                            "reaction",
                            {
                              type: e,
                            },
                          );

                          setReactionOpen(
                            (x) => ({
                              ...x,
                              [p._id]:
                                false,
                            }),
                          );
                        }}
                        className="rounded-full bg-white px-2 py-1 text-lg shadow hover:scale-110"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}
              </div>}

              {/* COMMENTS */}
              {openComments[
                p._id
              ] && (
                <div data-feed-comments className="border-t bg-slate-50 p-4">

                  <div className="space-y-3">
                    {(
                      openComments[
                        p._id
                      ] || []
                    ).map((c) => (
                      <div
                        key={c._id}
                        className="flex gap-2"
                      >
                        <button
                          onClick={() =>
                            openProfile(
                              c.userId,
                            )
                          }
                          disabled={
                            !profileId(
                              c.userId,
                            )
                          }
                          aria-label={`Open ${
                            userName(
                              c.userId,
                            ) ||
                            "commenter"
                          } profile`}
                        >
                          <Avatar
                            user={
                              c.userId
                            }
                            size="h-8 w-8"
                          />
                        </button>

                        <div className="rounded-2xl bg-white px-3 py-2">
                          <button
                            onClick={() =>
                              openProfile(
                                c.userId,
                              )
                            }
                            disabled={
                              !profileId(
                                c.userId,
                              )
                            }
                            className="text-left text-xs font-bold hover:text-indigo-600"
                          >
                            {userName(
                              c.userId,
                            ) ||
                              "CourseHub member"}
                          </button>

                          <p className="text-sm">
                            {c.text}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {me?.communityAccess && <div className="mt-3 flex gap-2">

                    <input
                      value={
                        comment[
                          p._id
                        ] || ""
                      }
                      onChange={(e) =>
                        setComment(
                          (x) => ({
                            ...x,
                            [p._id]:
                              e.target
                                .value,
                          }),
                        )
                      }
                      onKeyDown={(e) =>
                        e.key ===
                          "Enter" &&
                        addComment(
                          p._id,
                        )
                      }
                      placeholder="Write a comment..."
                      className="flex-1 rounded-full border bg-white px-4 py-2.5 text-sm outline-none"
                    />

                    <button
                      onClick={() =>
                        addComment(
                          p._id,
                        )
                      }
                      className="rounded-full bg-indigo-600 px-4 text-sm font-bold text-white"
                    >
                      Send
                    </button>
                  </div>}
                </div>
              )}
            </article>
          ))}

          {!visible.length && (
            <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
              <div className="text-5xl">
                🌱
              </div>

              <h2 className="mt-4 text-xl font-black">
                No posts yet
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Be the first person to
                share your learning
                progress.
              </p>
            </div>
          )}
          {courses.length > 0 && (
            <section className="mt-5 rounded-2xl bg-white p-4 shadow-sm lg:hidden">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600">
                    CourseHub
                  </p>
                  <h2 className="text-lg font-black text-slate-900">
                    New Courses
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Discover the latest courses.
                  </p>
                </div>
                <button
                  onClick={() => router.push("/courses")}
                  className="shrink-0 rounded-xl bg-indigo-50 px-2.5 py-2 text-xs font-black text-indigo-700 hover:bg-indigo-100"
                >
                  View all
                </button>
              </div>
              <div className="space-y-3">
                {courses.map((course) => {
                  const image = courseImage(course);
                  const id = courseId(course);
                  return (
                    <article
                      key={id}
                      className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                    >
                      {image ? (
                        <Image
                          src={image}
                          alt={courseTitle(course)}
                          className="h-28 w-full object-cover"
                          width={448}
                          height={112}
                          unoptimized
                        />
                      ) : (
                        <div className="grid h-20 place-items-center bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-500 text-3xl">
                          📚
                        </div>
                      )}
                      <div className="p-3">
                        <h3 className="line-clamp-2 text-sm font-black text-slate-900">
                          {courseTitle(course)}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                          {courseDescription(course)}
                        </p>
                        <button
                          onClick={() => router.push(courseUrl(course))}
                          className="mt-2 w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-black text-white transition hover:bg-indigo-700"
                        >
                          View Course →
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </section>
      </div>

      {/* FLOATING CREATE BUTTON */}
      {me?.communityAccess && (
        <button
          onClick={() => setModal(true)}
          className="fixed bottom-20 right-3 z-40 grid h-10 w-10 place-items-center rounded-full bg-indigo-600 text-lg font-black text-white shadow-2xl ring-2 ring-white transition hover:scale-105 sm:bottom-7 sm:right-7 sm:h-12 sm:w-12 sm:text-xl"
          title="Create post"
          aria-label="Create post"
        >
          ＋
        </button>
      )}

      {/* CREATE POST MODAL */}
      {modal && me?.communityAccess && (
        <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-slate-950/55 p-3 sm:p-4">

          <div className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:p-5">

            <div className="flex items-center justify-between">

              <div>
                <h2 className="text-xl font-black">
                  Create post
                </h2>

                <p className="text-xs text-slate-400">
                  Share your progress
                  with CourseHub.
                </p>
              </div>

              <button
                onClick={() =>
                  setModal(false)
                }
                className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-lg"
              >
                ×
              </button>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <Avatar user={me} />
              <b>{me?.name || "You"}</b>
            </div>

            <textarea
              autoFocus
              value={text}
              onChange={(e) =>
                setText(e.target.value)
              }
              rows={5}
              placeholder="What do you want to share?"
              className="mt-4 w-full resize-none rounded-2xl border bg-slate-50 p-4 outline-none focus:ring-2 focus:ring-indigo-200"
            />

            {image && (
              <div className="relative mt-3">
                <Image
                  src={image}
                  alt="Post image preview"
                  className="max-h-72 w-full rounded-2xl object-cover"
                  width={960}
                  height={576}
                  unoptimized
                 />

                <button
                  onClick={() =>
                    setImage("")
                  }
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/70 text-white"
                >
                  ×
                </button>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between rounded-2xl border p-3">

              <label className="cursor-pointer rounded-xl px-3 py-2 font-bold hover:bg-slate-50">
                📷 Photo{" "}

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f =
                      e.target.files?.[0];

                    if (f) {
                      upload(f);
                    }
                  }}
                />
              </label>

              <button
                disabled={
                  busy ||
                  (!text.trim() &&
                    !image)
                }
                onClick={create}
                className="rounded-xl bg-indigo-600 px-6 py-2.5 font-bold text-white disabled:opacity-40"
              >
                {busy
                  ? "Posting..."
                  : "Post"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

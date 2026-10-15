/* AUTO-FORMATTED FOR READABILITY */
/* Page: renders the UI for this route. */
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import CourseHubLoader from "@/components/CourseHubLoader";
import CourseHubLogo from "@/components/CourseHubLogo";
type ProfileUser = {
  _id: string;
  id?: string;
  name: string;
  username?: string;
  avatarUrl?: string;
  coverImage?: string;
  bio?: string;
  role?: string;
  communityAccess?: boolean;
  lastSeenAt?: string;
  createdAt: string;
};
type ProfilePost = {
  _id: string;
  userId: { _id?: string } | string | null;
  text?: string;
  contentUrl?: string;
  contentTitle?: string;
  imageUrl?: string;
  likes?: string[];
  commentCount?: number;
  createdAt: string;
};
type ProfileComment = {
  _id: string;
  userId: { name?: string; avatarUrl?: string } | string | null;
  text: string;
  createdAt?: string;
};
type ProfileCourse = {
  _id?: string;
  id?: string;
  name?: string;
  title?: string;
  description?: string;
  shortDescription?: string;
  thumbnail?: string;
  thumbnailUrl?: string;
  image?: string;
  imageUrl?: string;
  createdAt?: string;
};
function Avatar({ user, size = "h-28 w-28" }: { user: ProfileUser; size?: string }) {
  const [failed, setFailed] = useState(false);
  return user?.avatarUrl && !failed ? (
    <Image
      src={user.avatarUrl}
      alt={`${user.name || "User"} profile`}
      onError={() => setFailed(true)}
      className={`${size} rounded-full border-4 border-white object-cover shadow-xl`}
      width={112}
      height={112}
      unoptimized
    />
  ) : (
    <div
      className={`${size} grid place-items-center rounded-full border-4 border-white bg-gradient-to-br from-indigo-500 to-violet-600 text-4xl font-black text-white shadow-xl`}
    >
      {user?.name?.[0]?.toUpperCase() || "U"}
    </div>
  );
}
export default function Profile() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id || "");
  const [user, setUser] = useState<ProfileUser | null>(null),
    [posts, setPosts] = useState<ProfilePost[]>([]),
    [courses, setCourses] = useState<ProfileCourse[]>([]),
    [me, setMe] = useState<Pick<ProfileUser, "id" | "_id" | "role" | "communityAccess"> | null>(null),
    [edit, setEdit] = useState(false),
    [name, setName] = useState(""),
    [username, setUsername] = useState(""),
    [bio, setBio] = useState(""),
    [avatar, setAvatar] = useState(""),
    [coverImage, setCoverImage] = useState(""),
    [comments, setComments] = useState<Record<string, ProfileComment[] | undefined>>({}),
    [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({}),
    [isOnline, setIsOnline] = useState(false);
  useEffect(() => {
    if (!id) return;
    fetch("/api/courses")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.message || "Could not load courses.");
        const availableCourses: ProfileCourse[] = data.courses || [];
        const latestCourses = availableCourses
          .filter((course) => course && (course._id || course.id))
          .sort((a, b) => {
            const aTime = a.createdAt ? Date.parse(a.createdAt) || 0 : 0;
            const bTime = b.createdAt ? Date.parse(b.createdAt) || 0 : 0;
            return bTime - aTime;
          })
          .slice(0, 4);
        setCourses(latestCourses);
      })
      .catch((error) => console.error("Could not load profile courses.", error));
  }, [id]);
  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch("/api/community/users/" + id).then(
        (response) => response.json() as Promise<{ user: ProfileUser }>,
      ),
      fetch("/api/community/posts").then(
        (response) => response.json() as Promise<{ posts: ProfilePost[] }>,
      ),
      fetch("/api/auth/me").then(
        (response) => response.json() as Promise<{ user: ProfileUser }>,
      ),
    ]).then(([u, p, m]) => {
      setUser(u.user);
      setIsOnline(
        Boolean(
          u.user?.lastSeenAt &&
            Date.now() - new Date(u.user.lastSeenAt).getTime() < 60 * 60 * 1000,
        ),
      );
      setName(u.user?.name || "");
      setUsername(u.user?.username || "");
      setBio(u.user?.bio || "");
      setAvatar(u.user?.avatarUrl || "");
      setCoverImage(u.user?.coverImage || "");
      setPosts(
        (p.posts || []).filter((post) =>
          String(
            typeof post.userId === "object" && post.userId
              ? post.userId._id
              : post.userId,
          ) === id,
        ),
      );
      setMe(m.user || null);
    });
  }, [id]);
  useEffect(() => {
    if (!id) return;
    const updatePresence = async () => {
      const response = await fetch(`/api/community/users/${encodeURIComponent(id)}`);
      if (!response.ok) return;
      const data = await response.json();
      const lastSeenAt = data.user?.lastSeenAt;
      setIsOnline(
        Boolean(lastSeenAt && Date.now() - new Date(lastSeenAt).getTime() < 60 * 60 * 1000),
      );
    };
    const interval = window.setInterval(() => {
      updatePresence().catch((error) =>
        console.error("Could not refresh profile presence.", error),
      );
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [id]);
  async function save() {
    if (!me?.communityAccess) {
      router.push("/subscriptions");
      return;
    }
    const r = await fetch("/api/community/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        username,
        bio,
        avatarUrl: avatar,
        coverImage,
      }),
    });
    const d = await r.json();
    if (r.ok) {
      setUser(d.user);
      setEdit(false);
    } else {
      window.alert(d.message || "Could not save your profile.");
    }
  }
  async function upload(f: File, kind: "avatar" | "banner") {
    if (!me?.communityAccess) {
      router.push("/subscriptions");
      return;
    }
    const fd = new FormData();
    fd.append("file", f);
    fd.append("kind", kind);
    const r = await fetch("/api/community/upload", {
      method: "POST",
      body: fd,
    });
    const d = await r.json();
    if (r.ok) {
      if (kind === "avatar") setAvatar(d.url);
      else setCoverImage(d.url);
    } else {
      window.alert(d.message || "Profile image upload failed.");
    }
  }
  async function toggleLike(postId: string) {
    if (!me?.communityAccess) {
      router.push("/subscriptions");
      return;
    }
    const response = await fetch(`/api/community/posts/${encodeURIComponent(postId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "like" }),
    });
    const data = await response.json();
    if (!response.ok) {
      window.alert(data.message || "Could not update like.");
      return;
    }
    setPosts((current) =>
      current.map((post) => {
        if (String(post._id) !== postId) return post;
        const likes = post.likes || [];
        const meId = String(me?.id || me?._id || "");
        return {
          ...post,
          likes: data.liked
            ? [...likes, meId]
            : likes.filter((likedBy) => likedBy !== meId),
        };
      }),
    );
  }
  async function toggleComments(postId: string) {
    if (comments[postId]) {
      setComments((current) => ({ ...current, [postId]: undefined }));
      return;
    }
    const response = await fetch(`/api/community/posts/${encodeURIComponent(postId)}`);
    const data = await response.json();
    if (!response.ok) {
      window.alert(data.message || "Could not load comments.");
      return;
    }
    setComments((current) => ({ ...current, [postId]: data.comments || [] }));
  }
  async function addComment(postId: string) {
    if (!me?.communityAccess) {
      router.push("/subscriptions");
      return;
    }
    const text = commentDrafts[postId]?.trim();
    if (!text) return;
    const response = await fetch(`/api/community/posts/${encodeURIComponent(postId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "comment", text }),
    });
    const data = await response.json();
    if (!response.ok) {
      window.alert(data.message || "Could not add your comment.");
      return;
    }
    setCommentDrafts((current) => ({ ...current, [postId]: "" }));
    setComments((current) => ({
      ...current,
      [postId]: [...(current[postId] || []), data.comment],
    }));
    setPosts((current) =>
      current.map((post) =>
        post._id === postId
          ? { ...post, commentCount: (post.commentCount || 0) + 1 }
          : post,
      ),
    );
  }
  async function sharePost(postId: string) {
    const path = `/community/profile/${encodeURIComponent(id)}#post-${encodeURIComponent(postId)}`;
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
  if (!user)
    return (
      <CourseHubLoader fullScreen label="Loading profile..." />
    );
  const own = String(me?.id || me?._id) === String(user._id);
  return (
    <main className="coursehub-page min-h-screen bg-[#f0f2f5] pb-16 md:pb-0">
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
        <div className="site-navbar-inner mx-auto flex h-16 w-full max-w-[980px] items-center gap-2 px-3 sm:h-[74px] sm:gap-4 sm:px-4 md:h-20">
          <button
            onClick={() => router.push("/community/feed")}
            aria-label="Back to community feed"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100"
          >
            ✕
          </button>
          <button
            onClick={() => router.push("/community/feed")}
            className="navbar-wordmark min-w-0 flex-1 truncate text-left text-base font-black sm:text-xl"
          >
            <CourseHubLogo size="sm" />
            <span className="hidden sm:inline"> Community</span>
          </button>
          {me?.communityAccess && (
            <button
              onClick={() => router.push("/community/messages")}
              aria-label="Open messages"
              className="ml-auto flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-100 px-2.5 text-sm font-bold text-slate-700 hover:bg-indigo-50 sm:px-3"
            >
              <span aria-hidden="true">✉</span>
              <span className="hidden sm:inline">Messages</span>
            </button>
          )}
        </div>
      </header>
      <div className="desktop-content-width mx-auto grid w-full max-w-[1240px] gap-5 px-3 py-5 sm:px-5 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start lg:px-6">
        <div className="contents lg:col-start-1 lg:row-start-1 lg:block">
        <section className="order-1 overflow-hidden rounded-3xl bg-white shadow-sm">
          <div
            className="relative mx-4 mt-4 h-36 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-500 bg-cover bg-center sm:mx-6 sm:h-40"
            style={{
              backgroundImage:
                (edit ? coverImage : user.coverImage)
                  ? `url("${edit ? coverImage : user.coverImage}")`
                  : undefined,
            }}
          >
            <div className="absolute -bottom-12 left-4 z-10 rounded-full sm:left-6">
              <Avatar
                user={{
                  ...user,
                  avatarUrl: edit ? avatar : user.avatarUrl,
                }}
                key={edit ? avatar : user.avatarUrl || ""}
                size="h-24 w-24 sm:h-28 sm:w-28"
              />
            </div>
            {edit && (
              <label className="absolute bottom-3 right-3 cursor-pointer rounded-xl bg-slate-950/75 px-3 py-2 text-xs font-bold text-white">
                Change banner
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
                      window.alert("Choose an image up to 10 MB.");
                      event.target.value = "";
                      return;
                    }
                    upload(file, "banner");
                    event.target.value = "";
                  }}
                />
              </label>
            )}
          </div>
          <div className="px-6 pb-7 pt-[4.5rem]">
            <div className="mb-4 flex justify-end">
              {own && !edit && me?.communityAccess && (
                <button
                  onClick={() => setEdit(true)}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 font-bold text-white"
                >
                  Edit profile
                </button>
              )}
              {own && !edit && !me?.communityAccess && (
                <button
                  onClick={() => router.push("/subscriptions")}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white"
                >
                  Subscribe to edit
                </button>
              )}
              {own && edit && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEdit(false)}
                    className="rounded-xl bg-slate-100 px-4 py-2.5 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={save}
                    className="rounded-xl bg-indigo-600 px-4 py-2.5 font-bold text-white"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
            {edit ? (
              <div className="mt-5 grid gap-3">
                <label className="text-sm font-bold">
                  Profile photo
                  <input
                    type="file"
                    accept="image/*"
                    className="mt-2 block w-full rounded-xl border p-3"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        if (!f.type.startsWith("image/")) {
                          window.alert("Please choose an image file.");
                          e.target.value = "";
                          return;
                        }
                        if (f.size > 10 * 1024 * 1024) {
                          window.alert("Profile photos must be 10 MB or smaller.");
                          e.target.value = "";
                          return;
                        }
                        upload(f, "avatar");
                      }
                    }}
                  />
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl border px-4 py-3"
                  placeholder="Your name"
                />
                <label className="grid gap-1 text-sm font-bold">
                  Username
                  <input
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))
                    }
                    minLength={3}
                    maxLength={24}
                    pattern="[a-z0-9._]{3,24}"
                    required
                    className="rounded-xl border px-4 py-3 font-normal"
                    placeholder="Unique username"
                  />
                  <span className="text-xs font-normal text-slate-500">
                    Use this username when people search for you.
                  </span>
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="rounded-xl border px-4 py-3"
                  placeholder="Short bio"
                />
              </div>
            ) : (
              <>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="text-3xl font-black">{user.name}</h1>
                    {user.username && (
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        @{user.username}
                      </p>
                    )}
                  </div>
                  {!own && me?.communityAccess && (
                    <button
                      onClick={() =>
                        router.push(`/community/messages/${encodeURIComponent(String(user._id))}`)
                      }
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-700"
                    >
                      Message
                    </button>
                  )}
                </div>
                {!own && me && !me.communityAccess && (
                  <button
                    onClick={() => router.push("/subscriptions")}
                    className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-100"
                  >
                    Subscribe to message
                  </button>
                )}
                <p className="mt-2 max-w-2xl text-slate-600">
                  {user.bio ||
                    "CourseHub learner • Learning, building and growing."}
                </p>
                <div className="mt-4 flex gap-5 text-sm text-slate-500">
                  <span>
                    <b className="text-slate-900">{posts.length}</b> posts
                  </span>
                  <span>
                    Joined {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                  <span
                    className={`flex items-center gap-2 ${isOnline ? "text-emerald-600" : "text-slate-400"}`}
                  >
                    <i
                      className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-slate-300"}`}
                    />
                    {isOnline ? "Online" : "Offline"}
                  </span>
                </div>
              </>
            )}
          </div>
        </section>
        {courses.length > 0 && (
          <section className="order-last mt-5 overflow-hidden rounded-2xl bg-white p-4 shadow-sm lg:order-none">
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
                const courseId = course._id || course.id;
                if (!courseId) return null;
                const title = course.title || course.name || "New Course";
                const image =
                  course.imageUrl ||
                  course.image ||
                  course.thumbnailUrl ||
                  course.thumbnail;
                return (
                  <article
                    key={courseId}
                    className="flex items-center gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-2"
                  >
                    {image ? (
                      <Image
                        src={image}
                        alt={title}
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
                        {title}
                      </h3>
                      <button
                        onClick={() =>
                          router.push(`/courses/${encodeURIComponent(courseId)}`)
                        }
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
        </div>
        <section className="order-2 min-w-0 lg:col-start-2 lg:row-start-1">
          {!me?.communityAccess && (
            <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-black text-slate-900">Subscribe to join the conversation</p>
                <p className="mt-1 text-sm text-slate-600">
                  Subscribe to edit your profile and like, comment on, or share posts.
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
          {posts.map((p) => (
            <article
              key={p._id}
              id={`post-${p._id}`}
              className="mb-4 overflow-hidden rounded-2xl bg-white shadow-sm"
            >
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar user={user} size="h-10 w-10" />
                  <div>
                    <b>{user.name}</b>
                    <div className="text-xs text-slate-400">
                      {new Date(p.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                {p.text && (
                  <p className="mt-4 whitespace-pre-wrap leading-7">{p.text}</p>
                )}
                {p.contentUrl && p.contentTitle && (
                  <button
                    onClick={() => router.push(p.contentUrl ?? "/community/feed")}
                    className="mt-4 block w-full rounded-xl border bg-slate-50 p-4 text-left"
                  >
                    <span className="block text-xs font-bold uppercase text-indigo-600">
                      {p.contentUrl.startsWith("/blog/") ? "Study blog" : "Playlist"}
                    </span>
                    <span className="mt-1 block font-black">{p.contentTitle}</span>
                  </button>
                )}
              </div>
              {p.imageUrl && (
                <Image
                  src={p.imageUrl}
                  alt={`${user.name}'s post`}
                  className="max-h-[600px] w-full object-cover"
                  width={1200}
                  height={800}
                  unoptimized
                />
              )}
              <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-slate-500">
                <span>
                  👍 {p.likes?.length || 0} likes · {p.commentCount || 0} comments
                </span>
              </div>
              <div className={`grid border-t px-2 py-1 ${me?.communityAccess ? "grid-cols-3" : "grid-cols-1"}`}>
                {me?.communityAccess && (
                  <button
                    onClick={() => toggleLike(String(p._id))}
                    className="rounded-xl py-2.5 text-sm font-bold hover:bg-slate-50"
                  >
                    {p.likes?.some(
                      (likedBy) =>
                        String(likedBy) === String(me?.id || me?._id),
                    )
                      ? "👍 Unlike"
                      : "👍 Like"}
                  </button>
                )}
                {me?.communityAccess && (
                  <button
                    onClick={() => void toggleComments(String(p._id))}
                    className="rounded-xl py-2.5 text-sm font-bold hover:bg-slate-50"
                  >
                    💬 Comment
                  </button>
                )}
                {me?.communityAccess && (
                  <button
                    onClick={() => void sharePost(String(p._id))}
                    className="rounded-xl py-2.5 text-sm font-bold hover:bg-slate-50"
                  >
                    ↗ Share
                  </button>
                )}
              </div>
              {comments[p._id] && (
                <div className="border-t bg-slate-50 p-4">
                  <div className="space-y-3">
                    {comments[p._id]?.map((item) => (
                      <div key={item._id} className="rounded-2xl bg-white px-3 py-2">
                        <b className="text-xs">
                          {typeof item.userId === "object" && item.userId
                            ? item.userId.name || "CourseHub member"
                            : "CourseHub member"}
                        </b>
                        <p className="text-sm">{item.text}</p>
                      </div>
                    ))}
                  </div>
                  {me?.communityAccess && (
                    <div className="mt-3 flex gap-2">
                      <input
                        value={commentDrafts[p._id] || ""}
                        onChange={(event) =>
                          setCommentDrafts((current) => ({
                            ...current,
                            [p._id]: event.target.value,
                          }))
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") void addComment(String(p._id));
                        }}
                        placeholder="Write a comment..."
                        className="min-w-0 flex-1 rounded-full border bg-white px-4 py-2.5 text-sm outline-none"
                      />
                      <button
                        onClick={() => void addComment(String(p._id))}
                        className="rounded-full bg-indigo-600 px-4 text-sm font-bold text-white"
                      >
                        Send
                      </button>
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
          {!posts.length && (
            <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
              No community posts yet.
            </div>
          )}
        </section>
      </div>
      <nav className={`fixed inset-x-0 bottom-0 z-40 grid h-14 border-t bg-white md:hidden ${me?.communityAccess ? "grid-cols-3" : "grid-cols-1"}`}>
        {me?.communityAccess && <button onClick={() => router.push("/community")} className="text-xs font-bold text-slate-600">💬 Chat</button>}
        <button onClick={() => router.push("/community/feed")} className="text-xs font-bold text-slate-600">📰 Feed</button>
        {me?.communityAccess && <button onClick={() => router.push("/community/messages")} className="text-xs font-bold text-slate-600">✉ Messages</button>}
      </nav>
    </main>
  );
}

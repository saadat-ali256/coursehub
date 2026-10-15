import type { Types } from "mongoose";
import Notification from "@/models/Notification";
import User from "@/models/User";

export type PublishedContentNotification = {
  kind: "course" | "blog";
  title: string;
  message: string;
  path: string;
};

export async function notifyUsersAboutPublishedContent(
  content: PublishedContentNotification,
) {
  const users = await User.find({ status: { $ne: "suspended" } })
    .select("_id")
    .lean();

  if (!users.length) return { notified: 0 };

  const notifications = await Notification.insertMany(
    users.map(({ _id }) => ({
      userId: _id,
      title: content.title,
      message: content.message.slice(0, 240),
      type: content.kind,
      link: content.path,
    })),
  );
  return { notified: notifications.length };
}

export async function notifyStudentsAboutCourse(course: {
  _id: Types.ObjectId;
  name: string;
  description: string;
}) {
  const result = await notifyUsersAboutPublishedContent({
    kind: "course",
    title: `New course: ${course.name}`,
    message: course.description,
    path: `/courses/${course._id}`,
  });
  return result.notified;
}

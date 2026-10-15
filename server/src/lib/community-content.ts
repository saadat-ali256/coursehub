import mongoose from "mongoose";
import CommunityPost from "@/models/CommunityPost";

type PublishedContent = {
  sourceType: "course" | "blog";
  sourceId: string;
  userId: mongoose.Types.ObjectId;
  title: string;
  summary: string;
  url: string;
  imageUrl?: string;
  published: boolean;
};

export async function syncPublishedContentPost(content: PublishedContent) {
  const source = {
    sourceType: content.sourceType,
    sourceId: content.sourceId,
  };

  if (!content.published) {
    await CommunityPost.deleteOne(source);
    return;
  }

  await CommunityPost.findOneAndUpdate(
    source,
    {
      $set: {
        userId: content.userId,
        text: content.summary || `New ${content.sourceType}: ${content.title}`,
        contentUrl: content.url,
        contentTitle: content.title,
        contentImage: content.imageUrl || "",
      },
      $setOnInsert: {
        likes: [],
        reactions: [],
      },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
}

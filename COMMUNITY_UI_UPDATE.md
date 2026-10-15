# CourseHub Community UI Update

- `/community` is now the WhatsApp-style group chat only.
- `/community/feed` is the Facebook-style social feed only.
- Feed composer is opened by the floating `+` post button and closes after posting/cancel.
- Feed supports text, image upload, likes, comments, share, delete-own-post/admin-delete, profile links and search.
- `/community/profile/[id]` provides Facebook-style member profiles with avatar, bio, online/offline state and posts.
- User search is available in the community headers.
- Community badge uses `/api/community/unread` and shows a count when new group messages exist.
- Chat no longer has the old right-side status panel; the layout uses the full available page.
- Group chat access is checked server-side for subscriber/public groups.

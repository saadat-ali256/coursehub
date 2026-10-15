# CourseHub Advanced Learning Platform Update

## Included
- Premium home page with course cards and community floating button.
- Public course page with a cinematic video player.
- Admin-controlled `preview` lesson: unsubscribed users see only lessons marked **Free preview**; subscribers/admins see the full published playlist.
- Playlist with active lesson, progress indicator, previous/next controls and locked lessons.
- YouTube iframe and direct MP4/WebM video playback.
- Course description, instructor, level, lesson count and rating summary.
- Course likes, ratings and comments backed by MongoDB.
- Study Blog public page + Admin Blog CMS.
- Floating community button available throughout the home experience.
- Community groups with `subscribers` or `everyone` audience.
- WhatsApp-style group chat with online/live indicator and 5-second polling.
- Admin Community CMS: create, edit, delete groups and choose audience.
- Admin Users: remove customer accounts (admin cannot remove itself).
- Admin navigation expanded with Study Blog and Community.

## Admin workflow
1. Open `/admin/lessons`.
2. Add a video lesson and paste a direct MP4/WebM URL or YouTube URL.
3. Tick **Free preview for unsubscribed users** only on the intro lesson.
4. Keep the other lessons unchecked.
5. Subscribers with active course access see the complete playlist.
6. Open `/admin/blog` to publish study articles.
7. Open `/admin/community` to create subscriber/public groups.

## Notes
The current video player uses a URL field rather than uploading large video files into MongoDB. For production video hosting, use object storage/CDN (S3/R2/Cloudinary/etc.) and save the resulting URL in `Lesson.videoUrl`.

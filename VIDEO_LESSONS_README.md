# CourseHub Video Lessons

The course learning page now works as a video-course player:

- Video player at the top.
- Lesson title and description below the player.
- Course playlist on the right (under the player on small screens).
- Clicking a playlist lesson changes the video.
- Previous / Next Lesson buttons.
- Supports direct MP4/WebM URLs and YouTube links.
- Admin can add `videoUrl` from Admin → Lessons Manager.

## Add a video lesson

1. Start MongoDB.
2. Run `npm install` if dependencies are not installed.
3. Run `npm run dev`.
4. Sign in as admin.
5. Open `/admin/lessons`.
6. Click `+ Add lesson`.
7. Select the course.
8. Set type to `Video`.
9. Enter the lesson title, order, duration, description and content.
10. Paste a direct video URL or YouTube URL into `Video URL`.
11. Click `Create lesson`.
12. Open the course learning page. The first lesson is selected automatically and the playlist is shown beside it.

## Important

This version stores the video URL in MongoDB. It does not upload large video files into MongoDB. For production, a later storage step can connect this field to Cloudinary, AWS S3, Cloudflare R2, or another video/CDN provider.

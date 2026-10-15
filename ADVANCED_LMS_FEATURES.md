# CourseHub Advanced LMS (AI excluded)

This build adds the requested advanced LMS feature set without an AI tutor.

## Included
- Video progress/resume/completion APIs and student learning center
- Notes, timestamp notes, bookmarks and study planner/goals
- Quiz engine: single, multiple and true/false questions, timer fields, pass percentage and attempt limits
- Assignment creation/submission/grading data model
- Automatic course certificate eligibility and public certificate verification page
- Advanced coupons with percentage/fixed discount, dates, limits, first-time rule and course applicability
- Notification center and admin broadcast notifications
- Advanced admin analytics
- Course curriculum fields: sections, required lessons and scheduled release dates
- Student dashboard: subscriptions, continue learning, progress, certificates, quiz scores, bookmarks, notifications, goals and planner
- Existing premium community, blog, course ratings/comments/likes and subscription access remain
- Existing admin course/lesson/user/subscription management remains

## Important
Video files are still URL based (`Lesson.videoUrl`). For production file uploads, connect S3/R2/Cloudinary and store the resulting URL.

Certificates use a print-ready browser page; users can Print -> Save as PDF. This avoids adding a heavyweight server PDF dependency.

Community currently uses polling rather than WebSockets. It is ready for a WebSocket transport later.

## Setup
1. `npm install`
2. Make sure MongoDB is running.
3. Run `npm run seed:admin`.
4. Run `npm run dev`.
5. Admin: `/admin`
6. Advanced control center: `/admin/advanced`
7. Coupons: `/admin/coupons`
8. Student learning center: `/dashboard`
9. Certificates: `/certificates`

## Production integration notes
- Stripe billing hooks should be connected to your live Stripe Checkout/Webhook for real upgrade/downgrade/cancel billing.
- Email notifications require an email provider (Resend, SendGrid, SMTP, etc.); the in-app notification center is fully modeled.
- File uploads remain URL-based unless an object-storage provider is connected.

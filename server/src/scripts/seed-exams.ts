import dotenv from "dotenv";
import { connectDB } from "@/lib/mongodb";
import ExamQuestion from "@/models/ExamQuestion";
import ExamSubject from "@/models/ExamSubject";
import { examCatalog, pythonQuestions } from "@/lib/exam-catalog";

dotenv.config({ path: [".env.local", ".env"], quiet: true });

async function seedExams() {
  await connectDB();
  await ExamSubject.bulkWrite(
    examCatalog.map((subject, sortOrder) => ({
      updateOne: {
        filter: { slug: subject.slug },
        update: { $setOnInsert: { ...subject, sortOrder, isActive: true } },
        upsert: true,
      },
    })),
  );

  const python = await ExamSubject.findOne({ slug: "python" }).select("_id");
  if (!python) throw new Error("Python exam subject was not created.");
  await ExamQuestion.bulkWrite(
    pythonQuestions.map((question, index) => ({
      updateOne: {
        filter: { seedKey: `python-core-${index + 1}` },
        update: {
          $setOnInsert: {
            ...question,
            subjectId: python._id,
            isActive: true,
            seedKey: `python-core-${index + 1}`,
          },
        },
        upsert: true,
      },
    })),
  );
  console.log(
    `Seeded ${examCatalog.length} exam subjects and ${pythonQuestions.length} Python questions.`,
  );
  process.exitCode = 0;
  const mongoose = await import("mongoose");
  await mongoose.default.disconnect();
}

seedExams().catch(async (error: unknown) => {
  console.error("Could not seed exam catalog.", error);
  const mongoose = await import("mongoose");
  await mongoose.default.disconnect();
  process.exitCode = 1;
});

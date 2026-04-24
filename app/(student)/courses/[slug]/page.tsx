import { ComingSoon } from "@/components/placeholder";
import { QAChatPlaceholder } from "@/components/qa-chat-placeholder";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="flex flex-col gap-8">
      <ComingSoon
        title={`Course: ${slug}`}
        milestone="M3"
        description="Course header, description, eligibility, entrance exams, career paths, institutes, and AI Q&A chat arrive in M3."
      />
      <section aria-label="Ask about this course" className="mx-auto w-full max-w-xl">
        <QAChatPlaceholder courseId={slug} />
      </section>
    </div>
  );
}

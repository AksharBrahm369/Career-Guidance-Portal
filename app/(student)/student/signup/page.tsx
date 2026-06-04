import Link from "next/link";
import { StudentAuthForm } from "@/components/student/student-auth-form";

export default function StudentSignupPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Create your account</h1>
      <StudentAuthForm mode="signup" />
      <p className="text-sm text-muted-foreground">
        Already have one? <Link href="/student/login" className="underline">Log in</Link>
      </p>
    </div>
  );
}

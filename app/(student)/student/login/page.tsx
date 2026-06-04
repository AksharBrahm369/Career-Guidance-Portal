import Link from "next/link";
import { StudentAuthForm } from "@/components/student/student-auth-form";

export default function StudentLoginPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Log in</h1>
      <StudentAuthForm mode="login" />
      <p className="text-sm text-muted-foreground">
        New here? <Link href="/student/signup" className="underline">Create an account</Link>
      </p>
    </div>
  );
}

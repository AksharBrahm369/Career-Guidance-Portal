import Link from "next/link";
import { Compass } from "lucide-react";

import { StudentAuthForm } from "@/components/student/student-auth-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function StudentSignupPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Compass className="size-6" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1.5">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Let&apos;s find what fits you
          </h1>
          <p className="text-base text-muted-foreground">
            Create your free account to start exploring careers made for you.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="sr-only">Create your account</CardHeader>
        <CardContent className="pt-6">
          <StudentAuthForm mode="signup" />
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/student/login"
          className="rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, Lock, Phone, User } from "lucide-react";

import { normalizePhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

type FieldName = "name" | "phone" | "password";
type Touched = Partial<Record<FieldName, boolean>>;
type FieldErrors = Partial<Record<FieldName, string>>;

function authErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

function authErrorMessage(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" ? message : undefined;
}

function loginErrorMessage(error: unknown): string {
  const code = authErrorCode(error);

  if (code === "INVALID_PHONE_NUMBER_OR_PASSWORD") {
    return "Hmm, that phone or password didn't match. Give it another go.";
  }

  if (code === "BANNED_USER") {
    return "This account is currently blocked. Please contact the admin.";
  }

  if (code === "TOO_MANY_REQUESTS" || code === "TOO_MANY_ATTEMPTS") {
    return "Too many login attempts. Wait a minute, then try again.";
  }

  if (code === "FAILED_TO_CREATE_SESSION") {
    return "Your password matched, but we couldn't start a session. Please try again.";
  }

  return authErrorMessage(error) ?? "Log in failed. Please try again.";
}

/**
 * Per-field validation. Mirrors the original input constraints exactly
 * (name required on signup, phone required + ≥6 chars once digits-only,
 * password required + ≥8) so we never gate a request the server would accept
 * — and never submit one it would reject. Returns undefined when valid.
 */
function validateField(
  name: FieldName,
  value: string,
  mode: "signup" | "login",
): string | undefined {
  switch (name) {
    case "name":
      if (mode !== "signup") return undefined;
      if (!value.trim()) return "Please tell us your name.";
      return undefined;
    case "phone": {
      if (!value.trim()) return "Enter your phone number.";
      const digits = normalizePhone(value);
      if (digits.length < 6) return "That phone number looks too short.";
      return undefined;
    }
    case "password":
      if (!value) return "Enter a password.";
      if (mode === "signup" && value.length < 8) return "Use at least 8 characters.";
      return undefined;
    default:
      return undefined;
  }
}

export function StudentAuthForm({ mode }: { mode: "signup" | "login" }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Touched>({});
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const values = { name, phone, password };

  function runValidation(field: FieldName) {
    const msg = validateField(field, values[field], mode);
    setFieldErrors((prev) => ({ ...prev, [field]: msg }));
    return msg;
  }

  function handleBlur(field: FieldName) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    runValidation(field);
  }

  // Re-validate a field on change ONLY once it has been touched, so the first
  // keystroke never flashes an error but corrections clear it live.
  function handleChange(field: FieldName, value: string) {
    setFormError(null);
    if (field === "name") setName(value);
    else if (field === "phone") setPhone(value);
    else setPassword(value);
    if (touched[field]) {
      const msg = validateField(field, value, mode);
      setFieldErrors((prev) => ({ ...prev, [field]: msg }));
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    // Validate everything on submit; surface all errors at once.
    const fields: FieldName[] =
      mode === "signup" ? ["name", "phone", "password"] : ["phone", "password"];
    const nextErrors: FieldErrors = {};
    let hasError = false;
    for (const f of fields) {
      const msg = validateField(f, values[f], mode);
      if (msg) hasError = true;
      nextErrors[f] = msg;
    }
    setTouched({ name: true, phone: true, password: true });
    setFieldErrors(nextErrors);
    if (hasError) return;

    setBusy(true);
    // Canonicalize ONCE here so the auto-login / login uses the exact identifier
    // the signup route stored. Must match lib/phone.normalizePhone everywhere.
    const canonicalPhone = normalizePhone(phone);
    try {
      if (mode === "signup") {
        const res = await fetch("/api/student/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, phone, password }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setFormError(
            d.error === "already_registered"
              ? "That phone number is already registered. Try logging in."
              : "Sign-up failed. Please try again.",
          );
          return;
        }
      } else {
        const res = await fetch("/api/student/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: canonicalPhone, password }),
        });
        if (!res.ok) {
          const detail = await res.json().catch(() => ({}));
          setFormError(loginErrorMessage(detail));
          return;
        }
      }
      // Hard navigation (not router.push) so the just-set session cookie is
      // guaranteed to ride along on the next request and the RSC tree re-renders
      // with the authenticated session - avoids a race where requireStudent()
      // 401s on a stale cached payload.
      window.location.assign("/assessment");
    } finally {
      setBusy(false);
    }
  }

  const isSignup = mode === "signup";

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <FieldGroup className="gap-5">
        {isSignup ? (
          <Field data-invalid={touched.name && !!fieldErrors.name}>
            <FieldLabel htmlFor="auth-name">Your name</FieldLabel>
            <InputGroup className="h-12 rounded-[var(--radius)]">
              <InputGroupAddon>
                <User aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                id="auth-name"
                name="name"
                autoComplete="name"
                placeholder="e.g. Priya Sharma"
                value={name}
                onChange={(e) => handleChange("name", e.target.value)}
                onBlur={() => handleBlur("name")}
                aria-invalid={touched.name && !!fieldErrors.name}
                aria-describedby={fieldErrors.name ? "auth-name-error" : undefined}
                className="text-base md:text-base"
              />
            </InputGroup>
            {touched.name && fieldErrors.name ? (
              <FieldError id="auth-name-error">{fieldErrors.name}</FieldError>
            ) : null}
          </Field>
        ) : null}

        <Field data-invalid={touched.phone && !!fieldErrors.phone}>
          <FieldLabel htmlFor="auth-phone">Phone number</FieldLabel>
          <InputGroup className="h-12 rounded-[var(--radius)]">
            <InputGroupAddon>
              <Phone aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              id="auth-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="98765 43210"
              value={phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              onBlur={() => handleBlur("phone")}
              aria-invalid={touched.phone && !!fieldErrors.phone}
              aria-describedby={fieldErrors.phone ? "auth-phone-error" : undefined}
              className="text-base md:text-base"
            />
          </InputGroup>
          {touched.phone && fieldErrors.phone ? (
            <FieldError id="auth-phone-error">{fieldErrors.phone}</FieldError>
          ) : null}
        </Field>

        <Field data-invalid={touched.password && !!fieldErrors.password}>
          <FieldLabel htmlFor="auth-password">Password</FieldLabel>
          <InputGroup className="h-12 rounded-[var(--radius)]">
            <InputGroupAddon>
              <Lock aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              id="auth-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={isSignup ? "new-password" : "current-password"}
              placeholder={isSignup ? "At least 8 characters" : "Your password"}
              value={password}
              onChange={(e) => handleChange("password", e.target.value)}
              onBlur={() => handleBlur("password")}
              aria-invalid={touched.password && !!fieldErrors.password}
              aria-describedby={fieldErrors.password ? "auth-password-error" : undefined}
              className="text-base md:text-base"
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                type="button"
                size="icon-sm"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((s) => !s)}
              >
                {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          {touched.password && fieldErrors.password ? (
            <FieldError id="auth-password-error">{fieldErrors.password}</FieldError>
          ) : null}
        </Field>
      </FieldGroup>

      {formError ? (
        <div
          role="alert"
          className={cn(
            "rounded-[var(--radius)] border border-destructive/40 bg-destructive/5 px-3.5 py-3 text-sm text-destructive",
          )}
        >
          {formError}
        </div>
      ) : null}

      <Button
        type="submit"
        size="lg"
        disabled={busy}
        className="h-12 w-full text-base font-semibold"
      >
        {busy ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            {isSignup ? "Creating your account..." : "Logging you in..."}
          </>
        ) : isSignup ? (
          "Create my account"
        ) : (
          "Log in"
        )}
      </Button>
    </form>
  );
}

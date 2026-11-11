"use client";

import { useState, type ReactElement } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { dashboardPathFor, loginSchema, type AuthUser, type LoginInput } from "@/shared/auth";
import { signIn } from "@/features/auth/api";
import { replaceSession } from "@/features/auth/session-cache";
import { apiErrorMessage } from "@/lib/http-client";

export function LoginForm(): ReactElement {
  const { form, mutation } = useLoginForm();
  return (
    <form
      className="auth-form"
      onSubmit={form.handleSubmit((input): void => {
        form.clearErrors("root");
        mutation.mutate(input);
      })}
      noValidate
    >
      <EmailField form={form} />
      <PasswordField form={form} />
      {form.formState.errors.root && (
        <p className="form-error" role="alert">
          {form.formState.errors.root.message}
        </p>
      )}
      <button
        className="button button-green"
        type="submit"
        disabled={mutation.isPending}
        aria-busy={mutation.isPending}
      >
        {mutation.isPending ? "Signing you in…" : "Sign in to your portal"}
        <Icon name="arrow" />
      </button>
    </form>
  );
}

function EmailField({
  form,
}: {
  form: UseFormReturn<LoginInput>;
}): ReactElement {
  return (
    <div className="form-field">
      <label htmlFor="email">University email address</label>
      <input
        id="email"
        type="email"
        autoComplete="username"
        placeholder="you@university.edu"
        aria-invalid={!!form.formState.errors.email}
        aria-describedby={
          form.formState.errors.email ? "email-error" : undefined
        }
        {...form.register("email")}
      />
      {form.formState.errors.email && (
        <span className="field-error" id="email-error" role="alert">
          Enter a valid email address.
        </span>
      )}
    </div>
  );
}

function PasswordInput({
  form,
}: {
  form: UseFormReturn<LoginInput>;
}): ReactElement {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div className="password-field">
      <input
        id="password"
        type={showPassword ? "text" : "password"}
        autoComplete="current-password"
        placeholder="Enter your password"
        aria-invalid={!!form.formState.errors.password}
        aria-describedby={
          form.formState.errors.password ? "password-error" : undefined
        }
        {...form.register("password")}
      />
      <button
        className="password-toggle"
        type="button"
        aria-label={showPassword ? "Hide password" : "Show password"}
        aria-pressed={showPassword}
        onClick={(): void => setShowPassword(!showPassword)}
      >
        <Icon name="eye" />
      </button>
    </div>
  );
}

function PasswordField({
  form,
}: {
  form: UseFormReturn<LoginInput>;
}): ReactElement {
  return (
    <div className="form-field">
      <label htmlFor="password">Password</label>
      <PasswordInput form={form} />
      {form.formState.errors.password && (
        <span className="field-error" id="password-error" role="alert">
          {form.formState.errors.password.message}
        </span>
      )}
    </div>
  );
}

function useLoginForm(): {
  form: UseFormReturn<LoginInput>;
  mutation: ReturnType<typeof useMutation<AuthUser, Error, LoginInput>>;
} {
  const client = useQueryClient();
  const router = useRouter();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const mutation = useMutation({
    mutationFn: signIn,
    onSuccess: async (user): Promise<void> => {
      await replaceSession(client, user);
      router.replace(dashboardPathFor(user.role));
    },
    onError: (error): void => {
      form.setError("root", { message: apiErrorMessage(error) });
    },
    onSettled: (): void => {
      form.resetField("password");
      mutation.reset();
    },
  });
  return { form, mutation };
}

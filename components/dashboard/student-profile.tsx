"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, type ReactElement } from "react";
import { useForm } from "react-hook-form";
import { Icon } from "@/components/ui/icon";
import { StudentPageError, StudentPortalFrame } from "@/components/dashboard/student-dashboard";
import { getStudentProfile, STUDENT_PROFILE_QUERY_KEY, updateStudentProfile } from "@/features/student/api";
import { apiErrorMessage } from "@/lib/http-client";
import { studentProfileFormSchema, type StudentProfile, type StudentProfileForm } from "@/shared/student";

function AcademicIdentity({ profile }: { profile: StudentProfile }): ReactElement {
  const facts = [
    ["Matriculation number", profile.matricNumber],
    ["Programme", `${profile.program.name} (${profile.program.code})`],
    ["Department", profile.program.department.name],
    ["Faculty", profile.program.department.faculty.name],
    ["Current level", String(profile.level)],
    ["University email", profile.user.email],
  ];
  return <section className="profileIdentity" aria-labelledby="identity-title">
    <div className="profileSectionHead"><span><Icon name="graduation" /></span><div><h2 id="identity-title">Academic identity</h2><p>These details are managed by the university and cannot be edited here.</p></div></div>
    <dl>{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
  </section>;
}

function ContactForm({ profile }: { profile: StudentProfile }): ReactElement {
  const client = useQueryClient();
  const form = useForm<StudentProfileForm>({ resolver: zodResolver(studentProfileFormSchema), defaultValues: {
    phone: profile.phone ?? "", address: profile.address ?? "",
  } });
  useEffect((): void => {
    form.reset({ phone: profile.phone ?? "", address: profile.address ?? "" });
  }, [form, profile]);
  const mutation = useMutation({
    mutationFn: updateStudentProfile,
    onSuccess: (updated): void => {
      client.setQueryData(STUDENT_PROFILE_QUERY_KEY, updated);
      form.reset({ phone: updated.phone ?? "", address: updated.address ?? "" });
    },
  });
  const submit = (values: StudentProfileForm): void => {
    mutation.mutate({ phone: values.phone === "" ? null : values.phone, address: values.address === "" ? null : values.address });
  };
  return <section className="profileContact" aria-labelledby="contact-title">
    <div className="profileSectionHead"><span><Icon name="user" /></span><div><h2 id="contact-title">Contact details</h2><p>Keep your phone number and current address up to date.</p></div></div>
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      <label htmlFor="profile-phone">Phone number</label>
      <input id="profile-phone" type="tel" autoComplete="tel" placeholder="e.g. +234 800 000 0000" aria-invalid={!!form.formState.errors.phone} aria-describedby={form.formState.errors.phone ? "profile-phone-error" : undefined} {...form.register("phone")} />
      {form.formState.errors.phone && <p id="profile-phone-error" className="profileFieldError">{form.formState.errors.phone.message}</p>}
      <label htmlFor="profile-address">Current address</label>
      <textarea id="profile-address" rows={5} autoComplete="street-address" placeholder="Enter your current residential address" aria-invalid={!!form.formState.errors.address} aria-describedby={form.formState.errors.address ? "profile-address-error" : "profile-address-help"} {...form.register("address")} />
      <p id="profile-address-help" className="profileFieldHelp">Up to 250 characters.</p>
      {form.formState.errors.address && <p id="profile-address-error" className="profileFieldError">{form.formState.errors.address.message}</p>}
      {mutation.isError && <p className="formError" role="alert">{apiErrorMessage(mutation.error)}</p>}
      {mutation.isSuccess && !form.formState.isDirty && <p className="profileSuccess" role="status"><Icon name="check" /> Contact details saved.</p>}
      <div className="profileFormActions"><button className="button button-green" disabled={mutation.isPending || !form.formState.isDirty} type="submit">{mutation.isPending ? "Saving…" : "Save contact details"}</button></div>
    </form>
  </section>;
}

export function StudentProfileScreen(): ReactElement {
  const profile = useQuery({ queryKey: STUDENT_PROFILE_QUERY_KEY, queryFn: ({ signal }) => getStudentProfile(signal) });
  if (profile.isPending) return <div className="loading" role="status"><span /><p>Loading your profile…</p></div>;
  if (profile.error || !profile.data) return <StudentPageError error={profile.error} title="We couldn’t load your profile" onRetry={(): void => { void profile.refetch(); }} />;
  return <StudentPortalFrame name={profile.data.user.name} activeHref="/student/profile">
    <main className="main profilePage" id="main-content">
      <header className="profileHeader"><div><h1>Student profile</h1><p>Review your academic identity and maintain your contact details.</p></div><span className="sessionPill"><Icon name="user" /> {profile.data.matricNumber}</span></header>
      <div className="profileGrid"><AcademicIdentity profile={profile.data} /><ContactForm profile={profile.data} /></div>
    </main>
  </StudentPortalFrame>;
}

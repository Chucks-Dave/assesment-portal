import Image from "next/image";
import Link from "next/link";
import type { ReactElement } from "react";
import { Icon } from "@/components/ui/icon";
import { FaqList } from "./faq-list";

const services = [
  {
    title: "Course registration",
    description:
      "Find courses that match your programme, level, and semester. Keep your registration organised.",
    image: "/images/students.jpg",
    link: "registration",
  },
  {
    title: "Results & performance",
    description:
      "Understand your approved results, semester GPA, and cumulative academic progress.",
    image: "/images/library.jpg",
    link: "results",
  },
  {
    title: "Your student profile",
    description:
      "Keep your contact details up to date and your academic identity close at hand.",
    image: "/images/campus.jpg",
    link: "profile",
  },
  {
    title: "Registered courses",
    description:
      "Keep track of your course selections across academic sessions and semesters.",
    image: "/images/library.jpg",
    link: "registration",
  },
  {
    title: "Academic history",
    description:
      "See how each semester fits into your story, with a view of your approved academic record.",
    image: "/images/campus.jpg",
    link: "results",
  },
  {
    title: "Print & keep a copy",
    description:
      "Get a printable registration summary or approved result statement for your own records.",
    image: "/images/students.jpg",
    link: "printing",
  },
];

export function About(): ReactElement {
  return (
    <section className="section container about-section" id="about">
      <div className="about-image">
        <Image
          src="/images/students.jpg"
          alt="Students collaborating with books and a laptop"
          fill
          sizes="(max-width: 760px) 100vw, 45vw"
        />
        <div className="image-caption">
          <Icon name="book" />
          <span>
            One portal.
            <br />
            <strong>Your whole academic journey.</strong>
          </span>
        </div>
      </div>
      <AboutCopy />
    </section>
  );
}

export function Services(): ReactElement {
  return (
    <section className="section services-section" id="services">
      <div className="container">
        <div className="section-heading">
          <h2>
            Everything for the
            <br />
            student in you.
          </h2>
          <p>
            From the first registration to the final result.
            <br />
            Explore your academic essentials.
          </p>
        </div>
        <div className="service-grid">
          {services.map((service): ReactElement => (
            <article className="service-card" key={service.title}>
              <div className="service-photo">
                <Image
                  src={service.image}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 33vw"
                />
              </div>
              <div className="service-content">
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <a className="text-link" href={`#guide-${service.link}`}>
                  Learn more <Icon name="arrow" />
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const steps = [
  {
    title: "Sign in to your account",
    body: "Use the email address and password provided for your university account. Students, lecturers, and administrators share one secure sign-in.",
    href: "/login",
    action: "Go to portal login",
    image: "/images/library.jpg",
  },
  {
    title: "Make it your semester",
    body: "Review your academic details, find eligible course offerings, and get familiar with the registration process for your programme.",
    href: "#guide-registration",
    action: "Registration guide",
    image: "/images/students.jpg",
  },
  {
    title: "Keep your progress in view",
    body: "Learn where to find approved results, understand your GPA, and keep a copy of the academic summaries that matter to you.",
    href: "#guide-results",
    action: "Understanding results",
    image: "/images/campus.jpg",
  },
];

export function GettingStarted(): ReactElement {
  return (
    <section className="section container getting-started" id="getting-started">
      <div className="section-heading centered">
        <h2>Find your feet. Then find your way.</h2>
        <p>A few simple steps to get started with UEMP.</p>
      </div>
      <div className="guide-grid">
        {steps.map((step, index): ReactElement => (
          <article className="guide-card" key={step.title}>
            <div className="guide-photo">
              <Image
                src={step.image}
                alt=""
                fill
                sizes="(max-width: 760px) 100vw, 33vw"
              />
              <span className="step-label">Step {index + 1}</span>
            </div>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
            <Link className="text-link" href={step.href}>
              {step.action} <Icon name="arrow" />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

const questions = [
  {
    id: "login",
    question: "How do I get access to the portal?",
    answer:
      "Your university provides your account credentials. Sign in with your registered email address and password. If you have not received them, contact your department or the university's student support team. Public account registration is not available.",
  },
  {
    id: "registration",
    question: "Which courses can I register for?",
    answer:
      "Course eligibility depends on your programme, department, level, and the active semester. Registration must also be open. Your student workspace will show eligible offerings when the registration workflow is available.",
  },
  {
    id: "results",
    question: "Why might a result not appear?",
    answer:
      "Students can only view results that have been approved. Draft, submitted, or rejected results are not included in your results or GPA. Contact your department if an expected approved result is missing.",
  },
  {
    id: "profile",
    question: "Can I change my academic information?",
    answer:
      "Your academic identity is maintained by the university. Students can update their phone number and address through the profile workflow when available. Contact your department to correct your name, programme, level, or matriculation details.",
  },
  {
    id: "printing",
    question: "Can I keep a printed copy of my records?",
    answer:
      "The student workflow includes printable registration summaries and approved result statements. Once available, use your browser's print option to print a copy or save it as a PDF. These summaries are not certified transcripts.",
  },
];

export function Support(): ReactElement {
  return (
    <section className="section support-section" id="support">
      <div className="container support-layout">
        <div>
          <h2>
            A little guidance
            <br />
            goes a long way.
          </h2>
          <p>
            New to the portal? Start here.
            <br />
            We’ll help you find your next step.
          </p>
          <Link className="button button-green" href="/login">
            Access your account <Icon name="arrow" />
          </Link>
        </div>
        <FaqList questions={questions} />
      </div>
    </section>
  );
}

export function Footer(): ReactElement {
  return (
    <footer className="site-footer">
      <FooterNavigation />
      <div className="container footer-bottom">
        <span>UEMP · Your academic journey, connected.</span>
        <a href="#main-content">
          Back to top <Icon name="arrow" />
        </a>
      </div>
    </footer>
  );
}

function AboutCopy(): ReactElement {
  return (
    <div className="about-copy">
      <h2>
        A little less admin.
        <br />A lot more possibility.
      </h2>
      <p>
        University is about the things you discover, the people you meet, and
        the future you build. Managing your studies should help you move
        forward.
      </p>
      <p>
        UEMP brings your academic essentials together. Find a clear path from
        course registration to approved results, with your information organised
        around you.
      </p>
      <ul className="check-list">
        <li>
          <Icon name="check" /> Academic information in one place
        </li>
        <li>
          <Icon name="check" /> Access that belongs to you
        </li>
        <li>
          <Icon name="check" /> A clearer view of every semester
        </li>
      </ul>
      <a className="text-link" href="#services">
        Get to know your portal <Icon name="arrow" />
      </a>
    </div>
  );
}

function FooterNavigation(): ReactElement {
  return (
    <div className="container footer-top">
      <div className="footer-brand">
        <Link className="brand-name" href="/">
          UEMP.
        </Link>
        <p>
          Your studies. Your progress.
          <br />
          Your academic home.
        </p>
      </div>
      <div>
        <h3>Explore UEMP</h3>
        <a href="#about">About the portal</a>
        <a href="#services">Student services</a>
        <a href="#getting-started">Getting started</a>
      </div>
      <div>
        <h3>Your academic life</h3>
        <a href="#guide-registration">Course registration</a>
        <a href="#guide-results">Results & history</a>
        <a href="#guide-printing">Print your records</a>
      </div>
      <div>
        <h3>Here to help</h3>
        <a href="#support">Help & support</a>
        <a href="#guide-login">Account access</a>
        <Link href="/login">
          Portal login <Icon name="arrow" />
        </Link>
      </div>
    </div>
  );
}

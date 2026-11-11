"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactElement } from "react";
import { Icon } from "@/components/ui/icon";

const slides = [
  {
    title: "Your next chapter\nstarts here.",
    description:
      "Less time on paperwork. More time on your future. Find your courses, results, and academic journey in one place.",
    image: "/images/campus.jpg",
  },
  {
    title: "A place to learn.\nA place to grow.",
    description:
      "Stay connected to your studies, from your first course registration to your final academic milestone.",
    image: "/images/students.jpg",
  },
  {
    title: "Make room for\nwhat comes next.",
    description:
      "A clearer view of your academic life, with the information you need to take your next step.",
    image: "/images/library.jpg",
  },
];

export function Hero(): ReactElement {
  const [active, setActive] = useState(0);
  const slide = slides[active];
  function move(direction: number): void {
    setActive(
      (current): number =>
        (current + direction + slides.length) % slides.length,
    );
  }
  return (
    <section
      className="hero"
      aria-label="Welcome to UEMP"
      aria-roledescription="carousel"
    >
      <HeroPhotos active={active} />
      <div className="hero-shade" />
      <div className="container hero-inner">
        <HeroCopy slide={slide} />
      </div>
      <button
        className="hero-arrow hero-prev"
        aria-label="Previous welcome slide"
        onClick={(): void => move(-1)}
      >
        <Icon name="chevron" />
      </button>
      <button
        className="hero-arrow hero-next"
        aria-label="Next welcome slide"
        onClick={(): void => move(1)}
      >
        <Icon name="chevron" />
      </button>
      <HeroPagination active={active} onSelect={setActive} />
    </section>
  );
}

function HeroCopy({ slide }: { slide: (typeof slides)[number] }): ReactElement {
  return (
    <div className="hero-copy" aria-live="polite" aria-atomic="true">
      <h1>{slide.title}</h1>
      <p>{slide.description}</p>
      <div className="hero-actions">
        <Link className="button button-green" href="/login">
          Enter student portal <Icon name="arrow" />
        </Link>
        <a className="button button-white-outline" href="#services">
          Explore student services
        </a>
      </div>
    </div>
  );
}

function HeroPhotos({ active }: { active: number }): ReactElement {
  return (
    <div className="hero-photos" aria-hidden="true">
      {slides.map((item, index): ReactElement => (
        <Image
          key={item.image}
          src={item.image}
          alt=""
          fill
          sizes="100vw"
          preload={index === 0}
          className={`hero-photo ${index === active ? "is-active" : ""}`}
        />
      ))}
    </div>
  );
}

function HeroPagination({
  active,
  onSelect,
}: {
  active: number;
  onSelect: (index: number) => void;
}): ReactElement {
  return (
    <div className="hero-bottom container">
      <span>Built around your academic journey</span>
      <div className="hero-dots" aria-label="Select welcome slide">
        {slides.map((item, index): ReactElement => (
          <button
            key={item.image}
            aria-label={`Show slide ${index + 1}`}
            aria-current={active === index ? "true" : undefined}
            onClick={(): void => onSelect(index)}
          >
            <span />
          </button>
        ))}
      </div>
      <span className="hero-counter">
        0{active + 1}
        <span> / 03</span>
      </span>
    </div>
  );
}

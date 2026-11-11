"use client";

import { useEffect, type ReactElement } from "react";
import { Icon } from "@/components/ui/icon";

type Question = { id: string; question: string; answer: string };

export function FaqList({
  questions,
}: {
  questions: Question[];
}): ReactElement {
  useEffect((): (() => void) => {
    function openLinkedGuide(): void {
      const target = document.getElementById(window.location.hash.slice(1));
      if (target instanceof HTMLDetailsElement) target.open = true;
    }
    openLinkedGuide();
    window.addEventListener("hashchange", openLinkedGuide);
    return (): void =>
      window.removeEventListener("hashchange", openLinkedGuide);
  }, []);
  return (
    <div className="faq-list">
      {questions.map((item): ReactElement => (
        <details id={`guide-${item.id}`} key={item.id}>
          <summary>
            {item.question}
            <Icon name="plus" />
          </summary>
          <p>{item.answer}</p>
        </details>
      ))}
    </div>
  );
}

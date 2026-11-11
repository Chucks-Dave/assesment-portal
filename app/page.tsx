import type { ReactElement } from "react";
import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import {
  About,
  Footer,
  GettingStarted,
  Services,
  Support,
} from "@/components/landing/sections";

export default function Home(): ReactElement {
  return (
    <>
      <Header />
      <main id="main-content">
        <Hero />
        <About />
        <Services />
        <GettingStarted />
        <Support />
      </main>
      <Footer />
    </>
  );
}

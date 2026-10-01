import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarCheck, Gamepad2, ShieldCheck } from "lucide-react";
import { Countdown } from "@/components/Countdown";
import { OnchainSummary } from "@/components/OnchainSummary";

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <Image src="/monad-party-hero.png" alt="Friends celebrating and raising the Monad symbol at a joyful outdoor party" fill priority sizes="100vw" />
        <div className="hero-copy">
          <p className="eyebrow">Good company. A little luck.</p>
          <h1>Monad Party</h1>
          <p>Play earns your entry.<br />Luck picks the winners.</p>
          <div className="hero-actions">
            <Link href="/passport" className="button button-primary">Join the party <ArrowRight size={17} /></Link>
            <Link href="/history" className="button button-quiet">Past draws</Link>
          </div>
        </div>
      </section>
      <section className="draw-band" aria-label="Weekly draw schedule">
        <div><p className="eyebrow">Your weekly reason to show up</p><h2>Same community. New chances.</h2></div>
        <div><p className="draw-label">Next weekly boundary / UTC</p><Countdown /></div>
      </section>

      <OnchainSummary />

      <section className="content-band">
        <div className="section-heading"><p className="eyebrow">How entry works</p><h2>Play. Come back. Join the draw.</h2></div>
        <div className="steps-grid">
          <article><span>01</span><Gamepad2 /><h3>Earn a stamp</h3><p>Complete the verified milestone in this week&apos;s featured Monad game.</p></article>
          <article><span>02</span><CalendarCheck /><h3>Come back</h3><p>Return on another UTC day and complete the milestone again.</p></article>
          <article><span>03</span><ShieldCheck /><h3>Complete your passport</h3><p>Connect X to unlock one entry in the sponsor funded weekly draw.</p></article>
        </div>
      </section>
    </>
  );
}

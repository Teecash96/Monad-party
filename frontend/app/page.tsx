import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Dice5, ShieldCheck } from "lucide-react";
import { Countdown } from "@/components/Countdown";
import { OnchainSummary } from "@/components/OnchainSummary";

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <Image src="/raffle-hero.png" alt="Transparent raffle machine selecting three winning tokens" fill priority sizes="100vw" />
        <div className="hero-shade" />
        <div className="hero-copy">
          <p className="eyebrow">Weekly rewards on Monad</p>
          <h1>Monad Party</h1>
          <p>Three active wallets win every week. The eligibility list is public. The draw is verifiable. The claim stays onchain.</p>
          <div className="hero-actions">
            <Link href="/connect" className="button button-primary">Enter this week <ArrowRight size={17} /></Link>
            <Link href="/history" className="button button-quiet">Review past draws</Link>
          </div>
          <Countdown />
        </div>
      </section>

      <OnchainSummary />

      <section className="content-band">
        <div className="section-heading"><p className="eyebrow">How entry works</p><h2>Activity plus identity. Both are required.</h2></div>
        <div className="steps-grid">
          <article><span>01</span><Dice5 /><h3>Use Monad</h3><p>Send at least three successful transactions in the Monday to Sunday UTC epoch and spend at least 0.001 MON on gas.</p></article>
          <article><span>02</span><ShieldCheck /><h3>Verify your X account</h3><p>Sign a wallet ownership message, connect X through OAuth, and keep at least 100 followers at snapshot time.</p></article>
          <article><span>03</span><CheckCircle2 /><h3>Claim if selected</h3><p>Your wallet proves its exact position in the weekly Merkle snapshot. Only the selected index can claim its assigned prize.</p></article>
        </div>
      </section>
    </>
  );
}

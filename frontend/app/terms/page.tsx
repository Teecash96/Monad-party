export const metadata = { title: "Terms | Proof of Play" };

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

export default function TermsPage() {
  return (
    <div className="page-shell narrow legal-page">
      <div className="page-heading">
        <p className="eyebrow">Effective 29 September 2026</p>
        <h1>Terms of service</h1>
        <p>Proof of Play is experimental hackathon software. Use it only if you understand blockchain risk.</p>
      </div>

      <section>
        <h2>Eligibility</h2>
        <p>You must control the wallet and X account that you connect. You must complete at least three successful Monad transactions in the weekly epoch, spend the published minimum gas amount, and have at least 100 X followers when the final snapshot runs.</p>
      </section>
      <section>
        <h2>Fair use</h2>
        <p>Do not use bought accounts, fake followers, identity resale, Sybil methods, or transaction manipulation. We can exclude abusive entries when the published rules permit it.</p>
      </section>
      <section>
        <h2>Draws and prizes</h2>
        <p>Entry does not guarantee a prize. Three distinct winners receive 50, 30, and 20 percent of the funded pool. Winners must claim within 30 days. Unclaimed value can roll into a later epoch.</p>
      </section>
      <section>
        <h2>Blockchain risk</h2>
        <p>Transactions can fail, cost gas, or become final. Wallet loss, network faults, oracle delay, contract defects, and third party outages can affect the service.</p>
      </section>
      <section>
        <h2>Service control</h2>
        <p>The sponsor can pause user actions during a security incident. The web application cannot reverse final blockchain records or valid claims.</p>
      </section>
      <section>
        <h2>No warranty</h2>
        <p>The service is provided as available without a promise that it will be uninterrupted or error free. Liability limits depend on applicable law.</p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>{supportEmail ? <a href={`mailto:${supportEmail}`}>{supportEmail}</a> : "A support address will be published before public launch."}</p>
      </section>
    </div>
  );
}

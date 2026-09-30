export const metadata = { title: "Privacy | Proof of Play" };

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

export default function PrivacyPage() {
  return (
    <div className="page-shell narrow legal-page">
      <div className="page-heading">
        <p className="eyebrow">Effective 29 September 2026</p>
        <h1>Privacy policy</h1>
        <p>This policy explains how Proof of Play uses wallet and X account data for raffle eligibility.</p>
      </div>

      <section>
        <h2>Data we collect</h2>
        <p>We store your wallet address, X user ID, X username, follower count, verification times, encrypted OAuth tokens, transaction activity totals, eligibility records, and prize records.</p>
      </section>
      <section>
        <h2>Why we use it</h2>
        <p>We use this data to confirm eligibility, prevent duplicate social identities, operate weekly draws, process claims, investigate abuse, and keep an audit record.</p>
      </section>
      <section>
        <h2>Public data</h2>
        <p>Eligible wallet addresses, entry indexes, proofs, roots, winners, and claims can be public on Monad or IPFS. We do not put your X ID, username, follower count, or OAuth tokens in the public snapshot.</p>
      </section>
      <section>
        <h2>Storage and security</h2>
        <p>OAuth tokens are encrypted at rest. Access is limited to the service components that recheck your X account. No system can guarantee absolute security.</p>
      </section>
      <section>
        <h2>Retention</h2>
        <p>We keep account links while they are active and keep raffle audit records as needed to verify draws and claims. Blockchain and IPFS records can be permanent.</p>
      </section>
      <section id="deletion">
        <h2>Disconnect and deletion</h2>
        <p>Use Disconnect X on the Connect page to revoke the grant and erase stored access and refresh tokens. For deletion of remaining offchain profile data, contact {supportEmail ? <a href={`mailto:${supportEmail}`}>{supportEmail}</a> : "the support address published with the live service"}. We cannot erase data already published to a blockchain or public IPFS network.</p>
      </section>
      <section>
        <h2>Changes</h2>
        <p>We can update this policy when the service changes. The effective date on this page will show the latest version.</p>
      </section>
    </div>
  );
}

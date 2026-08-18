export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-4xl">Privacy</h1>
      <div className="mt-6 space-y-4 text-sm leading-6">
        <p>SLO Market stores account details you provide (name, email, city, profile photo) to operate the marketplace.</p>
        <p>We do not store credit-card numbers or raw payment credentials. Payments are processed by Stripe.</p>
        <p>Your exact home address is not required and is not shown on listings. Only your selected city is public.</p>
        <p>Messages, orders, reports, and reviews are stored so we can operate the service, handle disputes, and keep the community safe.</p>
        <p>This privacy notice is a working draft and should be reviewed before launch.</p>
      </div>
    </div>
  );
}

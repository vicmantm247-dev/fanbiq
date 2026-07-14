import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="relative overflow-hidden h-svh pt-[env(safe-area-inset-top)] font-sans bg-background">
      <div className="absolute inset-0 top-20 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="rounded-3xl border bg-card p-6 shadow-sm">
            <h1 className="text-3xl font-bold mb-4">Terms and Conditions</h1>
            <p className="mb-4 text-sm text-muted-foreground">
              Please read these terms and conditions carefully before using fanbIQ.
            </p>
            <section className="space-y-4 text-sm leading-6 text-muted-foreground">
              <div>
                <h2 className="text-lg font-semibold">1. Acceptance of Terms</h2>
                <p>
                  By creating an account or using fanbIQ, you agree to comply with these terms.
                </p>
              </div>
              <div>
                <h2 className="text-lg font-semibold">2. Use of Service</h2>
                <p>
                  You may use fanbIQ only for lawful purposes. You agree not to misuse the service or attempt to gain unauthorized access.
                </p>
              </div>
              <div>
                <h2 className="text-lg font-semibold">3. Account Security</h2>
                <p>
                  You are responsible for maintaining the confidentiality of your account information.
                </p>
              </div>
              <div>
                <h2 className="text-lg font-semibold">4. Password Reset</h2>
                <p>
                  If you forget your password, use the forgot password flow to regain access. We are not responsible for lost passwords if you do not keep your email secure.
                </p>
              </div>
              <div>
                <h2 className="text-lg font-semibold">5. Changes</h2>
                <p>
                  We may update these terms from time to time. Continued use of the service means you accept the updated terms.
                </p>
              </div>
            </section>
            <div className="mt-8">
              <Link href="/login" className="text-primary underline">
                Back to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export const metadata = {
  title: 'Privacy Policy',
}

export default function PrivacyPage() {
  return (
    <div style={{
      maxWidth: 680,
      margin: '0 auto',
      padding: '40px 20px 80px',
      fontFamily: 'var(--font-sans)',
      color: 'var(--ink)',
      lineHeight: 1.7,
    }}>
      <h1 style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 30,
        fontWeight: 400,
        marginBottom: 4,
        color: 'var(--ink)',
      }}>
        Privacy Policy
      </h1>
      <p style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 36 }}>Last updated: May 2026</p>

      <Section heading="Who we are">
        <p>
          The Platform is operated by the Company, registered in Norway. We help people discover
          and publish events across Norway.
        </p>
      </Section>

      <Section heading="What data we collect">
        <ul>
          <li><strong>Account data:</strong> name, email address, and profile photo when you register</li>
          <li><strong>Event data:</strong> events you create, save, or mark as attending</li>
          <li><strong>Usage data:</strong> pages visited, search queries, and how you interact with the platform</li>
          <li><strong>Device data:</strong> browser type, operating system, and approximate location (city level) if you use the geolocation feature</li>
          <li><strong>Cookies:</strong> see the Cookie section below</li>
        </ul>
      </Section>

      <Section heading="Why we collect it">
        <ul>
          <li>To provide and improve the platform</li>
          <li>To show you relevant events based on your location and preferences</li>
          <li>To send transactional emails (account confirmation, event reminders) — only with your consent</li>
          <li>To measure platform performance via analytics — only with your consent</li>
          <li>To serve relevant advertisements — only with your consent</li>
        </ul>
      </Section>

      <Section heading="How long we keep it">
        <ul>
          <li>Account data is kept until you delete your account</li>
          <li>Usage and analytics data is kept for maximum 12 months</li>
          <li>You can request deletion of your data at any time</li>
        </ul>
      </Section>

      <Section heading="Your rights (GDPR)">
        <p>As a user in the EU/EEA you have the right to:</p>
        <ul>
          <li>Access all data we hold about you</li>
          <li>Correct inaccurate data</li>
          <li>Delete your account and all associated data</li>
          <li>Withdraw consent for marketing or analytics at any time</li>
          <li>
            Lodge a complaint with{' '}
            <a
              href="https://www.datatilsynet.no"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--green)' }}
            >
              Datatilsynet (datatilsynet.no)
            </a>
          </li>
        </ul>
        <p>To exercise your rights, contact us at: <a href="mailto:privacy@thecompany.no" style={{ color: 'var(--green)' }}>privacy@thecompany.no</a></p>
      </Section>

      <Section heading="Cookies">
        <p>We use the following types of cookies:</p>
        <ul>
          <li><strong>Necessary cookies:</strong> required for login and basic functionality — always active</li>
          <li><strong>Analytics cookies:</strong> help us understand how the platform is used — requires consent</li>
          <li><strong>Marketing cookies:</strong> used for targeted advertising — requires consent</li>
        </ul>
        <p>
          You can change your cookie preferences at any time in your profile under{' '}
          <strong>Settings → Privacy</strong>.
        </p>
      </Section>

      <Section heading="Third-party services">
        <ul>
          <li><strong>Supabase</strong> (database and authentication) — data stored in EU region</li>
          <li><strong>Google Analytics</strong> (usage analytics) — only loaded with consent</li>
          <li><strong>Google Ads</strong> — only loaded with consent</li>
        </ul>
      </Section>

      <Section heading="Contact">
        <p>
          The Company<br />
          <a href="mailto:privacy@thecompany.no" style={{ color: 'var(--green)' }}>privacy@thecompany.no</a>
        </p>
      </Section>
    </div>
  )
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 20,
        fontWeight: 400,
        marginBottom: 12,
        color: 'var(--ink)',
      }}>
        {heading}
      </h2>
      <div style={{ fontSize: 15, color: 'var(--ink2)' }}>
        {children}
      </div>
    </section>
  )
}

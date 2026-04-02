export default function PrivacyPolicy() {
  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px 20px',
      color: '#333',
      lineHeight: 1.7,
    }}>
      <style>{`
        .privacy-h1 { color: #1a56db; font-size: 2rem; margin-bottom: 0.5rem; }
        .privacy-h2 { color: #1e429f; font-size: 1.2rem; margin-top: 2rem; }
        .privacy-p { margin: 0.8rem 0; }
        .privacy-last-updated { color: #666; font-size: 0.9rem; margin-bottom: 2rem; }
        .privacy-a { color: #1a56db; }
        .privacy-ul { padding-left: 1.5rem; }
        .privacy-li { margin: 0.4rem 0; }
        .privacy-footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #eee; color: #666; font-size: 0.9rem; }
      `}</style>

      <h1 className="privacy-h1">Privacy Policy</h1>
      <p className="privacy-last-updated">Last updated: April 2, 2026</p>

      <p className="privacy-p">This Privacy Policy describes how ESJ Property Trust ("we", "us", or "our") collects, uses, and protects your personal information when you use My Maintenance Pro ("the App") available at <a className="privacy-a" href="https://login.mymaintpro.com">login.mymaintpro.com</a>.</p>

      <h2 className="privacy-h2">1. Who We Are</h2>
      <p className="privacy-p">ESJ Property Trust operates My Maintenance Pro, a property maintenance management platform designed to help property owners, landlords, and contractors manage and track property maintenance, inspections, and compliance.</p>

      <h2 className="privacy-h2">2. Information We Collect</h2>
      <p className="privacy-p">We collect the following types of information when you use our App:</p>
      <ul className="privacy-ul">
        <li className="privacy-li"><strong>Personal identification information</strong> — your name, email address, and phone number provided during signup</li>
        <li className="privacy-li"><strong>Property information</strong> — details about your properties, rooms, and maintenance items</li>
        <li className="privacy-li"><strong>Inspection data</strong> — inspection records, ratings, dates, and certificates you upload</li>
        <li className="privacy-li"><strong>Payment information</strong> — processed securely by Stripe; we do not store your card details</li>
        <li className="privacy-li"><strong>Usage data</strong> — how you interact with the App, including pages visited and features used</li>
        <li className="privacy-li"><strong>Device information</strong> — device type, operating system, and browser type</li>
      </ul>

      <h2 className="privacy-h2">3. How We Use Your Information</h2>
      <p className="privacy-p">We use your information to:</p>
      <ul className="privacy-ul">
        <li className="privacy-li">Provide and operate the My Maintenance Pro service</li>
        <li className="privacy-li">Send maintenance reminders, inspection notifications, and service alerts</li>
        <li className="privacy-li">Process payments and manage your subscription</li>
        <li className="privacy-li">Generate maintenance reports and compliance records</li>
        <li className="privacy-li">Improve and develop our services</li>
        <li className="privacy-li">Respond to your support requests</li>
        <li className="privacy-li">Comply with legal obligations</li>
      </ul>

      <h2 className="privacy-h2">4. How We Share Your Information</h2>
      <p className="privacy-p">We do not sell your personal information. We may share your information with:</p>
      <ul className="privacy-ul">
        <li className="privacy-li"><strong>Stripe</strong> — for secure payment processing</li>
        <li className="privacy-li"><strong>SendGrid</strong> — for sending email notifications and verification codes</li>
        <li className="privacy-li"><strong>OpenAI</strong> — for AI-powered certificate reading and maintenance recommendations</li>
        <li className="privacy-li"><strong>Neon</strong> — our secure database provider</li>
        <li className="privacy-li"><strong>Contractors</strong> — only information you explicitly share with them through the App</li>
      </ul>
      <p className="privacy-p">All third-party providers are bound by their own privacy policies and applicable data protection laws.</p>

      <h2 className="privacy-h2">5. Data Storage and Security</h2>
      <p className="privacy-p">Your data is stored securely on servers located in the United States. We implement industry-standard security measures including SSL encryption, secure authentication, and regular security monitoring to protect your information.</p>

      <h2 className="privacy-h2">6. Data Retention</h2>
      <p className="privacy-p">We retain your personal information for as long as your account is active or as needed to provide our services. If you close your account, we will delete your personal data within 30 days, except where we are required to retain it by law.</p>

      <h2 className="privacy-h2">7. Your Rights</h2>
      <p className="privacy-p">You have the right to:</p>
      <ul className="privacy-ul">
        <li className="privacy-li">Access the personal information we hold about you</li>
        <li className="privacy-li">Request correction of inaccurate information</li>
        <li className="privacy-li">Request deletion of your personal information</li>
        <li className="privacy-li">Withdraw consent to processing at any time</li>
        <li className="privacy-li">Lodge a complaint with a relevant data protection authority</li>
      </ul>
      <p className="privacy-p">To exercise any of these rights, please contact us at <a className="privacy-a" href="mailto:support@mymaintpro.com">support@mymaintpro.com</a>.</p>

      <h2 className="privacy-h2">8. Cookies</h2>
      <p className="privacy-p">We use essential cookies to keep you logged in and maintain your session. We do not use advertising or tracking cookies.</p>

      <h2 className="privacy-h2">9. Children's Privacy</h2>
      <p className="privacy-p">Our App is not intended for use by children under the age of 13. We do not knowingly collect personal information from children.</p>

      <h2 className="privacy-h2">10. Changes to This Policy</h2>
      <p className="privacy-p">We may update this Privacy Policy from time to time. We will notify you of any significant changes by email or through the App. Continued use of the App after changes constitutes acceptance of the updated policy.</p>

      <h2 className="privacy-h2">11. Contact Us</h2>
      <p className="privacy-p">If you have any questions about this Privacy Policy or how we handle your data, please contact us at:</p>
      <p className="privacy-p">
        <strong>ESJ Property Trust</strong><br />
        Email: <a className="privacy-a" href="mailto:support@mymaintpro.com">support@mymaintpro.com</a><br />
        Website: <a className="privacy-a" href="https://mymaintpro.com">mymaintpro.com</a>
      </p>

      <div className="privacy-footer">
        <p>© 2026 ESJ Property Trust. All rights reserved. My Maintenance Pro is a product of ESJ Property Trust.</p>
      </div>
    </div>
  );
}

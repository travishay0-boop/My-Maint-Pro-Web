// SendGrid Integration - supports direct API key (SENDGRID_API_KEY) or Replit Connector
import sgMail from '@sendgrid/mail';

async function getCredentials(): Promise<{ apiKey: string; email: string }> {
  // 1. Try direct environment variables first (user's own SendGrid account)
  if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
    return {
      apiKey: process.env.SENDGRID_API_KEY,
      email: process.env.SENDGRID_FROM_EMAIL,
    };
  }

  // 2. Fall back to Replit connector
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken || !hostname) {
    throw new Error('No SendGrid credentials available. Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL.');
  }

  const connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=sendgrid',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken,
      },
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings?.settings?.api_key || !connectionSettings?.settings?.from_email) {
    throw new Error('SendGrid connector not connected');
  }

  return {
    apiKey: connectionSettings.settings.api_key,
    email: connectionSettings.settings.from_email,
  };
}

// WARNING: Never cache this client — access tokens expire.
export async function getUncachableSendGridClient() {
  const { apiKey, email } = await getCredentials();
  sgMail.setApiKey(apiKey);
  return { client: sgMail, fromEmail: email };
}

// Helper function to send an email
export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    content: string;
    filename: string;
    type?: string;
    disposition?: string;
  }>;
}) {
  const { client, fromEmail } = await getUncachableSendGridClient();

  const msg = {
    to: options.to,
    from: fromEmail,
    subject: options.subject,
    text: options.text || '',
    html: options.html || options.text || '',
    ...(options.attachments && { attachments: options.attachments }),
  };

  try {
    await client.send(msg);
    console.log(`Email sent successfully to ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);
    return { success: true };
  } catch (error: any) {
    console.error('SendGrid error:', error.response?.body || error.message);
    throw error;
  }
}

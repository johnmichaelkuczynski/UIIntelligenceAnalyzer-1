import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log("SendGrid API key set successfully");
} else {
  console.warn("SendGrid API key not found in environment variables");
}

interface EmailContent {
  recipient: string;
  subject: string;
  textContent: string;
  htmlContent?: string;
  senderName?: string;
  senderEmail?: string;
}

/**
 * Send an email with cognitive profile report via SendGrid
 */
export async function sendReportEmail(emailContent: EmailContent): Promise<{ success: boolean; message: string }> {
  try {
    // Validate SendGrid API key
    if (!process.env.SENDGRID_API_KEY) {
      return {
        success: false,
        message: "SendGrid API key is missing. Email cannot be sent."
      };
    }

    // Use verified sender from environment or default
    const senderEmail = emailContent.senderEmail || process.env.SENDGRID_VERIFIED_SENDER || 'no-reply@example.com';
    const senderName = emailContent.senderName || 'Cognitive Intelligence Profiler';
    
    // Format HTML content if not provided
    const html = emailContent.htmlContent || `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #444;">Cognitive Intelligence Profile</h2>
        <p>Here is the intelligence profile you requested:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; font-family: monospace; white-space: pre-wrap;">
          ${emailContent.textContent.replace(/\n/g, '<br>')}
        </div>
        <p style="margin-top: 20px; color: #666; font-size: 12px;">
          This analysis represents an intelligence profile based on cognitive patterns in the submitted text.
        </p>
      </div>
    `;

    const msg = {
      to: emailContent.recipient,
      from: {
        email: senderEmail,
        name: senderName
      },
      subject: emailContent.subject,
      text: emailContent.textContent,
      html: html
    };

    await sgMail.send(msg);
    return {
      success: true,
      message: `Report successfully sent to ${emailContent.recipient}`
    };
  } catch (error: any) {
    console.error('Error sending email:', error);
    return {
      success: false,
      message: `Failed to send email: ${error.message || 'Unknown error'}`
    };
  }
}
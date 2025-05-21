import sgMail from '@sendgrid/mail';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('SendGrid configuration status:');
  console.log(`- API Key present: ${Boolean(process.env.SENDGRID_API_KEY)}`);
  console.log(`- Verified sender: ${process.env.SENDGRID_VERIFIED_SENDER}`);
} else {
  console.warn('SENDGRID_API_KEY not provided. Email functionality will be limited.');
}

/**
 * Sends an analysis report via email
 * @param recipientEmail Email address to send the report to
 * @param subject Email subject line
 * @param analysisReport The formatted analysis report
 * @param senderEmail Optional custom sender email (defaults to verified sender)
 * @param senderName Optional sender name
 * @returns Object with success status and message
 */
export async function sendAnalysisReport(
  recipientEmail: string,
  subject: string,
  analysisReport: string,
  senderEmail?: string,
  senderName?: string
): Promise<{ success: boolean; message: string }> {
  
  if (!process.env.SENDGRID_API_KEY) {
    return { 
      success: false, 
      message: 'SendGrid API key not configured. Cannot send email.' 
    };
  }
  
  try {
    const sender = senderEmail || process.env.SENDGRID_VERIFIED_SENDER;
    
    if (!sender) {
      return { 
        success: false, 
        message: 'No sender email provided or configured. Cannot send email.' 
      };
    }
    
    const formattedSender = senderName ? `${senderName} <${sender}>` : sender;
    
    const msg = {
      to: recipientEmail,
      from: formattedSender,
      subject,
      text: 'Please view this email in an HTML-compatible email client.',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { color: #2563eb; margin-bottom: 20px; }
            h2 { color: #4b5563; margin-top: 30px; margin-bottom: 15px; }
            .report { white-space: pre-wrap; padding: 20px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 5px; margin-top: 20px; font-family: Georgia, serif; }
            .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 0.8em; color: #6b7280; }
          </style>
        </head>
        <body>
          <h1>Cognitive Intelligence Analysis Report</h1>
          <p>Below is the cognitive profile analysis generated through our AI-powered analysis platform.</p>
          <div class="report">${analysisReport.replace(/\n/g, '<br>')}</div>
          <div class="footer">
            <p>This report was generated automatically on ${new Date().toLocaleString()}.</p>
            <p>Cognitive Analysis Platform - Measuring the mind behind the text</p>
          </div>
        </body>
        </html>
      `
    };
    
    await sgMail.send(msg);
    return { success: true, message: 'Analysis report sent successfully!' };
  } catch (error: any) {
    console.error('Error sending email:', error);
    const errorMessage = error.response?.body?.errors?.[0]?.message || error.message || 'Unknown error';
    return { success: false, message: `Failed to send email: ${errorMessage}` };
  }
}
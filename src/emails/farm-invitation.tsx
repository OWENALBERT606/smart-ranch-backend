import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface FarmInvitationEmailParams {
  to: string;
  userName: string;
  farmName: string;
  role: string;
  invitedBy: string;
}

export async function sendFarmInvitationEmail({
  to,
  userName,
  farmName,
  role,
  invitedBy,
}: FarmInvitationEmailParams) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const acceptUrl = `${appUrl}/invitations`;

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || "Smart Livestock AI <noreply@smartlivestock.ai>",
      to,
      subject: `Invitation to join ${farmName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Farm Invitation</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Smart Livestock AI</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Farm Invitation</h2>
            
            <p>Hello <strong>${userName}</strong>,</p>
            
            <p>You've been invited by <strong>${invitedBy}</strong> to join <strong>${farmName}</strong> as a <strong>${role}</strong>.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #667eea;">
              <h3 style="margin-top: 0; color: #667eea;">Farm Details</h3>
              <p style="margin: 10px 0;"><strong>Farm:</strong> ${farmName}</p>
              <p style="margin: 10px 0;"><strong>Role:</strong> ${role}</p>
              <p style="margin: 10px 0;"><strong>Invited by:</strong> ${invitedBy}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${acceptUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                View Invitation
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              If you're having trouble clicking the button, copy and paste this URL into your browser:
            </p>
            <p style="color: #667eea; font-size: 12px; word-break: break-all;">
              ${acceptUrl}
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
              Smart Livestock AI - Intelligent Farm Management
              <br>
              This is an automated email. Please do not reply.
            </p>
          </div>
        </body>
        </html>
      `,
    });
  } catch (error) {
    console.error("Failed to send farm invitation email:", error);
    throw error;
  }
}
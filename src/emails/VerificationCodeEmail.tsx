

// import * as React from "react";
// import { Html, Body, Container, Text, Hr, Link, Img, Section } from "@react-email/components";

// export default function VerificationCodeEmail({
//   name = "there",
//   code,
// }: { name?: string; code: string }) {
//   return (
//     <Html>
//       <Body style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
//         <Container style={{ maxWidth: 560, margin: "24px auto", padding: 24, border: "1px solid #eee", borderRadius: 12 }}>
//                      <Section style={{ textAlign: "center", marginBottom: 16 }}>
//             <Link href="goldkach.co.ug" target="_blank" rel="noopener noreferrer">
//               <Img
//                 src="https://ylhpxhcgr4.ufs.sh/f/ZVlDsNdibGfFjOMmT0owa03UxsE9D4Q16iJb7PSqYeAZTyFV?expires=1760582229143&signature=hmac-sha256%3D2fcbc9a2f7b1993ffc36cb97f27843431e61fd20198a8b3ccfc3b03576970ecf"   // ensure this path is correct and accessible
//                 alt="Goldkach"
//                 width={120}          // set intrinsic dimensions for better rendering
//                 height={120}         // optional but recommended
//                 style={{ display: "block", margin: "0 auto" }}
//               />
//             </Link>
//           </Section>
//           <Text style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Verify your email</Text>
//           <Text style={{ color: "#555" }}>
//             Hi {name}, here is your 6-digit verification code:
//           </Text>
//           <Text style={{ fontSize: 28, letterSpacing: 4, margin: "12px 0", fontWeight: 700 }}>
//             {code}
//           </Text>
//           <Text style={{ color: "#777", fontSize: 12 }}>
//             If you didn’t create an account, you can ignore this email.
//           </Text>
//           <Hr />
//           <Text style={{ color: "#aaa", fontSize: 12 }}>© {new Date().getFullYear()} Goldkach</Text>
//         </Container>
//       </Body>
//     </Html>
//   );
// }






// emails/VerificationCodeEmail.tsx
import * as React from "react";
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Hr,
  Link,
  Img,
} from "@react-email/components";

type Props = {
  name?: string;
  code: string;
};

export default function VerificationCodeEmail({ name = "there", code }: Props) {
  const year = new Date().getFullYear();

  return (
    <Html>
      <Head />
      <Preview>Verify your Smart Livestock AI email - Code: {code}</Preview>
      <Body
        style={{
          margin: 0,
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, sans-serif',
          backgroundColor: "#f0fdf4",
          color: "#111",
        }}
      >
        <Container
          style={{
            maxWidth: 560,
            margin: "24px auto",
            background: "#fff",
            border: "1px solid #d1fae5",
            borderRadius: 16,
            padding: 32,
            boxShadow: "0 4px 6px rgba(16, 185, 129, 0.1)",
          }}
        >
          {/* Logo Section */}
          <Section style={{ textAlign: "center", marginBottom: 24 }}>
            <Link href="https://smartlivestock.ai" target="_blank" rel="noopener noreferrer">
              <Img
                src="https://your-logo-url-here.com/logo.png"
                alt="Smart Livestock AI"
                width={80}
                height={80}
                style={{ display: "block", margin: "0 auto", borderRadius: 12 }}
              />
            </Link>
          </Section>

          {/* Header Badge */}
          <Section style={{ textAlign: "center", marginBottom: 16 }}>
            <div
              style={{
                display: "inline-block",
                background: "linear-gradient(135deg, #10b981 0%, #14b8a6 100%)",
                padding: "12px 24px",
                borderRadius: 12,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  margin: 0,
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                }}
              >
                ✉️ EMAIL VERIFICATION
              </Text>
            </div>
          </Section>

          <Text
            style={{
              fontSize: 24,
              fontWeight: 700,
              margin: "0 0 16px 0",
              color: "#111",
              textAlign: "center",
            }}
          >
            Verify your email address
          </Text>

          <Text
            style={{
              color: "#555",
              marginTop: 0,
              lineHeight: 1.6,
              textAlign: "center",
              fontSize: 15,
            }}
          >
            Hi <strong>{name}</strong>, welcome to Smart Livestock AI! 🎉
            <br />
            Please use the verification code below to complete your registration.
          </Text>

          {/* Verification Code Box */}
          <Section
            style={{
              margin: "32px 0",
              padding: 24,
              background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
              borderRadius: 12,
              border: "2px solid #10b981",
              textAlign: "center",
            }}
          >
            <Text
              style={{
                margin: "0 0 8px 0",
                color: "#065f46",
                fontSize: 14,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              Your Verification Code
            </Text>
            <Text
              style={{
                fontSize: 40,
                letterSpacing: 12,
                margin: "8px 0",
                fontWeight: 800,
                color: "#047857",
                fontFamily: "Courier New, monospace",
              }}
            >
              {code}
            </Text>
            <Text
              style={{
                margin: "8px 0 0 0",
                color: "#059669",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              Enter this code in the verification page
            </Text>
          </Section>

          {/* Expiration Notice */}
          <Section
            style={{
              background: "#fef3c7",
              padding: 12,
              borderRadius: 8,
              border: "1px solid #fde68a",
              marginBottom: 24,
            }}
          >
            <Text style={{ color: "#92400e", fontSize: 13, margin: 0, textAlign: "center" }}>
              ⏱️ This code expires in <strong>10 minutes</strong>
            </Text>
          </Section>

          <Hr style={{ borderColor: "#e5e7eb", margin: "24px 0" }} />

          {/* Security Notice */}
          <Section
            style={{
              background: "#f9fafb",
              padding: 16,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              marginBottom: 16,
            }}
          >
            <Text style={{ color: "#6b7280", fontSize: 13, margin: 0, lineHeight: 1.5 }}>
              🛡️ <strong>Security tip:</strong> Never share this code with anyone. Smart Livestock AI
              staff will never ask for your verification code.
            </Text>
          </Section>

          <Text style={{ color: "#6b7280", fontSize: 13, textAlign: "center", margin: "16px 0" }}>
            If you didn't create an account with Smart Livestock AI, you can safely ignore this
            email.
          </Text>

          {/* Footer */}
          <Text style={{ color: "#6b7280", fontSize: 13, marginTop: 16, textAlign: "center" }}>
            Need help?{" "}
            <Link
              href="https://smartlivestock.ai/support"
              style={{ color: "#10b981", textDecoration: "underline" }}
            >
              Contact Support
            </Link>
          </Text>

          <Hr style={{ borderColor: "#e5e7eb", margin: "16px 0" }} />

          <Text
            style={{
              color: "#9ca3af",
              fontSize: 12,
              textAlign: "center",
              margin: "8px 0 0 0",
            }}
          >
            © {year} Smart Livestock AI • Intelligent Farm Management
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
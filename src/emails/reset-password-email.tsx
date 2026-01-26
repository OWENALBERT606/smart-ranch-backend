

// // emails/ResetPasswordEmail.tsx
// import * as React from "react";
// import {
//   Html,
//   Head,
//   Preview,
//   Body,
//   Container,
//   Section,
//   Text,
//   Button,
//   Hr,
//   Link,
//   Img,
// } from "@react-email/components";

// type Props = {
//   name?: string;
//   resetUrl: string; // must be absolute: https://yourapp.com/reset-password?token=...&uid=...
// };

// export default function ResetPasswordEmail({ name = "there", resetUrl }: Props) {
//   const year = new Date().getFullYear();

//   return (
//     <Html>
//       <Head />
//       <Preview>Reset your Goldkach password (link expires in 30 minutes)</Preview>
//       <Body
//         style={{
//           margin: 0,
//           fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, sans-serif',
//           backgroundColor: "#f8f9fb",
//           color: "#111",
//         }}
//       >
//         <Container
//           style={{
//             maxWidth: 560,
//             margin: "24px auto",
//             background: "#fff",
//             border: "1px solid #eee",
//             borderRadius: 12,
//             padding: 24,
//           }}
//         >
//               <Section style={{ textAlign: "center", marginBottom: 16 }}>
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
//           <Text style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Reset your password</Text>
//           <Text style={{ color: "#555", marginTop: 8 }}>
//             Hi {name}, click the button below to set a new password. This link expires in 30 minutes.
//           </Text>

//           <Section style={{ margin: "20px 0" }}>
//             <Button
//               href={resetUrl}
//               target="_blank"
//               rel="noopener noreferrer"
//               style={{
//                 display: "inline-block",
//                 background: "#111",
//                 color: "#fff",
//                 padding: "12px 16px",
//                 borderRadius: 8,
//                 textDecoration: "none",
//                 fontWeight: 600,
//               }}
//             >
//               Reset password
//             </Button>
//           </Section>

//           {/* Fallback link if buttons/images are blocked */}
//           <Text style={{ color: "#777", fontSize: 12 }}>
//             If the button doesn’t work, copy and paste this link into your browser:
//             <br />
//             <a
//               href={resetUrl}
//               target="_blank"
//               rel="noopener noreferrer"
//               style={{ color: "#0a66c2", wordBreak: "break-all" }}
//             >
//               {resetUrl}
//             </a>
//           </Text>

//           <Hr style={{ borderColor: "#eee", margin: "16px 0" }} />

//           <Text style={{ color: "#888", fontSize: 12, marginTop: 0 }}>
//             If you didn’t request this, you can safely ignore this email.
//           </Text>

//           <Text style={{ color: "#aaa", fontSize: 12, marginTop: 8 }}>
//             © {year} Goldkach
//           </Text>
//         </Container>
//       </Body>
//     </Html>
//   );
// }



// emails/ResetPasswordEmail.tsx
import * as React from "react";
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Link,
  Img,
} from "@react-email/components";

type Props = {
  name?: string;
  resetUrl: string; // must be absolute: https://yourapp.com/reset-password?token=...&uid=...
};

export default function ResetPasswordEmail({ name = "there", resetUrl }: Props) {
  const year = new Date().getFullYear();

  return (
    <Html>
      <Head />
      <Preview>Reset your Smart Livestock AI password (link expires in 30 minutes)</Preview>
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

          {/* Header */}
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
                🔒 PASSWORD RESET REQUEST
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
            Reset your password
          </Text>

          <Text style={{ color: "#555", marginTop: 0, lineHeight: 1.6, textAlign: "center" }}>
            Hi <strong>{name}</strong>, we received a request to reset your Smart Livestock AI password.
            Click the button below to set a new password.
          </Text>

          <Text
            style={{
              color: "#dc2626",
              fontSize: 14,
              fontWeight: 600,
              textAlign: "center",
              margin: "12px 0",
            }}
          >
            ⏱️ This link expires in 30 minutes
          </Text>

          {/* Reset Button */}
          <Section style={{ margin: "32px 0", textAlign: "center" }}>
            <Button
              href={resetUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                background: "linear-gradient(135deg, #10b981 0%, #14b8a6 100%)",
                color: "#fff",
                padding: "14px 32px",
                borderRadius: 10,
                textDecoration: "none",
                fontWeight: 700,
                fontSize: 16,
                boxShadow: "0 4px 6px rgba(16, 185, 129, 0.3)",
              }}
            >
              Reset My Password
            </Button>
          </Section>

          {/* Fallback link */}
          <Section
            style={{
              background: "#f9fafb",
              padding: 16,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              marginBottom: 24,
            }}
          >
            <Text style={{ color: "#6b7280", fontSize: 12, margin: "0 0 8px 0" }}>
              If the button doesn't work, copy and paste this link into your browser:
            </Text>
            <Text style={{ margin: 0 }}>
              <a
                href={resetUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#10b981",
                  fontSize: 12,
                  wordBreak: "break-all",
                  textDecoration: "underline",
                }}
              >
                {resetUrl}
              </a>
            </Text>
          </Section>

          <Hr style={{ borderColor: "#e5e7eb", margin: "24px 0" }} />

          {/* Security Notice */}
          <Section
            style={{
              background: "#fef3c7",
              padding: 12,
              borderRadius: 8,
              border: "1px solid #fde68a",
              marginBottom: 16,
            }}
          >
            <Text style={{ color: "#92400e", fontSize: 13, margin: 0, lineHeight: 1.5 }}>
              🛡️ <strong>Security tip:</strong> If you didn't request this password reset, you can
              safely ignore this email. Your password will remain unchanged.
            </Text>
          </Section>

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
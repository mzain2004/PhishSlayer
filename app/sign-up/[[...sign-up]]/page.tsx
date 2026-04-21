import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0f",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "600px",
          height: "600px",
          background:
            "radial-gradient(ellipse at center, rgba(124,106,247,0.15) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 10,
          padding: "2rem",
        }}
      >
        <SignUp
          appearance={{
            variables: {
              colorPrimary: "#7c6af7",
              colorBackground: "#0f0f1a",
              colorText: "#e2e8f0",
              colorInputBackground: "#1a1a2e",
              colorInputText: "#e2e8f0",
              borderRadius: "12px",
              fontFamily: "Inter, system-ui, sans-serif",
            },
            elements: {
              card: {
                background: "rgba(15,15,26,0.85)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(124,106,247,0.2)",
                boxShadow:
                  "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
              },
              headerTitle: {
                color: "#e2e8f0",
              },
              headerSubtitle: {
                color: "#94a3b8",
              },
              socialButtonsBlockButton: {
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#e2e8f0",
              },
              formButtonPrimary: {
                background: "linear-gradient(135deg, #7c6af7 0%, #5b4cdb 100%)",
                boxShadow: "0 4px 15px rgba(124,106,247,0.4)",
              },
              footerActionLink: {
                color: "#7c6af7",
              },
            },
          }}
        />
      </div>
    </div>
  );
}

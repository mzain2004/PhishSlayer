import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="min-h-screen w-full bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-2 md:p-4">
        <SignUp 
          routing="path" 
          path="/sign-up" 
          signInUrl="/sign-in"
          appearance={{
            elements: {
              card: "bg-transparent shadow-none",
              rootBox: "bg-transparent",
              headerTitle: "text-white",
              headerSubtitle: "text-gray-400",
              socialButtonsBlockButton: "bg-white/10 border-white/10 hover:bg-white/20 text-white",
              socialButtonsBlockButtonText: "text-white",
              dividerLine: "bg-white/10",
              dividerText: "text-gray-500",
              formFieldLabel: "text-gray-300",
              formButtonPrimary: "bg-teal-500 hover:bg-teal-400 text-white",
              footerActionText: "text-gray-400",
              footerActionLink: "text-teal-400 hover:text-teal-300",
              identityPreviewText: "text-white",
              identityPreviewEditButtonIcon: "text-teal-400",
              formFieldInput: "bg-white/5 border-white/10 text-white focus:ring-teal-500 focus:border-teal-500"
            }
          }}
        />
      </div>
    </main>
  );
}

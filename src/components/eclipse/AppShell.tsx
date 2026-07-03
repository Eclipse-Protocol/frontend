import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { Toaster } from "sonner";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="eclipse-page-bg min-h-screen">
      <Navbar />
      <main>{children}</main>
      <Footer />
      <Toaster
        theme="dark"
        toastOptions={{
          style: {
            background: "#120E1F",
            border: "1px solid rgba(168,85,247,0.35)",
            color: "#F5F3F7",
          },
        }}
      />
    </div>
  );
}

import { AuthErrorBoundary } from "./AuthErrorBoundary";
import { Navbar } from "./Navbar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthErrorBoundary>
      <Navbar />
      {children}
    </AuthErrorBoundary>
  );
}

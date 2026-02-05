import { SignUp } from "@clerk/nextjs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VenetianMask } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 bg-muted/20">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-md">
            <VenetianMask className="h-16 w-16" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Bandiit</h1>
        </div>

        <Card className="border-border/50 shadow-lg p-0 pt-6">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Create an account</CardTitle>
            <CardDescription>Enter your details to get started</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center p-0">
            <SignUp
              appearance={{
                elements: {
                  formButtonPrimary:
                    "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
                  card: "shadow-none border-none w-full bg-transparent",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  rootBox: "w-full",
                },
              }}
              path="/sign-up"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>
            Enter your details to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignUp
            appearance={{
              elements: {
                formButtonPrimary:
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                card: "shadow-none border-none",
              },
            }}
            path="/sign-up"
          />
        </CardContent>
      </Card>
    </div>
  );
}

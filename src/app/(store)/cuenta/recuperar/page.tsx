import { AuthPage } from "@/components/account/auth-page";

export const metadata = { robots: { index: false, follow: false } };

export default function Page() {
  return <AuthPage mode="forgot" staff={false} />;
}

import { AuthPage } from "@/components/account/auth-page";

export const dynamic = "force-dynamic";

export const metadata = { robots: { index: false, follow: false } };

export default function Page() {
  return <AuthPage mode="login" staff={true} />;
}

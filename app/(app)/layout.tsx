import { AppNav } from "@/components/app-nav";
import { getCurrentProfile } from "@/lib/auth";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  return (
    <div className="app-shell min-h-dvh">
      <AppNav profile={profile} />
      <main className="mx-auto max-w-5xl px-4 py-5 safe-bottom">{children}</main>
    </div>
  );
}

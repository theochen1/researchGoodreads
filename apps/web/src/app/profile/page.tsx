import { requirePageUser } from "@/lib/server/page-auth";
import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  await requirePageUser();

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Profile</h1>
          <p className="page-subtitle">
            Basic beta identity used for following, feed context, and paper-page
            social signals.
          </p>
        </div>
      </header>
      <ProfileForm />
    </>
  );
}

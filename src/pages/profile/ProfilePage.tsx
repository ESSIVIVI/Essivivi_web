import { useAuth } from "@/auth/AuthContext";
import { Spinner } from "@/components/ui";
import { PasswordForm } from "./PasswordForm";
import { ProfileForm } from "./ProfileForm";
import { TwoFactorSection } from "./TwoFactorSection";

export default function ProfilePage() {
  const { me } = useAuth();
  // Les formulaires prennent leurs valeurs initiales dans `me` : on attend qu'il soit chargé.
  if (!me) {
    return (
      <div className="flex justify-center py-10 text-brand-700" role="status" aria-label="Chargement du profil">
        <Spinner className="size-6" />
      </div>
    );
  }
  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-2xl font-semibold">Mon profil</h1>
      <ProfileForm />
      <PasswordForm />
      <TwoFactorSection />
    </div>
  );
}

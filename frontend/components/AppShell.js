'use client';
import { ToastProvider } from '@/components/Toast';
import { useProfile } from '@/lib/useProfile';
import ProfileSetupModal from '@/components/ProfileSetupModal';

function AppShellInner({ children }) {
  const { showSetup, saveName } = useProfile();

  return (
    <>
      {showSetup && <ProfileSetupModal onSave={saveName} />}
      {children}
    </>
  );
}

export default function AppShell({ children }) {
  return (
    <ToastProvider>
      <AppShellInner>{children}</AppShellInner>
    </ToastProvider>
  );
}

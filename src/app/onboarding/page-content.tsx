'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client';
import type { ProposalContent } from '@/lib/proposals';
import type { InferredAttribute } from '@/lib/yard-inference';
import ZipScreen from '@/components/onboarding/zip-screen';
import LoadingScreen from '@/components/onboarding/loading-screen';
import ProposalScreen from '@/components/onboarding/proposal-screen';
import SignupScreen from '@/components/onboarding/signup-screen';
import ProfileScreen from '@/components/onboarding/profile-screen';

type Step = 'zip' | 'loading' | 'proposal' | 'confirmation' | 'signup' | 'profile';

// ── sessionStorage keys ──────────────────────────────────────────────────────
const SK = {
  proposal: 'la_onboarding_proposal',
  attributes: 'la_onboarding_attributes',
  zip: 'la_onboarding_zip',
  zone: 'la_onboarding_zone',
  lat: 'la_onboarding_lat',
  lng: 'la_onboarding_lng',
} as const;

function storeOnboardingData(data: {
  proposal: ProposalContent;
  attributes: InferredAttribute[];
  zip: string;
  zone: string;
  lat: string;
  lng: string;
}) {
  try {
    sessionStorage.setItem(SK.proposal, JSON.stringify(data.proposal));
    sessionStorage.setItem(SK.attributes, JSON.stringify(data.attributes));
    sessionStorage.setItem(SK.zip, data.zip);
    sessionStorage.setItem(SK.zone, data.zone);
    sessionStorage.setItem(SK.lat, data.lat);
    sessionStorage.setItem(SK.lng, data.lng);
  } catch {
    // Storage unavailable (private mode, quota exceeded) — data stays in memory only.
    // The onboarding flow works without sessionStorage; auth redirect recovery will fail.
  }
}

function loadOnboardingData() {
  try {
    const proposal = sessionStorage.getItem(SK.proposal);
    const attributes = sessionStorage.getItem(SK.attributes);
    const zip = sessionStorage.getItem(SK.zip);
    const zone = sessionStorage.getItem(SK.zone);
    const lat = sessionStorage.getItem(SK.lat);
    const lng = sessionStorage.getItem(SK.lng);
    if (!proposal || !attributes || !zip || !zone || !lat || !lng) return null;
    return {
      proposal: JSON.parse(proposal) as ProposalContent,
      attributes: JSON.parse(attributes) as InferredAttribute[],
      zip,
      zone,
      lat,
      lng,
    };
  } catch {
    return null;
  }
}

function clearOnboardingData() {
  try {
    Object.values(SK).forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // Ignore — if storage wasn’t writable, there’s nothing to clear
  }
}

export default function OnboardingContent() {
  const router = useRouter();
  const session = authClient.useSession();
  const mountHandled = useRef(false);
  // Tracks whether the initial session check has resolved at least once.
  // After that, subsequent isPending flickers (tab refocus) don't blank the UI.
  const sessionReadyOnce = useRef(false);

  const [step, setStep] = useState<Step>('zip');
  const [proposal, setProposal] = useState<ProposalContent | null>(null);
  const [attributes, setAttributes] = useState<InferredAttribute[]>([]);
  const [zip, setZip] = useState('');
  const [zone, setZone] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);

  // ── Loading screen gate ────────────────────────────────────────────────────
  // Both the API result AND the message-3 minimum display time must be satisfied
  // before advancing to the proposal screen. Whichever arrives second triggers it.
  const pendingProposalRef = useRef<{
    proposal: ProposalContent;
    attributes: InferredAttribute[];
    zip: string;
    zone: string;
    lat: string;
    lng: string;
  } | null>(null);
  const lastMessageReadyRef = useRef(false);

  // ── Confirmation beat gate ─────────────────────────────────────────────────
  // Advancing to 'profile' requires both: DB write done AND 2s display beat elapsed.
  // Whichever arrives second triggers the transition.
  const confirmWriteDoneRef = useRef(false);
  const confirmBeatDoneRef = useRef(false);

  function tryAdvanceToProposal() {
    if (!pendingProposalRef.current || !lastMessageReadyRef.current) return;
    const data = pendingProposalRef.current;
    pendingProposalRef.current = null;
    lastMessageReadyRef.current = false;
    setProposal(data.proposal);
    setAttributes(data.attributes);
    setZone(data.zone);
    setLat(data.lat);
    setLng(data.lng);
    storeOnboardingData(data);
    setStep('proposal');
  }

  // ── Mount logic: handle auth return ────────────────────────────────────────
  // Three cases:
  // 1. Fresh visit → step: 'zip' (default)
  // 2. Auth return + sessionStorage → call /api/onboarding/complete → 'profile'
  // 3. Already auth'd, no sessionStorage → redirect to /dashboard
  useEffect(() => {
    if (session.isPending || mountHandled.current) return;
    mountHandled.current = true;

    if (!session.data?.user) {
      // Case 1b: not auth'd but sessionStorage has a proposal → restore from refresh
      const stored = loadOnboardingData();
      if (stored) {
        setProposal(stored.proposal);
        setAttributes(stored.attributes);
        setZip(stored.zip);
        setZone(stored.zone);
        setLat(stored.lat);
        setLng(stored.lng);
        setStep('proposal');
      }
      return; // Case 1: no auth, no storage → stay on zip
    }

    const stored = loadOnboardingData();
    if (stored) {
      // Case 2: returning from sign-up with stored onboarding data.
      // Show the confirmation beat — DB write fires concurrently.
      // The beat holds for 2s minimum; whichever arrives last (write or timer)
      // triggers the advance to 'profile'.
      setProposal(stored.proposal);
      setAttributes(stored.attributes);
      setZip(stored.zip);
      setZone(stored.zone);
      setLat(stored.lat);
      setLng(stored.lng);
      confirmWriteDoneRef.current = false;
      confirmBeatDoneRef.current = false;
      setStep('confirmation');
      completeOnboarding(stored);
    } else {
      // Case 3: auth'd but no onboarding data → already onboarded
      router.replace('/dashboard');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.isPending, session.data]);

  // ── Confirmation beat: hold 'confirmation' step for at least 2s ───────────
  useEffect(() => {
    if (step !== 'confirmation') return;
    confirmBeatDoneRef.current = false; // reset on each entry
    const timer = setTimeout(() => {
      confirmBeatDoneRef.current = true;
      if (confirmWriteDoneRef.current) setStep('profile');
    }, 2000);
    return () => clearTimeout(timer);
  }, [step]);

  // ── Complete onboarding: write to DB ───────────────────────────────────────
  const completeOnboarding = useCallback(
    async (data: {
      proposal: ProposalContent;
      attributes: InferredAttribute[];
      zip: string;
      zone: string;
      lat: string;
      lng: string;
    }) => {
      try {
        const res = await fetch('/api/onboarding/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to save');
        }
        clearOnboardingData();
        confirmWriteDoneRef.current = true;
        if (confirmBeatDoneRef.current) setStep('profile');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
        setStep('proposal');
      }
    },
    []
  );

  // ── Zip submit: fetch proposal ─────────────────────────────────────────────
  async function handleZipSubmit(submittedZip: string) {
    setZip(submittedZip);
    setError(null);
    // Reset gate state for this attempt
    pendingProposalRef.current = null;
    lastMessageReadyRef.current = false;
    setStep('loading');

    try {
      const res = await fetch('/api/onboarding/proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zip: submittedZip }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Something went wrong. Try again.');

      pendingProposalRef.current = {
        proposal: body.proposal as ProposalContent,
        attributes: body.attributes as InferredAttribute[],
        zip: submittedZip,
        zone: body.zone as string,
        lat: body.lat as string,
        lng: body.lng as string,
      };
      // Only advances if message 3 has already been shown for 1s
      tryAdvanceToProposal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
      setStep('zip');
    }
  }

  // ── Sign-up handler ────────────────────────────────────────────────────────
  async function handleSignUp(data: { name: string; email: string; password: string }) {
    setSignupError(null);
    let result: Awaited<ReturnType<typeof authClient.signUp.email>>;
    try {
      result = await authClient.signUp.email({
        name: data.name,
        email: data.email,
        password: data.password,
      });
    } catch (err) {
      // authClient throws on 4xx/5xx instead of returning { error } in some cases
      const msg = err instanceof Error ? err.message : null;
      const isExisting =
        msg?.toLowerCase().includes('already exists') ||
        msg?.toLowerCase().includes('already in use');
      setSignupError(
        isExisting
          ? 'An account with this email already exists. Sign in below.'
          : 'Sign up failed. Try again.'
      );
      return;
    }
    if (result.error) {
      const isExisting =
        result.error.message?.toLowerCase().includes('already exists') ||
        result.error.message?.toLowerCase().includes('already in use');
      setSignupError(
        isExisting
          ? 'An account with this email already exists. Sign in below.'
          : result.error.message || 'Sign up failed. Try again.'
      );
      return;
    }
    if (!proposal) {
      setSignupError('Something went wrong. Try again.');
      return;
    }
    // Sign-up successful — session is now active. Complete onboarding.
    // 'confirmation' is the handshake beat; write runs concurrently with the 2s timer.
    confirmWriteDoneRef.current = false;
    confirmBeatDoneRef.current = false;
    setStep('confirmation');
    completeOnboarding({ proposal, attributes, zip, zone, lat, lng });
  }

  // ── Pass handler ───────────────────────────────────────────────────────────
  async function handlePass(email?: string) {
    if (email) {
      // Fire-and-forget — save email to waitlist
      fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'pass', zip }),
      }).catch(() => {});
    }
    clearOnboardingData();
    router.push('/');
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  // Only blank the UI during the very first session check (before sessionReadyOnce).
  // After that, subsequent isPending flickers (tab refocus re-fetches) are ignored.
  if (session.isPending && !sessionReadyOnce.current) {
    return null; // Don't flash UI while checking auth state on initial load
  }
  sessionReadyOnce.current = true;

  switch (step) {
    case 'zip':
      return (
        <>
          <ZipScreen onSubmit={handleZipSubmit} />
          {error && (
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2">
              {/* Exception: error toast with red bg — intentional non-standard styling, raw <button> */}
              <button
                type="button"
                onClick={() => setError(null)}
                className="rounded-button bg-red-50 px-4 py-2 text-sm text-red-600"
                role="alert"
              >
                {error}
              </button>
            </div>
          )}
        </>
      );

    case 'loading':
      return (
        <LoadingScreen
          onLastMessageReady={() => {
            lastMessageReadyRef.current = true;
            // Only advances if the API has already resolved
            tryAdvanceToProposal();
          }}
        />
      );

    case 'proposal':
      return proposal ? (
        <ProposalScreen
          proposal={proposal}
          zone={zone}
          error={error}
          onApprove={() => {
            setError(null);
            if (session.data?.user) {
              // Already authenticated (e.g., returning from failed completion)
              confirmWriteDoneRef.current = false;
              confirmBeatDoneRef.current = false;
              setStep('confirmation');
              completeOnboarding({ proposal, attributes, zip, zone, lat, lng });
            } else {
              setStep('signup');
            }
          }}
          onPass={handlePass}
        />
      ) : null;

    case 'signup':
      return (
        <SignupScreen
          onSignUp={handleSignUp}
          onBack={() => setStep('proposal')}
          error={signupError}
        />
      );

    case 'confirmation':
      return (
        <div className="flex min-h-dvh items-center justify-center px-4 sm:px-6">
          <p className="text-text text-base">Your proposal is saved.</p>
        </div>
      );

    case 'profile':
      return <ProfileScreen attributes={attributes} attributeContext={proposal?.attribute_context ?? null} onContinue={() => router.push('/dashboard')} />;

    default:
      return null;
  }
}

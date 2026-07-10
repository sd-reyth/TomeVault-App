import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../locales');

const namespaces = {
  auth: {
    en: {
      errors: {
        googleLoginSlow: 'Google sign-in took longer than expected. Check whether you\'re signed in or try again.',
        popupClosedByUser: 'Google window was closed before sign-in finished.',
        popupBlocked: 'Your browser is blocking the Google popup. Allow popups and try again.',
        unauthorizedDomain: 'This domain is not yet authorized for Google sign-in in Firebase.',
        invalidCredential: 'Google sign-in is not configured correctly right now (redirect URI mismatch). Use email sign-in for now.',
      },
      transition: {
        retry: 'Try again',
        title: {
          timeout: 'Sign-in failed', boot: 'Loading TomeVault', signInGoogleSlow: 'Waiting for Google',
          signInGoogle: 'Connecting to Google', signInEmail: 'Signing in', signInGuest: 'Starting guest mode',
          signOut: 'Signing out', default: 'Please wait',
        },
        hint: {
          timeoutGoogle: 'Check whether the Google window is open, or try again.',
          timeoutSignOut: 'Sign-out took too long. Please try again.',
          timeoutBoot: 'The connection to the server is taking longer than usual.',
          timeoutDefault: 'Check your internet connection and try again.',
          slowGoogle: 'Complete sign-in in the Google window if it\'s still open.',
          slowSignOut: 'Your session is being closed safely…',
          slowBoot: 'Your data is being fetched from the cloud…',
          slowDefault: 'This is taking a little longer than expected…',
          signInGoogle: 'A Google window may open.',
          signOut: 'You\'ll be redirected to the start screen.',
        },
        timeoutError: {
          signInGoogle: 'Google sign-in took too long. Check the popup window or try again.',
          signInEmail: 'Email sign-in took too long. Please try again.',
          signInGuest: 'Starting guest mode took too long. Please try again.',
          signOut: 'Sign-out took too long. Please try again.',
          boot: 'Authentication took too long. Try again with Google or email.',
          default: 'The action took too long. Please try again.',
        },
      },
      qrJoin: {
        brand: 'TOMEVAULT', invitation: 'Invitation', sessionLabel: 'Session {{number}}',
        invitedDescription: 'You\'ve been invited to play along. Sign in to continue.',
        accountRequired: 'Account required',
        accountRequiredHint: 'Create an account or sign in to join via this invitation — no PIN needed.',
        google: 'Google', email: 'Email', characterName: 'Character name',
        characterNamePlaceholder: 'e.g. Aragorn', joinCampaign: 'Join {{campaignName}}', join: 'Join',
        signUpForm: 'Sign-up form', busy: '…',
        errors: { nameRequired: 'Enter your name.', signInRequired: 'Sign in first.' },
      },
    },
    nl: {
      errors: {
        googleLoginSlow: 'Google-login duurde langer dan verwacht. Controleer of je bent ingelogd of probeer opnieuw.',
        popupClosedByUser: 'Google-venster gesloten voordat inloggen was afgerond.',
        popupBlocked: 'Je browser blokkeert de Google-popup. Sta pop-ups toe en probeer opnieuw.',
        unauthorizedDomain: 'Dit domein is nog niet geautoriseerd voor Google-login in Firebase.',
        invalidCredential: 'Google-login is nu niet correct geconfigureerd (redirect URI mismatch). Gebruik tijdelijk e-mail om in te loggen.',
      },
      transition: {
        retry: 'Opnieuw proberen',
        title: {
          timeout: 'Inloggen lukt niet', boot: 'TomeVault laden', signInGoogleSlow: 'Wachten op Google',
          signInGoogle: 'Verbinden met Google', signInEmail: 'Bezig met inloggen', signInGuest: 'Gastmodus starten',
          signOut: 'Uitloggen', default: 'Even geduld',
        },
        hint: {
          timeoutGoogle: 'Controleer of het Google-venster open staat, of probeer het opnieuw.',
          timeoutSignOut: 'Uitloggen duurde te lang. Probeer het nog een keer.',
          timeoutBoot: 'De verbinding met de server duurt langer dan normaal.',
          timeoutDefault: 'Controleer je internetverbinding en probeer het opnieuw.',
          slowGoogle: 'Voltooi inloggen in het Google-venster als dat nog open staat.',
          slowSignOut: 'Je sessie wordt veilig afgesloten…',
          slowBoot: 'Je gegevens worden opgehaald uit de cloud…',
          slowDefault: 'Dit duurt iets langer dan verwacht…',
          signInGoogle: 'Een Google-venster kan openen.',
          signOut: 'Je wordt doorgestuurd naar het startscherm.',
        },
        timeoutError: {
          signInGoogle: 'Google-login duurde te lang. Controleer het popupvenster of probeer opnieuw.',
          signInEmail: 'Inloggen met e-mail duurde te lang. Probeer het opnieuw.',
          signInGuest: 'Gastmodus starten duurde te lang. Probeer het opnieuw.',
          signOut: 'Uitloggen duurde te lang. Probeer het opnieuw.',
          boot: 'Authenticatie duurde te lang. Probeer opnieuw met Google of e-mail.',
          default: 'De actie duurde te lang. Probeer het opnieuw.',
        },
      },
      qrJoin: {
        brand: 'TOMEVAULT', invitation: 'Uitnodiging', sessionLabel: 'Sessie {{number}}',
        invitedDescription: 'Je bent uitgenodigd om mee te spelen. Log in om verder te gaan.',
        accountRequired: 'Account vereist',
        accountRequiredHint: 'Maak een account aan of log in om via deze uitnodiging mee te doen — zonder PIN.',
        google: 'Google', email: 'E-mail', characterName: 'Karakternaam',
        characterNamePlaceholder: 'Bijv. Aragorn', joinCampaign: 'Deelnemen aan {{campaignName}}', join: 'Deelnemen',
        signUpForm: 'Aanmeldformulier', busy: '…',
        errors: { nameRequired: 'Voer je naam in.', signInRequired: 'Log eerst in.' },
      },
    },
  },
};

// Write what we have so far + load remaining from individual files if they exist
for (const [ns, locales] of Object.entries(namespaces)) {
  for (const [locale, data] of Object.entries(locales)) {
    const dir = path.join(root, locale);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${ns}.json`);
    const existing = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
    fs.writeFileSync(file, JSON.stringify(deepMerge(existing, data), null, 2) + '\n');
  }
}

function deepMerge(target, source) {
  const out = { ...target };
  for (const [k, v] of Object.entries(source)) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && target[k]
      ? deepMerge(target[k], v) : v;
  }
  return out;
}

console.log('Seeded partial locales.');

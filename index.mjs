/*
  Runtime app logic for TomeVault.
  Private replication walkthrough and jargon glossary are intentionally kept in
  local-only notes at .private/REPLICATION_NOTES.md (gitignored).
*/ 

// ---- 1) Firebase imports (CDN ESM) ----
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  getRedirectResult,
  signInWithRedirect,
  sendPasswordResetEmail,
  sendEmailVerification,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  linkWithPopup,
  linkWithRedirect,
  linkWithCredential,
  EmailAuthProvider,
  updateProfile,
  signOut,
  connectAuthEmulator,
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-storage.js";
import {
  initializeFirestore,
  enableIndexedDbPersistence,
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
  writeBatch,
  runTransaction,
  increment,
  connectFirestoreEmulator,
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// ---- 2) Developer mode ----
// Set USE_EMULATORS = true to connect to local Firebase Emulator Suite.
// When false, the app talks directly to the live Firebase project (works
// from both localhost and production).
//
// To run emulators:  firebase emulators:start
// Default ports: Auth = 9099, Firestore = 8080, Storage = 9199
const USE_EMULATORS = false;
const IS_LOCALHOST = location.hostname === "localhost" || location.hostname === "127.0.0.1";

// ================================================================
// ZONE: APP CONSTANTS
// Purpose: shared timing, limits, collection paths, and screen keys.
// ================================================================
const UI_TIMERS = {
  // Debounce delays
  ICON_SUGGEST_DEBOUNCE_MS: 300,
  DM_SEARCH_DEBOUNCE_MS: 250,
  CREATE_DRAFT_DEBOUNCE_MS: 500,
  INVENTORY_SEARCH_DEBOUNCE_MS: 300,
  // FAB timers
  FAB_HOLD_MS: 2000,
  FAB_DRAG_TOAST_MS: 1500,
  // Presence thresholds
  ONLINE_THRESHOLD_MS: 90_000,
  AWAY_THRESHOLD_MS: 300_000,
  // Session heartbeat
  HEARTBEAT_MS: 20_000,
  // Toast durations (ms)
  TOAST_SHORT:  3_000,
  TOAST_MED:    5_000,
  TOAST_LONG:   7_000,
  TOAST_NOTICE: 4_500,
  TOAST_BRIEF:  2_400,
  // UI feedback
  COPY_STATE_MS:   360,
  BUTTON_FLASH_MS: 1_800,
  MODAL_LEAVE_MS:  420,
  ROLL_ANIM_MS:    500,
};

// Validate limits — single source of truth for field min/max values
const LIMITS = {
  SESSION_NAME_MIN: 2,
  SESSION_NAME_MAX: 48,
  SESSION_SLUG_MAX: 32,
  PIN_MIN: 4,
  PIN_MAX: 8,
  PASSWORD_MIN: 12,
  PASSWORD_MAX: 128,
  NICKNAME_MIN: 2,
  NICKNAME_MAX: 30,
  IGN_MIN: 2,
  IGN_MAX: 30,
};

// Firestore collection path constants
const FIREBASE_PATHS = {
  SESSIONS: "sessions",
  PLAYERS: "players",
  HANDOUTS: "handouts",
  INVENTORY: "inventory",
  WALLETS: "wallets",
  USERS: "users",
  NUGGETS: "nuggets",
  NOTIFICATIONS: "notifications",
  TEMPLATES: "templates",
  TEMPLATE_ASSIGNMENTS: "templateAssignments",
};

const SCREEN_KEYS = {
  LANDING: "landing",
  DM_DASH: "dmDash",
  PLAYER_VIEW: "plView",
  PLAYER_INVENTORY: "plInventory",
  NOTES: "notes",
  PROFILE: "profile",
  SETTINGS: "settings",
  INFO: "info",
  SETTINGS_PROFILE: "settingsProfile",
  CHARACTER_TEMPLATES: "characterTemplates",
  PL_JOIN: "plJoin",
  DM_CREATE: "dmCreate",
};

// ---- 3) Your Firebase config ----
const firebaseConfig = {
    apiKey: "AIzaSyDWMlq-M1w5-_CFdlkQcggp6GW-EBJZP-o",
    authDomain: "tomevaultapp.firebaseapp.com",
    projectId: "tomevaultapp",
    storageBucket: "tomevaultapp.firebasestorage.app",
    messagingSenderId: "851346918917",
    appId: "1:851346918917:web:bf7cdfc122516a89cf166c",
    measurementId: "G-CV46E2D0RT"
};

// ---- 3b) Random Generator Catalog ----
// This is the data source for the "Random Handout" generator feature.
//
// HOW IT WORKS � Combinatoric Template System:
// Each handout type (loot, npc, clue, letter, quest, map) has word pools
// labeled a, b, p1, p2, p3, s1, s2. The generator picks one random word/phrase
// from each pool and combines them:
//
//   Title  = random(a) + " " + random(b)     e.g. "Moon Dagger"
//   Public = random(p1) + " " + random(p2) + " " + random(p3)
//            e.g. "A relic recovered from a sealed crypt that hums around danger."
//   Secret = random(s1) + " " + random(s2)
//            e.g. "It binds to the first rightful bearer."
//
// KEY:
//   a  = adjective / first-name part (title word 1)
//   b  = noun / last-name part      (title word 2)
//   p1 = public sentence opener
//   p2 = public middle clause
//   p3 = public sentence closer
//   s1 = secret sentence opener     (GM-only info)
//   s2 = secret sentence closer
//
// WHY THIS DESIGN: With 10�10�4�4�4�4�4 = 102,400 unique combinations per type
// (and 6 types), the GM gets massive variety from a compact data structure.
// Adding new entries to any pool instantly multiplies the total combinations.
const RANDOM_GENERATOR_CATALOG = {
    loot: {
      a: ["Moon", "Ash", "Dawn", "Iron", "Whispering", "Gilded", "Raven", "Starforged", "Runed", "Ember"],
      b: ["Dagger", "Compass", "Lantern", "Crown", "Chalice", "Amulet", "Ring", "Blade", "Idol", "Key"],
      c: ["of Hollowmere", "of Cinders", "of the North Road", "of Quiet Oaths", "of Broken Kings", "of Lost Tides"],
      p1: ["A relic recovered", "An heirloom discovered", "A treasure carried", "A field-ready artifact found"],
      p2: ["from a sealed crypt", "in a ruined chapel", "after a skirmish", "inside an abandoned vault"],
      p3: ["that hums around danger.", "that glows near hidden doors.", "with runes no scholar can place.", "that responds to spoken vows."],
      s1: ["It binds to", "It secretly marks", "It quietly attracts", "It occasionally reveals"],
      s2: ["the first rightful bearer.", "agents of a rival house.", "spirits from the old road.", "a forgotten map fragment."],
    },
    npc: {
      a: ["Captain", "Brother", "Seer", "Warden", "Envoy", "Scout", "Keeper", "Mira", "Seren", "Dorrik"],
      b: ["Vale", "Ashglow", "Kell", "Marrow", "Stone", "Thorne", "Rill", "Halven", "Bran", "Morr"],
      p1: ["A seasoned", "A cautious", "A persuasive", "A weary"],
      p2: ["traveler", "officer", "scholar", "guide"],
      p3: ["seeking allies before dawn.", "offering help for a price.", "watching every answer closely.", "with ties to local rumors."],
      s1: ["Secretly", "Quietly", "Privately", "Unknowingly"],
      s2: ["serves a hidden patron.", "carries a coded dispatch.", "knows the missing heir.", "is tied to the central mystery."],
    },
    clue: {
      a: ["Ashen", "Broken", "Midnight", "Silent", "Stolen", "Faded", "Hidden", "Crimson", "Lantern", "Glass"],
      b: ["Ledger", "Seal", "Riddle", "Manifest", "Token", "Record", "Page", "Cipher", "Sketch", "Directive"],
      p1: ["A fragment", "A suspicious note", "A marked record", "A recovered scrap"],
      p2: ["linking two events", "naming unfamiliar contacts", "showing unusual dates", "from an unknown messenger"],
      p3: ["that points toward the old district.", "with ink different from the rest.", "that narrows the suspect list.", "found near the latest scene."],
      s1: ["One symbol", "One date", "One margin note", "One crossed line"],
      s2: ["reveals the true courier.", "marks a hidden chamber.", "names an unexpected ally.", "indicates deliberate forgery."],
    },
    letter: {
      a: ["Final", "Northern", "Sealed", "Captain's", "Urgent", "Midwatch", "Royal", "Private", "Border", "Council"],
      b: ["Warning", "Petition", "Orders", "Dispatch", "Appeal", "Memorandum", "Letter", "Request", "Mandate", "Notice"],
      p1: ["A formal message", "A personal plea", "An official order", "A hurried correspondence"],
      p2: ["written under pressure", "bearing multiple signatures", "sealed with old wax", "delivered after curfew"],
      p3: ["requesting immediate action.", "warning of escalation.", "redirecting trusted agents.", "asking for discreet support."],
      s1: ["Hidden ink", "An acrostic", "A folded insert", "A mirrored signature"],
      s2: ["names the traitor.", "changes the destination.", "contradicts the official story.", "reveals the true author."],
    },
    quest: {
      a: ["Silent", "Fifth", "Thornbound", "Shattered", "Forgotten", "Blackroad", "Sunken", "Lantern", "Redfen", "Dunmere"],
      b: ["Bell", "Lantern", "Road", "Vow", "Signal", "Sanctum", "Crossing", "Accord", "Hunt", "Trial"],
      p1: ["A mission", "A contract", "A desperate request", "A sanctioned operation"],
      p2: ["with narrow timing", "under political pressure", "through hostile territory", "with uncertain allies"],
      p3: ["to recover a key relic.", "to escort a dangerous witness.", "to secure a contested location.", "to stop a ritual in progress."],
      s1: ["Success", "Failure", "Interference", "Delay"],
      s2: ["awakens an old guardian.", "triggers a wider conflict.", "exposes a hidden pact.", "changes faction alignment."],
    },
    map: {
      a: ["Hollowmere", "Blackroot", "Sunken", "Red Fen", "Stoneward", "Ash Valley", "Old Coast", "North March", "Mournridge", "Whisperwood"],
      b: ["Route", "Survey", "Chart", "Overlay", "Guide", "Path", "Atlas", "Draft", "Track", "Plan"],
      p1: ["A weathered map", "A field chart", "A layered survey", "A marked route sheet"],
      p2: ["annotated by prior explorers", "copied from forbidden archives", "updated after recent patrols", "with hazard notes in red"],
      p3: ["showing shortcuts and choke points.", "highlighting disputed landmarks.", "detailing alternate routes.", "with warnings near old ruins."],
      s1: ["A hidden path", "A false marker", "A coded legend", "A redacted segment"],
      s2: ["appears under heat.", "misleads untrusted readers.", "points to a buried vault.", "reveals a protected entrance."],
    },
  };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
let googleAuthInFlight = false;

// Auth providers - Google is live, others are placeholders for future activation.
const googleProvider = new GoogleAuthProvider();
// Placeholders (not called until Firebase Console enables them):
// const appleProvider  = new OAuthProvider('apple.com');
// const fbProvider     = new OAuthProvider('facebook.com');
// const msProvider     = new OAuthProvider('microsoft.com');

const db = initializeFirestore(app, {});
enableIndexedDbPersistence(db).catch((err) => {
  console.warn("[TomeVault] Offline persistence error:", err.code);
});
const storage = getStorage(app);

// ---- Emulator wiring (dev only) ----
if (USE_EMULATORS) {
  try {
    connectAuthEmulator(auth, "http://127.0.0.1:9099");
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    console.info("%c[DEV] Firebase Emulators connected (Auth:9099, Firestore:8080)", "color:#00e676;font-weight:bold");
  } catch (e) {
    console.warn("Could not connect to emulators - are they running?", e);
  }
} else if (IS_LOCALHOST) {
  console.info(
    "%c[DEV] Tip: set USE_EMULATORS = true at the top of index.mjs to use local emulators instead.",
    "color:#ffd740;font-weight:bold"
  );
}

// ---- WakeLock API ----
let sessionWakeLock = null;
async function requestWakeLock() {
  if (!("wakeLock" in navigator)) return;
  try {
    sessionWakeLock = await navigator.wakeLock.request("screen");
  } catch (err) {
    console.warn("Wake Lock failed:", err);
  }
}

function releaseWakeLock() {
  if (!sessionWakeLock) return;
  sessionWakeLock.release().catch(() => {});
  sessionWakeLock = null;
}

// Re-request on visibility change
document.addEventListener("visibilitychange", () => {
  if (sessionWakeLock !== null && document.visibilityState === "visible") {
    requestWakeLock();
  }
});

// ---- 4) DOM helpers ----
// Tiny helper to reduce repetition:
// Instead of writing document.getElementById("someId") every time,
// we can write $("someId") and keep the code cleaner.
const $ = (id) => document.getElementById(id);

// `screens` maps logical screen names to actual section elements.
// `showOnly()` uses this map to swap visible screens like app routes.
const screens = {
  landing: $("screenLanding"),
  dmCreate: $("screenDMCreate"),
  dmDash: $("screenDMDash"),
  plJoin: $("screenPlayerJoin"),
  plView: $("screenPlayerView"),
  plInventory: $("screenPlayerInventory"),
  notes: $("screenNotes"),
  settings: $("screenSettings"),
  info: $("screenInfo"),
  settingsProfile: $("screenSettingsProfile"),
  characterTemplates: $("screenCharacterTemplates"),
  profile: $("screenProfile"),
};

// ---- Top-level app chrome (always visible once in a session) ----
const topBar = $("topBar");
const bottomBar = $("bottomBar");
const btnBrandHome = $("btnBrandHome");
const btnHamburger = $("btnHamburger");
const hamburgerSpeedDial = $("hamburgerSpeedDial");
const btnDialSettings = $("btnDialSettings");
const btnTopBarSocial = $("btnTopBarSocial");
const btnShareInviteSocial = $("btnShareInviteSocial");
const nicknameModal = $("nicknameModal");
const nicknameInput = $("nicknameInput");
const btnNicknameConfirm = $("btnNicknameConfirm");
const spellModal = $("spellModal");
const spellNameInput = $("spellNameInput");
const spellSchoolInput = $("spellSchoolInput");
const spellLevelInput = $("spellLevelInput");
const spellDescInput = $("spellDescInput");
const btnSpellCancel = $("btnSpellCancel");
const btnSpellSave = $("btnSpellSave");
const btnMessagePlayer = $("btnMessagePlayer");
const pcMessageWrap = $("pcMessageWrap");
const pcMessageInput = $("pcMessageInput");
const btnSendPlayerMessage = $("btnSendPlayerMessage");
const btnKickPlayer = $("btnKickPlayer");
const settingsDrawer = $("settingsDrawer");
const settingsDrawerBackdrop = $("settingsDrawerBackdrop");
const btnOpenProfile = $("btnOpenProfile");
const bottomBarAvatarImg = $("bottomBarAvatarImg");
const gmFab = $("gmFab");

// ---- Nugget counter + session status indicators ----
const nuggetCounter = $("nuggetCounter");
const nuggetBalanceEl = $("nuggetBalance");
const liveStatus = $("liveStatus");
const liveStatusPanel = $("liveStatusPanel");
const liveStatusTag = $("liveStatusTag");
const liveStatusId = $("liveStatusId");
const btnToggleLiveAdvanced = $("btnToggleLiveAdvanced");
const liveAdvancedDetails = $("liveAdvancedDetails");
const btnCopyLiveStatus = $("btnCopyLiveStatus");


const playerListDropdown = $("playerListDropdown");
const playerListContent = $("playerListContent");
const playerListEmpty = $("playerListEmpty");

// ---- Landing screen ----
// The first screen users see. Choose GM or Player role, or log in.
const btnGoDM = $("btnGoDM");
const btnGoPlayer = $("btnGoPlayer");
const landingSessionList = $("landingSessionList");
const landingSessionEmpty = $("landingSessionEmpty");
const landingSessionCount = $("landingSessionCount");

// ---- Auth card (sign-in / sign-up / guest) ----
// Shown on the landing screen. Handles email + Google login,
// account creation, and anonymous "guest" one-shot mode.
const authCard = $("authCard");
const authGuestCta = $("authGuestCta");
const landingHome = $("landingHome");
const landingDisplayName = $("landingDisplayName");
// Screen-level containers
const authMethodScreen = $("authMethodScreen");
const authEmailScreen = $("authEmailScreen");
// Mode selector (Screen 1)
const authModeSignIn = $("authModeSignIn");
const authModeSignUp = $("authModeSignUp");
const authBtnEmail = $("authBtnEmail");
const authMethodErr = $("authMethodErr");
// Tab bar (Screen 2)
const authTabSignIn = $("authTabSignIn");
const authTabSignUp = $("authTabSignUp");
const btnAuthBack = $("btnAuthBack");
const authSignIn = $("authSignIn");
const authSignUp = $("authSignUp");
const formSignIn = $("formSignIn");
const formSignUp = $("formSignUp");
const signInEmail = $("signInEmail");
const signInPassword = $("signInPassword");
const signInEmailErr = $("signInEmailErr");
const signInPasswordErr = $("signInPasswordErr");
const signInFormErr = $("signInFormErr");
const btnSignIn = $("btnSignIn");
const btnForgotPassword = $("btnForgotPassword");
const btnGoogleContinue = $("btnGoogleContinue");
const signUpIGN = $("signUpIGN");
const signUpEmail = $("signUpEmail");
const signUpPassword = $("signUpPassword");
const signUpConfirm = $("signUpConfirm");
const signUpIGNErr = $("signUpIGNErr");
const signUpEmailErr = $("signUpEmailErr");
const signUpPasswordErr = $("signUpPasswordErr");
const signUpConfirmErr = $("signUpConfirmErr");
const signUpFormErr = $("signUpFormErr");
const btnSignUp = $("btnSignUp");
const btnSignOut = $("btnSignOut");
const btnGuestOneShotCreate = $("btnGuestOneShotCreate");
const btnGuestOneShotJoin = $("btnGuestOneShotJoin");
const oneShotBanner = $("oneShotBanner");
const oneShotTimeLeft = $("oneShotTimeLeft");
const btnOneShotUpgrade = $("btnOneShotUpgrade");

// ---- GM: session creation form ----
// Screen where the Game Master names the session, sets a PIN,
// and clicks "Create" to generate a new Firestore session document.
const dmCreateHeading = $("dmCreateHeading");
const dmCreateGuestNotice = $("dmCreateGuestNotice");
const dmSessionName = $("dmSessionName");
const dmPin = $("dmPin");
const btnCreateSession = $("btnCreateSession");
const btnDMBack = $("btnDMBack");
const dmCreateMsg = $("dmCreateMsg");
const btnCreateClaimable = $("btnCreateClaimable");

// ---- GM: main dashboard ----
// Live session management: QR invite, handout list, ambience, social panel.
const dmDashTitle = $("dmDashTitle");
const dmSessionIdText = $("dmSessionIdText");
const dmPinShown = $("dmPinShown");
const btnChangePin = $("btnChangePin");
const dmTransferPinShown = $("dmTransferPinShown");
const btnChangeTransferPin = $("btnChangeTransferPin");
const qrBox = $("qrBox");
const btnCopyJoinLinkSocial = $("btnCopyJoinLinkSocial");
const btnCopyJoinLinkModal = $("btnCopyJoinLinkModal");
const btnCopyPin = $("btnCopyPin");
const btnEndSession = $("btnEndSession");

// ---- GM: ambience (background music) controls ----
// The GM selects a track and volume; changes are synced to Firestore,
// which triggers all connected players' <audio> to update in realtime.
const dmAmbience = $("dmAmbience");
const dmVolume = $("dmVolume");
const btnDMPlay = $("btnDMPlay");
const btnDMPause = $("btnDMPause");
const btnOpenAmbienceBar = $("btnOpenAmbienceBar");
const btnCloseAmbienceBar = $("btnCloseAmbienceBar");
const btnAmbienceInfo = $("btnAmbienceInfo");
const btnOpenAtmospherePanel = $("btnOpenAtmospherePanel");
const ambienceBar = $("ambienceBar");
const dmAtmosphereTrack = $("dmAtmosphereTrack");
const dmAtmosphereStatus = $("dmAtmosphereStatus");
const dmAtmosphereVolume = $("dmAtmosphereVolume");
const creditsModal = $("creditsModal");
const btnCloseCredits = $("btnCloseCredits");
const externalLinkModal = $("externalLinkModal");
const externalLinkHost = $("externalLinkHost");
const btnExternalLinkConfirm = $("btnExternalLinkConfirm");
const btnExternalLinkCancel = $("btnExternalLinkCancel");
const btnToggleSocial = $("btnToggleSocial");
const btnCloseSocial = $("btnCloseSocial");
const btnOpenCreateHandout = $("btnOpenCreateHandout") || $("btnCreateHandoutInline") || $("gmFab");
const btnOpenHandouts = $("btnOpenHandouts");
const btnOpenInventory = $("btnOpenInventory");
const btnOpenNotes = $("btnOpenNotes");
const btnOpenSettings = $("btnOpenSettings") || $("btnDialSettings") || $("btnHamburger");
const dmSocialPanel = $("dmSocialPanel");
const dmHandoutsPanel = $("dmHandoutsPanel");
const dmPartyPanel = $("dmPartyPanel");
const btnCollapseParty = $("btnCollapseParty");
const playerPartyPanel = $("playerPartyPanel");
const btnCollapsePlayerParty = $("btnCollapsePlayerParty");

// ---- GM: handout authoring form + list ----
// Handouts are the core content unit (loot, NPC, clue, quest, etc.).
// The GM fills out fields and clicks Add; the card appears for players in realtime.
const dmType = $("dmType");
const dmTitle = $("dmTitle");
const dmPublic = $("dmPublic");
const dmSecret = $("dmSecret");
const btnCreateRevealToggle = $("btnCreateRevealToggle");
const createRevealEyeOpen = $("createRevealEyeOpen");
const createRevealEyeClosed = $("createRevealEyeClosed");
const dmIconGrid = $("dmIconGrid");
const iconSuggestRow = $("iconSuggestRow");
const iconSuggestTiles = $("iconSuggestTiles");
const emojiPreview = $("emojiPreview");
const emojiInput = $("emojiInput");
const dmColorRow = $("dmColorRow");
const dmImagePreview = $("dmImagePreview");
const portraitPlaceholder = $("portraitPlaceholder");
const dmImageStatus = $("dmImageStatus");
const btnImagePrev = $("btnImagePrev");
const btnImageNext = $("btnImageNext");
const btnImageRandom = $("btnImageRandom");
const btnImageSelect = $("btnImageSelect");
const btnImageUpload = $("btnImageUpload");
const imagePickerPanel = $("imagePickerPanel");
const imagePickerList = $("imagePickerList");
const createMapUploadWrap = $("createMapUploadWrap");
const createMapDisplayFrame = $("createMapDisplayFrame");
const createMapPreviewImg = $("createMapPreviewImg");
const createMapEmptyState = $("createMapEmptyState");
const createMapLoadingOverlay = $("createMapLoadingOverlay");
const btnCreateMapAIGenerate = $("btnCreateMapAIGenerate");
const handoutImageUpload = $("handoutImageUpload");
const btnHandoutUploadImage = $("btnHandoutUploadImage");
const handoutImageStatus = $("handoutImageStatus");
const btnRandomHandout = $("btnRandomHandout");
const npcDispositionWrap = $("npcDispositionWrap");
const npcDispositionRow = $("npcDispositionRow");
const btnAddHandout = $("btnAddHandout");
const dmHandoutList = $("dmHandoutList");
const dmHandoutEmpty = $("dmHandoutEmpty");
const dmSearch = $("dmSearch");
const dmFilterRow = $("dmFilterRow");
const btnToggleFilters = $("btnToggleFilters");
const filterActiveBadge = $("filterActiveBadge");
const btnOpenCreateModal = $("btnOpenCreateModal") || $("btnCreateHandoutInline") || $("gmFab");
const btnCloseCreateModal = $("btnCloseCreateModal");
const createHandoutModal = $("createHandoutModal");

// ---- GM: connected players sidebar ----


const dmSplit = $("dmSplit");
const dmPartyInlineList = $("dmPartyInlineList");
const dmPartyInlineEmpty = $("dmPartyInlineEmpty");
const btnRollInitiative = $("btnRollInitiative");
const btnResetInitiative = $("btnResetInitiative");
const btnPartyBattle = $("btnPartyBattle");
const btnAddNpc = $("btnAddNpc");
const dmPartyRollOverlay = $("dmPartyRollOverlay");
const btnOpenSocialFromParty = $("btnOpenSocialFromParty");
const dmTurnNav = $("dmTurnNav");
const dmTurnLabel = $("dmTurnLabel");
const btnTurnPrev = $("btnTurnPrev");
const btnTurnNext = $("btnTurnNext");

// ---- Player: join screen ----
// Where a player enters Session ID + PIN (or scans QR) to join a game.
const plJoinGuestNotice = $("plJoinGuestNotice");
const plJoinSignedNotice = $("plJoinSignedNotice");
const plSessionId = $("plSessionId");
const plNick = $("plNick");
const plPin = $("plPin");
const btnJoin = $("btnJoin");
const btnPlayerBack = $("btnPlayerBack");
const plJoinMsg = $("plJoinMsg");
const plRecentWrap = $("plRecentWrap");
const plRecentList = $("plRecentList");
const plRecentMeta = $("plRecentMeta");

// ---- Player: QR camera scanner ----
// Uses Html5Qrcode library to open the device camera and decode a QR invite.
const btnScanInApp = $("btnScanInApp");
const qrReaderWrap = $("qrReaderWrap");
const btnStopScan = $("btnStopScan");

// ---- Player: main handout view ----
// Displays the live list of handouts the GM has shared with the session.
const plTitle = $("plTitle");
const btnLeave = $("btnLeave");
const btnEnableSound = $("btnEnableSound");
const plHandoutList = $("plHandoutList");
const plHandoutEmpty = $("plHandoutEmpty");
const playerPartyInlineList = $("playerPartyInlineList");
const playerPartyInlineEmpty = $("playerPartyInlineEmpty");
const btnPlayerInitiativeEdit = $("btnPlayerInitiativeEdit");
const btnPlayerInitiativeRoll = $("btnPlayerInitiativeRoll");
const playerSessionRef = $("playerSessionRef");
const plSessionBadge = $("plSessionBadge");
const plSessionBadgeText = $("plSessionBadgeText");
const plSessionDetails = $("plSessionDetails");
const plSessionTag = $("plSessionTag");
const plSessionIdText = $("plSessionIdText");
const btnTogglePlayerAdvanced = $("btnTogglePlayerAdvanced");
const playerAdvancedDetails = $("playerAdvancedDetails");
const btnCopyPlayerSession = $("btnCopyPlayerSession");
const btnInventoryBack = $("btnInventoryBack");

// ---- Inventory & wallet screen ----
// Per-player item lists + coin pouches. GM also sees the Party Treasury.
const inventoryPlayersContainer = $("inventoryPlayersContainer");
const inventoryEmptyMsg = $("inventoryEmptyMsg");
const partyTreasuryCoins = $("partyTreasuryCoins");
const partyTreasurySection = $("partyTreasurySection");
const createInventoryModal = $("createInventoryModal");
const btnCloseInventoryModal = $("btnCloseInventoryModal");
const inventoryModalTitle = $("inventoryModalTitle");
const inventoryItemAvatarPreview = $("inventoryItemAvatarPreview");
const inventoryItemAvatarPlaceholder = $("inventoryItemAvatarPlaceholder");
const btnInvAvatarPrev = $("btnInvAvatarPrev");
const btnInvAvatarNext = $("btnInvAvatarNext");
const btnInvAvatarRandom = $("btnInvAvatarRandom");
const btnInvAvatarGallery = $("btnInvAvatarGallery");
const invGalleryPanel = $("invGalleryPanel");
const invGalleryGrid = $("invGalleryGrid");
const inventoryItemName = $("inventoryItemName");
const inventoryItemDesc = $("inventoryItemDesc");
const inventoryItemAmount = $("inventoryItemAmount");
const inventoryItemId = $("inventoryItemId");
const inventoryItemOwner = $("inventoryItemOwner");
const inventoryImageUpload = $("inventoryImageUpload");
const btnInvUploadImage = $("btnInvUploadImage");
const inventoryImageStatus = $("inventoryImageStatus");
const btnSaveInventoryItem = $("btnSaveInventoryItem");

// ---- Settings & player profile ----
// Theme switcher, role switching (player?GM), profile editing,
// character sheet OCR scanner, and character stat fields.
const btnSettingsBack = $("btnSettingsBack");
const settingsSessionInfo = $("settingsSessionInfo");
const settingsRoleSection = $("settingsRoleSection");
const settingsIdentityHint = $("settingsIdentityHint");
const btnSwitchToPlayer = $("btnSwitchToPlayer");
const btnSwitchToDM = $("btnSwitchToDM");
const dmPinPrompt = $("dmPinPrompt");
const switchDMPinInput = $("switchDMPinInput");
const btnConfirmSwitchDM = $("btnConfirmSwitchDM");
const btnCancelSwitchDM = $("btnCancelSwitchDM");
const btnLeaveSession = $("btnLeaveSession");
const btnDeleteSession = $("btnDeleteSession");
const btnDiscardSession = $("btnDiscardSession");
const deleteSessionModal = $("deleteSessionModal");
const deleteSessionConfirmInput = $("deleteSessionConfirmInput");
const btnConfirmDeleteSession = $("btnConfirmDeleteSession");
const btnCancelDeleteSession = $("btnCancelDeleteSession");
const discardSessionModal = $("discardSessionModal");
const discardSessionConfirmInput = $("discardSessionConfirmInput");
const btnConfirmDiscardSession = $("btnConfirmDiscardSession");
const btnCancelDiscardSession = $("btnCancelDiscardSession");
const sessionDeletedModal = $("sessionDeletedModal");
const btnSessionDeletedOk = $("btnSessionDeletedOk");
const settingsSoundSection = $("settingsSoundSection");
const btnOpenProfileSettings = $("btnOpenProfileSettings");
const btnReplayTutorial = $("btnReplayTutorial");
const btnThemeSystem = $("btnThemeSystem");
const btnThemeDark = $("btnThemeDark");
const btnThemeLight = $("btnThemeLight");
const btnProfileBack = $("btnProfileBack");
const profileContextMsg = $("profileContextMsg");
const profileAvatarPreview = $("profileAvatarPreview");
const profileAvatarPlaceholder = $("profileAvatarPlaceholder");
const profileAvatarFile = $("profileAvatarFile");
const profileAvatarStatus = $("profileAvatarStatus");
const profileDisplayName = $("profileDisplayName");

// ---- Session notes ----
const notesEditor = $("notesEditor");
const notesStatus = $("notesStatus");
const btnNotesUndo = $("btnNotesUndo");
const btnNotesBack = $("btnNotesBack");
const profileBio = $("profileBio");
const profileStatLevel = $("profileStatLevel");
const profileStatArmorRating = $("profileStatArmorRating");
const profileStatHitPoints = $("profileStatHitPoints");
const profileStatInitiative = $("profileStatInitiative");
const profileStatStrength = $("profileStatStrength");
const profileStatDexterity = $("profileStatDexterity");
const profileStatConstitution = $("profileStatConstitution");
const profileStatIntelligence = $("profileStatIntelligence");
const profileStatWisdom = $("profileStatWisdom");
const profileStatCharisma = $("profileStatCharisma");
const btnScanCharacterSheet = $("btnScanCharacterSheet");
const characterSheetPhoto = $("characterSheetPhoto");
const characterSheetCameraPanel = $("characterSheetCameraPanel");
const characterSheetVideo = $("characterSheetVideo");
const btnCaptureCharacterSheet = $("btnCaptureCharacterSheet");
const btnCloseCharacterSheetCamera = $("btnCloseCharacterSheetCamera");
const profileScanStatus = $("profileScanStatus");
const btnSaveProfile = $("btnSaveProfile");
const profileSaveMsg = $("profileSaveMsg");

// ---- Shared detail modal ----
// Full-screen modal used to view/edit a single handout.
// GM gets edit fields + save/delete; players get read-only + claim button.
const modal = $("modal");
const modalClose = $("modalClose");
const modalTag = $("modalTag");
const modalTitle = $("modalTitle");
const modalImage = $("modalImage");
const modalImageWrap = $("modalImageWrap");
const modalPublic = $("modalPublic");
const modalSecretWrap = $("modalSecretWrap");
const modalSecret = $("modalSecret");
const modalIconWrap = $("modalIconWrap");
const modalIconPreview = $("modalIconPreview");
const modalIconInput = $("modalIconInput");
const modalDMControls = $("modalDMControls");
const btnToggleReveal = $("btnToggleReveal");
const btnToggleRevealSecret = $("btnToggleRevealSecret");
const btnSaveHandout = $("btnSaveHandout");
const btnEditHandout = $("btnEditHandout");
const modalMapUploadWrap = $("modalMapUploadWrap");
const modalMapDisplayFrame = $("modalMapDisplayFrame");
const modalMapPreviewImg = $("modalMapPreviewImg");
const modalMapEmptyState = $("modalMapEmptyState");
const modalMapLoadingOverlay = $("modalMapLoadingOverlay");
const btnModalMapAIGenerate = $("btnModalMapAIGenerate");
const modalMapImageUpload = $("modalMapImageUpload");
const modalHandoutImageUpload = $("modalHandoutImageUpload");
const btnModalMapUpload = $("btnModalMapUpload");
const modalMapUploadStatus = $("modalMapUploadStatus");
const btnAddHandoutToInitiativeModal = $("btnAddHandoutToInitiativeModal");
const btnDeleteHandout = $("btnDeleteHandout");
const modalClaimWrap = $("modalClaimWrap");
const claimStatus = $("claimStatus");
const btnClaim = $("btnClaim");
const btnPlayerClaim = $("btnPlayerClaim");
const modalDMClaimControls = $("modalDMClaimControls");
const btnToggleClaimable = $("btnToggleClaimable");
const btnResetClaim = $("btnResetClaim");
const dmAssignPlayer = $("dmAssignPlayer");
const btnAssignClaim = $("btnAssignClaim");
const modalSaveState = $("modalSaveState");
const modalCard = modal?.querySelector(".modal__card") || null;
const toastStack = $("toastStack");

// ---- Map AI generate modal ----
const mapGenerateModal = $("mapGenerateModal");
const mapGenDescription = $("mapGenDescription");
const mapGenStyle = $("mapGenStyle");
const mapGenStatus = $("mapGenStatus");
const mapGenPreviewWrap = $("mapGenPreviewWrap");
const mapGenPreviewImg = $("mapGenPreviewImg");
const mapGenLoadingOverlay = $("mapGenLoadingOverlay");
const btnCloseMapGenerate = $("btnCloseMapGenerate");
const btnMapGenGenerate = $("btnMapGenGenerate");
const btnMapGenUse = $("btnMapGenUse");
const btnMapGenCancel = $("btnMapGenCancel");
// ---- Create modal appearance accordion ----
const btnCreateAppearanceToggle = $("btnCreateAppearanceToggle");
const createAppearanceBody = $("createAppearanceBody");
// ---- Profile ability scores accordion ----
const btnProfileAbilityToggle = $("btnProfileAbilityToggle");
const profileAbilityScoresBody = $("profileAbilityScoresBody");

// -- Notification bell + panel --
const btnNotifBell = $("btnNotifBell");
const notifBadge = $("notifBadge");
const notifPanel = $("notifPanel");
const notifList = $("notifList");
const notifEmpty = $("notifEmpty");
const btnNotifMarkAll = $("btnNotifMarkAll");

// -- GM transfer modal + character profile offer modal --
const transferModal = $("transferModal");
const transferModalMsg = $("transferModalMsg");
const transferPinInput = $("transferPinInput");
const btnAcceptTransfer = $("btnAcceptTransfer");
const btnDeclineTransfer = $("btnDeclineTransfer");
const profileOfferModal = $("profileOfferModal");
const profileOfferMsg = $("profileOfferMsg");
const profileOfferPreview = $("profileOfferPreview");
const btnAcceptProfile = $("btnAcceptProfile");
const btnRejectProfile = $("btnRejectProfile");

// -- Settings menu extra buttons --
const btnCharacterProfiles = $("btnCharacterProfiles");
const btnTransferGMRole = $("btnTransferGMRole");
const btnShowShortcuts = $("btnShowShortcuts");
const btnShowCredits = $("btnShowCredits");
const shortcutOverlay = $("shortcutOverlay");
const btnCloseShortcuts = $("btnCloseShortcuts");

// -- Character templates screen --
const templateList = $("templateList");
const templateEmpty = $("templateEmpty");
const btnCreateTemplate = $("btnCreateTemplate");
const btnBackFromTemplates = $("btnBackFromTemplates");
const createTemplateModal = $("createTemplateModal");
const btnCloseTemplateModal = $("btnCloseTemplateModal");
const templateModalTitle = $("templateModalTitle");
const templateName = $("templateName");
const templateBio = $("templateBio");
const templateImage = $("templateImage");
const templateImagePreview = $("templateImagePreview");
const btnPickTemplateImage = $("btnPickTemplateImage");
const templateImageStatus = $("templateImageStatus");
const btnSaveTemplate = $("btnSaveTemplate");
const btnCancelTemplate = $("btnCancelTemplate");
const playerPickerModal = $("playerPickerModal");
const playerPickerTitle = $("playerPickerTitle");
const playerPickerList = $("playerPickerList");
const playerPickerPinWrap = $("playerPickerPinWrap");
const playerPickerPin = $("playerPickerPin");
const btnPlayerPickerCancel = $("btnPlayerPickerCancel");
const btnPlayerPickerConfirm = $("btnPlayerPickerConfirm");

// -- Inventory search --
const inventorySearch = $("inventorySearch");

// BEGINNER NOTE � Temporary draft state:
// `createClaimableDraft` holds the toggle value for "Claimable" in the create
// handout form. It lives in JS memory (not Firestore) until the GM clicks Add.
// Once saved, it becomes the `claimable` field on the Firestore document.
let createClaimableDraft = false;
let createRevealDraft = false;
const PROFILE_STAT_KEYS = [
  "level",
  "armorRating",
  "hitPoints",
  "initiative",
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
];
const profileInputByKey = {
  level: profileStatLevel,
  armorRating: profileStatArmorRating,
  hitPoints: profileStatHitPoints,
  initiative: profileStatInitiative,
  strength: profileStatStrength,
  dexterity: profileStatDexterity,
  constitution: profileStatConstitution,
  intelligence: profileStatIntelligence,
  wisdom: profileStatWisdom,
  charisma: profileStatCharisma,
};
// BEGINNER NOTE � profileCache:
// A Map() works like an object but with better performance for frequent
// add/delete. We cache fetched player profiles so repeated renders
// don't re-fetch from Firestore every time.
const profileCache = new Map();

// Navigation breadcrumb variables:
// Because this SPA has nested "screens" (e.g., Settings ? Profile),
// we track which screen to return to when the user clicks "Back".
let currentScreenKey = "landing";
let settingsReturnScreenKey = "landing";
let settingsProfileReturnScreenKey = "settings";
let pendingHandoutImageUrl = null; // custom uploaded image URL for create handout modal
let createImageScale = 1.14;
let createImageOffsetX = 0;
let createImageOffsetY = 0;
let createImageDragState = null;
let pickerSelectionUid = "";
let pickerResolver = null;

// Profile editor state � tracked outside `state` because it's
// transient UI state, not session-level data.
let profileEditingUid = null;
let profileEditingRole = "player";
let profileEditorData = null;
let ocrInProgress = false;
let characterSheetStream = null;

// Sound preference persisted across browser sessions.
let soundEnabled = localStorage.getItem("tv_soundEnabled") === "1";
var _lastAmbienceState = null; // non-TDZ cache used by audio resume paths

/** Simple trailing-edge debounce used for search inputs. */
function debounce(fn, ms) {
  let id;
  return (...args) => { clearTimeout(id); id = setTimeout(() => fn(...args), ms); };
}

// One-shot sessions expire after 24 hours. These constants control
// the "recent one-shot" quick-rejoin list stored in localStorage.
const ONE_SHOT_TTL_MS = 24 * 60 * 60 * 1000;
const RECENT_ONE_SHOT_KEY = "tv_recentOneShotJoins";
const RECENT_ONE_SHOT_MAX = 8;
const JOINED_SESSION_LIST_KEY = "tv_joinedSessions";
const JOINED_SESSION_LIST_MAX = 40;

// Theme system: "system" follows OS preference, "dark"/"light" are manual.
// matchMedia detects the user's OS color scheme preference.
const THEME_PREF_KEY = "tv_theme_pref";
const THEME_PREF_VALUES = new Set(["system", "dark", "light"]);
const themeMediaQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;
let themeMediaListenerAttached = false;

// ---- 5) State ----
// Central in-memory app state.
// Think of this object as "the truth right now" for session context.
//
// BEGINNER NOTE � Why one big state object?
// Centralizing state makes debugging easier: you can inspect `state` in
// the browser console to see everything at once. It also prevents scattered
// global variables from colliding. The unsubscriber functions (unsub*) are
// stored here so we can clean them up when leaving a session � if you
// forget to unsubscribe, Firestore keeps sending data and wastes bandwidth.
const state = {
  uid: null,
  role: null, // "dm" | "player"
  dmUid: null,
  sessionId: null,
  joinTag: null,
  joinLink: null,
  dmPinPlain: null,
  scan: null,
  activePlayers: [], // track active players for GM display
  partyRoster: [],
  battleActive: false,
  currentTurnUid: null, // UID of the combatant whose turn is active
  turnRound: 1,         // current combat round
  dmFilter: "all",
  dmSearchQuery: "",
  dmHandoutsRaw: [],
  playerInventoryRaw: [],
  playerNick: "",
  sessionName: "",
  inventoryItems: [],
  wallets: {},   // { uid: {platinum,gold,silver,bronze}, party: {...} }
  trialDaysLeft: null, // number of days left in free trial (null = unchecked)
  // Auth state
  isGuest: true,
  isSignedIn: false,
  displayName: null,
  email: null,

  // unsubscribers
  unsubSession: null,
  unsubHandouts: null,
  unsubPlayers: null,
  unsubInventory: null,
  unsubWallets: null,
  unsubNotifications: null,
  unsubTransfer: null,
  unsubNuggets: null,
  unsubTemplateAssignments: null,
};

// ---- 6) Utilities ----
// Utility functions are small reusable helpers used by multiple features.
// BEGINNER NOTE � Why extract these into functions?
// Each utility does ONE thing. This makes them testable in isolation and
// keeps the main feature code readable. If you see a pattern repeated
// 3+ times, it's a good candidate for a utility function.

// --- Theme utilities ---
// The theme system has three layers:
// 1. normalizeThemePreference: sanitize any string ? valid preference
// 2. resolveThemeMode: preference ? actual "dark" or "light"
// 3. applyThemePreference: writes to DOM + syncs button UI
function normalizeThemePreference(value) {
  const pref = String(value || "").trim().toLowerCase();
  return THEME_PREF_VALUES.has(pref) ? pref : "system";
}

function getThemePreference() {
  return normalizeThemePreference(localStorage.getItem(THEME_PREF_KEY));
}

function resolveThemeMode(pref) {
  if (pref === "light") return "light";
  if (pref === "dark") return "dark";
  return themeMediaQuery?.matches ? "light" : "dark";
}

function syncThemeButtonState(pref) {
  const map = [
    [btnThemeSystem, "system"],
    [btnThemeDark, "dark"],
    [btnThemeLight, "light"],
  ];
  map.forEach(([button, value]) => {
    if (!button) return;
    const active = pref === value;
    button.classList.toggle("btn--active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function applyThemePreference(pref = getThemePreference()) {
  const normalized = normalizeThemePreference(pref);
  const resolved = resolveThemeMode(normalized);
  document.body.dataset.theme = resolved;
  syncThemeButtonState(normalized);
  // Keep mobile browser chrome in sync with the active theme.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", resolved === "light" ? "#f0ead8" : "#1f1a16");
}

function setThemePreference(pref) {
  const normalized = normalizeThemePreference(pref);
  localStorage.setItem(THEME_PREF_KEY, normalized);
  applyThemePreference(normalized);
}

function onSystemThemeChange() {
  if (getThemePreference() !== "system") return;
  applyThemePreference("system");
}

function initializeTheme() {
  applyThemePreference(getThemePreference());
  if (!themeMediaQuery || themeMediaListenerAttached) return;
  if (typeof themeMediaQuery.addEventListener === "function") {
    themeMediaQuery.addEventListener("change", onSystemThemeChange);
  } else if (typeof themeMediaQuery.addListener === "function") {
    themeMediaQuery.addListener(onSystemThemeChange);
  }
  themeMediaListenerAttached = true;
}

// --- Time and date utilities ---
// Firestore timestamps are NOT plain JS Dates � they're Firestore Timestamp
// objects with a `.toMillis()` method. This helper safely converts any
// timestamp-like value (Firestore Timestamp, JS Date, number, string) to
// milliseconds since epoch, returning 0 for anything unparseable.
function toMillisSafe(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function getOneShotExpiryMs(sessionData) {
  // TTL reminder: "Time To Live" means how long one-shot data stays valid.
  const explicit = toMillisSafe(sessionData?.expiresAt);
  if (explicit > 0) return explicit;
  const createdMs = toMillisSafe(sessionData?.createdAt);
  if (createdMs > 0) return createdMs + ONE_SHOT_TTL_MS;
  return 0;
}

function isExpiredOneShotSession(sessionData) {
  if (!sessionData?.isOneShot) return false;
  const expiresMs = getOneShotExpiryMs(sessionData);
  if (!expiresMs) return false;
  return Date.now() >= expiresMs;
}

async function tryDeleteExpiredOneShotSession(sessionId, sessionData = null) {
  if (!sessionId) return false;
  const data = sessionData || {};
  if (!isExpiredOneShotSession(data)) return false;
  try {
    await deleteDoc(doc(db, "sessions", sessionId));
    return true;
  } catch (err) {
    // Expected for non-owners when rules block delete.
    return false;
  }
}

// --- One-shot session persistence ---
// "One-shot" sessions auto-expire after 24h. We remember them in
// localStorage so a player can quickly rejoin without re-entering
// the session ID, nickname, and PIN every time.
function getRecentOneShotEntries() {
  try {
    // localStorage only stores strings. We parse JSON defensively so any
    // malformed value does not break app startup.
    const raw = localStorage.getItem(RECENT_ONE_SHOT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Validate every field so stale or tampered entries are dropped early.
    // This keeps downstream UI rendering logic simple and safe.
    return parsed.filter((entry) => {
      const sessionId = String(entry?.sessionId || "").trim();
      const joinTag = String(entry?.joinTag || "").trim();
      const nickname = String(entry?.nickname || "").trim();
      const pin = String(entry?.pin || "").trim();
      return !!sessionId && !!joinTag && !!nickname && /^\d{4,8}$/.test(pin);
    });
  } catch {
    return [];
  }
}

function saveRecentOneShotEntries(entries) {
  // Keep the list bounded so localStorage does not grow indefinitely.
  // Most-recent entries are stored first by callers.
  localStorage.setItem(RECENT_ONE_SHOT_KEY, JSON.stringify(entries.slice(0, RECENT_ONE_SHOT_MAX)));
}

function getJoinedSessionEntries() {
  try {
    const raw = localStorage.getItem(JOINED_SESSION_LIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => {
      const sessionId = String(entry?.sessionId || "").trim();
      if (!sessionId) return false;
      const joinTag = String(entry?.joinTag || "").trim();
      const sessionName = String(entry?.sessionName || "").trim();
      const lastSeenAtMs = Number(entry?.lastSeenAtMs || 0);
      const pin = String(entry?.pin || "").trim();
      entry.sessionId = sessionId;
      entry.joinTag = joinTag || sessionId;
      entry.sessionName = sessionName;
      entry.lastSeenAtMs = Number.isFinite(lastSeenAtMs) ? lastSeenAtMs : 0;
      entry.pin = /^\d{4,8}$/.test(pin) ? pin : "";
      return true;
    });
  } catch {
    return [];
  }
}

function saveJoinedSessionEntries(entries) {
  localStorage.setItem(JOINED_SESSION_LIST_KEY, JSON.stringify(entries.slice(0, JOINED_SESSION_LIST_MAX)));
}

function rememberJoinedSession(entry) {
  const sessionId = String(entry?.sessionId || "").trim();
  if (!sessionId) return;

  const joinTag = String(entry?.joinTag || "").trim() || sessionId;
  const sessionName = String(entry?.sessionName || "").trim();
  const nextPin = String(entry?.pin || "").trim();
  const existingAll = getJoinedSessionEntries();
  const existingMatch = existingAll.find((item) => item.sessionId === sessionId) || null;
  const existing = existingAll.filter((item) => item.sessionId !== sessionId);
  const pin = /^\d{4,8}$/.test(nextPin)
    ? nextPin
    : String(existingMatch?.pin || "").trim();

  saveJoinedSessionEntries([
    {
      sessionId,
      joinTag,
      sessionName,
      pin: /^\d{4,8}$/.test(pin) ? pin : "",
      lastSeenAtMs: Date.now(),
    },
    ...existing,
  ]);
}

function getRememberedJoinedSessionPin(sessionIdRaw) {
  const sessionId = String(sessionIdRaw || "").trim();
  if (!sessionId) return "";
  const entry = getJoinedSessionEntries().find((item) => item.sessionId === sessionId);
  const pin = String(entry?.pin || "").trim();
  return /^\d{4,8}$/.test(pin) ? pin : "";
}

function forgetJoinedSession(sessionIdRaw) {
  const sessionId = String(sessionIdRaw || "").trim();
  if (!sessionId) return;
  const next = getJoinedSessionEntries().filter((item) => item.sessionId !== sessionId);
  saveJoinedSessionEntries(next);
}

function rememberCurrentPlayerSessionForList() {
  if (state.role !== "player" || !state.sessionId) return;
  rememberJoinedSession({
    sessionId: state.sessionId,
    joinTag: state.joinTag || state.sessionId,
    sessionName: state.sessionName || "",
    pin: getRememberedJoinedSessionPin(state.sessionId),
  });
}

function rememberRecentOneShotJoin(entry) {
  // Normalize + validate input before merging into recent history.
  const sessionId = String(entry?.sessionId || "").trim();
  const joinTag = String(entry?.joinTag || "").trim();
  const nickname = String(entry?.nickname || "").trim();
  const pin = String(entry?.pin || "").trim();
  if (!sessionId || !joinTag || !nickname || !/^\d{4,8}$/.test(pin)) return;

  // De-duplicate by sessionId so one session appears once in quick-join list.
  const existing = getRecentOneShotEntries().filter((item) => item.sessionId !== sessionId);
  const payload = {
    sessionId,
    joinTag,
    nickname,
    pin,
    sessionName: String(entry?.sessionName || "").trim(),
    expiresAtMs: Number(entry?.expiresAtMs) || 0,
    lastJoinedAtMs: Date.now(),
  };
  saveRecentOneShotEntries([payload, ...existing]);
}

function formatRelativeTime(ms) {
  if (!ms) return "";
  const delta = Math.max(0, ms - Date.now());
  const mins = Math.ceil(delta / (60 * 1000));
  if (mins < 60) return `${mins}m left`;
  const hours = Math.ceil(mins / 60);
  if (hours < 48) return `${hours}h left`;
  const days = Math.ceil(hours / 24);
  return `${days}d left`;
}

async function renderRecentOneShotJoins() {
  if (!plRecentWrap || !plRecentList) return;
  plRecentWrap.classList.remove("hidden");

  // Hydration reminder: we "hydrate" UI by filling visible elements from stored/remote data.

  // Step 1: read cached entries first for instant UI feedback.
  const entries = getRecentOneShotEntries();
  if (entries.length === 0) {
    plRecentList.innerHTML = `<p class="muted small">No recent one-shots yet. Join one once, and it will appear here for quick rejoin.</p>`;
    if (plRecentMeta) plRecentMeta.textContent = "0 active";
    return;
  }

  // Step 2: validate each cached entry against Firestore in parallel.
  // Promise.all keeps this fast even when there are several recent sessions.
  const checks = await Promise.all(entries.map(async (entry) => {
    try {
      const snap = await getDoc(doc(db, "sessions", entry.sessionId));
      if (!snap.exists()) return null;
      const data = snap.data() || {};
      if (!data.isOneShot) return null;
      if (isExpiredOneShotSession(data)) {
        // Cleanup best-effort: owners can delete, non-owners are ignored.
        await tryDeleteExpiredOneShotSession(entry.sessionId, data);
        return null;
      }
      return {
        ...entry,
        joinTag: String(data.joinTag || entry.joinTag || entry.sessionId),
        sessionName: String(data.name || entry.sessionName || "Untitled One-Shot"),
        expiresAtMs: getOneShotExpiryMs(data),
      };
    } catch {
      return null;
    }
  }));

  // Step 3: persist only active entries so local cache self-heals over time.
  const active = checks.filter(Boolean);
  saveRecentOneShotEntries(active);

  if (active.length === 0) {
    plRecentList.innerHTML = `<p class="muted small">No active one-shots found. Expired sessions are removed after 24 hours.</p>`;
    if (plRecentMeta) plRecentMeta.textContent = "0 active";
    return;
  }

  if (plRecentMeta) plRecentMeta.textContent = `${active.length} active`;

  // Step 4: render quick-join buttons with TTL indicators.
  plRecentList.innerHTML = active.map((entry) => {
    const ttl = formatRelativeTime(entry.expiresAtMs);
    return `
      <button type="button" class="joinRecentItem" data-recent-session="${escapeHtml(entry.sessionId)}">
        <span>
          <span class="joinRecentItem__title">${escapeHtml(entry.sessionName || entry.joinTag)}</span>
          <span class="muted small">${escapeHtml(entry.joinTag)} � ${escapeHtml(entry.nickname)}</span>
        </span>
        <span class="muted small">${escapeHtml(ttl || "active")}</span>
      </button>
    `;
  }).join("");
}

function showOnly(screenKey) {
  // This function creates "app navigation" without page reloads.
  // We hide every screen first, then unhide only the selected one.
  //
  // BEGINNER NOTE � Single-Page App (SPA) navigation:
  // Traditional websites load a new HTML page for each view.
  // An SPA keeps ONE page loaded and toggles CSS visibility instead.
  // This is faster because there's no network round-trip to the server.
  // The tradeoff: all screen HTML lives in the DOM at once, and this
  // function manages which section the user actually sees.
  Object.values(screens).forEach((el) => el && el.classList.add("hidden"));
  screens[screenKey]?.classList.remove("hidden");

  // Trigger fade-in animation on the newly visible screen.
  const entering = screens[screenKey];
  if (entering) {
    entering.classList.remove("screen-enter");
    void entering.offsetWidth; // force reflow so animation replays
    entering.classList.add("screen-enter");
  }

  // Scroll to top so every screen starts at a clean position.
  window.scrollTo({ top: 0 });

  // body[data-screen] lets CSS target screen-specific styles like
  // showing/hiding elements that only make sense on certain screens.
  document.body.dataset.screen = screenKey;

  // Stop QR scanner camera if navigating away from the join screen.
  if (currentScreenKey === SCREEN_KEYS.PL_JOIN && screenKey !== SCREEN_KEYS.PL_JOIN) {
    try { stopScan(); } catch {}
  }

  currentScreenKey = screenKey;
  // Clear lingering toasts on screen transition so they don't persist across views.
  if (toastStack) toastStack.innerHTML = "";
  const isSessionScreen = screenKey === SCREEN_KEYS.DM_DASH || screenKey === SCREEN_KEYS.PLAYER_VIEW || screenKey === SCREEN_KEYS.PLAYER_INVENTORY || screenKey === SCREEN_KEYS.NOTES || screenKey === SCREEN_KEYS.SETTINGS || screenKey === SCREEN_KEYS.INFO || screenKey === SCREEN_KEYS.SETTINGS_PROFILE || screenKey === SCREEN_KEYS.CHARACTER_TEMPLATES || screenKey === SCREEN_KEYS.PROFILE;
  const hasSession = !!state.sessionId;

  // Keep top shell UI minimal until a session is active.
  try {
    if (topBar) {
      topBar.classList.toggle("hidden", !(hasSession && isSessionScreen));
    }
    if (nuggetCounter) {
      nuggetCounter.classList.toggle("hidden", !hasSession);
    }
    if (liveStatus) {
      liveStatus.classList.add("hidden");
    }
    if (bottomBar) {
      bottomBar.classList.toggle("hidden", !(hasSession && isSessionScreen));
    }
    if (btnHamburger) {
      btnHamburger.classList.toggle("hidden", !(hasSession && isSessionScreen));
    }
    if (btnNotifBell) {
      btnNotifBell.classList.toggle("hidden", !(hasSession && isSessionScreen));
    }
    // One-shot banner visible on session screens for guest users
    if (oneShotBanner) {
      oneShotBanner.classList.toggle("hidden", !(state.isGuest && hasSession && isSessionScreen));
    }
    // Guest / signed-in notices on create & join screens
    if (dmCreateGuestNotice) {
      dmCreateGuestNotice.classList.toggle("hidden", !state.isGuest);
    }
    if (dmCreateHeading) {
      dmCreateHeading.textContent = state.isGuest ? "New One-Shot Session" : "New Session";
    }
    if (plJoinGuestNotice) {
      plJoinGuestNotice.classList.toggle("hidden", !state.isGuest);
    }
    if (plJoinSignedNotice) {
      plJoinSignedNotice.classList.toggle("hidden", state.isGuest || !state.isSignedIn);
    }
    if (screenKey === SCREEN_KEYS.PL_JOIN) {
      renderRecentOneShotJoins().catch(() => {});
    }
  } catch (e) {}

  // Hide GM-only create button when in player role
  if (btnOpenCreateModal) btnOpenCreateModal.classList.toggle("hidden", state.role !== "dm");

  // GM FAB: replaced by inline button � keep hidden permanently
  if (gmFab) gmFab.classList.add("hidden");

  // Show inline create handout button on DM dash only
  const cInline = document.getElementById("btnCreateHandoutInline");
  if (cInline) cInline.style.display = (state.role === "dm" && screenKey === SCREEN_KEYS.DM_DASH && hasSession) ? "" : "none";

  // Close settings drawer on any screen navigation
  closeHamburgerSpeedDial();
  closeSettingsDrawer();

  try {
    if (ambienceBar) {
      // Keep ambience controls hidden by default on screen transitions.
      ambienceBar.classList.add("hidden");
      ambienceBar.setAttribute("aria-hidden", "true");
      btnOpenAmbienceBar?.classList.remove("is-active");
    }
  } catch (e) {}

  try {
    syncBottomBarActiveState(screenKey);
  } catch (e) {}

  // Show session name in Settings header when available
  try {
    if (settingsSessionInfo) {
      if (state.sessionName && state.sessionId) {
        settingsSessionInfo.textContent = `Session: ${state.sessionName}`;
        settingsSessionInfo.classList.remove("hidden");
      } else {
        settingsSessionInfo.classList.add("hidden");
      }
    }
    // Sync role switching buttons in Settings
    if (settingsRoleSection) {
      if (state.sessionId) {
        settingsRoleSection.classList.remove("hidden");
        if (btnSwitchToPlayer) btnSwitchToPlayer.classList.toggle("hidden", state.role !== "dm");
        if (btnSwitchToDM) btnSwitchToDM.classList.toggle("hidden", state.role !== "player");
        if (settingsIdentityHint) settingsIdentityHint.classList.toggle("hidden", state.role !== "dm");
        if (dmPinPrompt) dmPinPrompt.classList.add("hidden");
      } else {
        settingsRoleSection.classList.add("hidden");
      }
    }
    if (btnLeaveSession) {
      btnLeaveSession.classList.toggle("hidden", !state.sessionId);
    }
    if (btnDeleteSession) {
      btnDeleteSession.classList.toggle("hidden", !(state.sessionId && state.role === "dm"));
    }
    if (btnDiscardSession) {
      btnDiscardSession.classList.toggle("hidden", !(state.sessionId && state.role === "player"));
    }
    if (settingsSoundSection) {
      settingsSoundSection.classList.toggle("hidden", !state.sessionId);
      if (typeof syncSoundToggleUI === "function") syncSoundToggleUI();
    }
  } catch (e) {}

  if (screenKey !== SCREEN_KEYS.DM_DASH) {
    setDMSocialMode(false);
  }

  if (screenKey !== SCREEN_KEYS.SETTINGS) {
    stopCharacterSheetCamera();
  }

  if (screenKey === SCREEN_KEYS.NOTES) {
    loadNotesForCurrentSession();
  }
}

function getDefaultRoleScreen() {
  return state.role === "dm" ? "dmDash" : "plView";
}

function resolveScreenKey(screenKey) {
  const key = String(screenKey || "").trim();
  if (key && screens[key]) return key;
  return getDefaultRoleScreen();
}

function syncBottomBarActiveState(screenKey) {
  // Compute a small "screen-state matrix" first.
  // This makes each button toggle below easy to reason about.
  const isDMView = screenKey === SCREEN_KEYS.DM_DASH;
  const isPlayerView = screenKey === SCREEN_KEYS.PLAYER_VIEW;
  const isInventoryView = screenKey === SCREEN_KEYS.PLAYER_INVENTORY;
  const isProfileView = screenKey === SCREEN_KEYS.PROFILE || screenKey === SCREEN_KEYS.SETTINGS_PROFILE;
  const hasSession = !!state.sessionId;

  // Handouts tab is active on dmDash (without social mode) or plView
  if (btnOpenHandouts) {
    btnOpenHandouts.classList.toggle("hidden", !hasSession);
    const socialOpen = dmSplit?.classList.contains("social-mode");
    btnOpenHandouts.classList.toggle("is-active", (isDMView && !socialOpen) || isPlayerView);
  }

  // Music tab: always available when session active
  if (btnOpenAmbienceBar) {
    btnOpenAmbienceBar.classList.toggle("hidden", !hasSession);
  }

  // Profile tab
  if (btnOpenProfile) {
    btnOpenProfile.classList.toggle("is-active", isProfileView);
  }

  // Inventory tab
  if (btnOpenInventory) {
    btnOpenInventory.classList.toggle("hidden", !hasSession);
    btnOpenInventory.classList.toggle("is-active", isInventoryView);
  }

  // Notes tab
  const isNotesView = screenKey === SCREEN_KEYS.NOTES;
  if (btnOpenNotes) {
    btnOpenNotes.classList.toggle("hidden", !hasSession);
    btnOpenNotes.classList.toggle("is-active", isNotesView);
  }

  // Social button in top bar � GM-only
  if (btnTopBarSocial) {
    btnTopBarSocial.classList.toggle("hidden", state.role !== "dm" || !hasSession);
  }
}

function setDMSocialMode(isOpen) {
  if (!dmSocialPanel || !dmHandoutsPanel || !dmSplit) return;
  if (isWideDMDashboard()) {
    syncDMDashboardLayout();
    if (isOpen) {
      dmSocialPanel.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
    }
    return;
  }
  const open = !!isOpen;

  dmSplit.classList.toggle("social-mode", open);
  dmSocialPanel.classList.toggle("hidden", !open);
  dmHandoutsPanel.classList.toggle("hidden", open);
  if (dmDashTitle) dmDashTitle.textContent = open ? "Social" : "Handouts";

  // Hide inline create handout button when social panel is open
  const cInline = document.getElementById("btnCreateHandoutInline");
  if (cInline) cInline.style.display = (open || state.role !== "dm") ? "none" : "";

  if (btnToggleSocial) {
    btnToggleSocial.classList.toggle("is-active", open);
    btnToggleSocial.setAttribute("aria-pressed", String(open));
    btnToggleSocial.title = open ? "Hide social" : "Show social";
    // Clear notification dot when opening social panel.
    if (open) btnToggleSocial.querySelector(".notif-dot")?.remove();
  }

  if (open) {
    ambienceBar?.classList.add("hidden");
    ambienceBar?.setAttribute("aria-hidden", "true");
    btnOpenAmbienceBar?.classList.remove("is-active");
  }
}

// ---- Settings drawer open/close ----
let settingsDrawerCloseTimer = 0;

function openSettingsDrawer() {
  if (!settingsDrawer) return;
  closeHamburgerSpeedDial();
  if (settingsDrawerCloseTimer) {
    clearTimeout(settingsDrawerCloseTimer);
    settingsDrawerCloseTimer = 0;
  }
  settingsDrawer.classList.remove("is-closing");
  settingsDrawer.classList.add("is-open");
  settingsDrawer.setAttribute("aria-hidden", "false");
  updateSettingsButtons();
}

function closeSettingsDrawer() {
  if (!settingsDrawer) return;
  settingsDrawer.classList.remove("is-open");
  settingsDrawer.classList.add("is-closing");
  if (settingsDrawerCloseTimer) clearTimeout(settingsDrawerCloseTimer);
  settingsDrawerCloseTimer = setTimeout(() => {
    settingsDrawer.classList.remove("is-closing");
    settingsDrawer.setAttribute("aria-hidden", "true");
    settingsDrawerCloseTimer = 0;
  }, 360);
}

let speedDialHideTimer = 0;

function setModalVisibility(el, isOpen) {
  if (!el) return;
  el.classList.toggle("hidden", !isOpen);
  el.setAttribute("aria-hidden", isOpen ? "false" : "true");
}

// Pair with the CSS @keyframes modalBgIn/Out + modalCardIn/Out.
// Calling these instead of direct .hidden toggles gives all overlay families
// the same entrance/exit choreography.
function animateModalIn(el) {
  if (!el) return;
  if (el._modalLeaveTimer) {
    clearTimeout(el._modalLeaveTimer);
    el._modalLeaveTimer = 0;
  }
  setModalVisibility(el, true);
  el.classList.remove("modal--leaving");
  el.classList.add("modal--entering");
  el.addEventListener("animationend", () => el.classList.remove("modal--entering"), { once: true });
}

function animateModalOut(el) {
  if (!el) return;
  el.classList.remove("modal--entering");
  el.classList.add("modal--leaving");
  const finish = () => {
    setModalVisibility(el, false);
    el.classList.remove("modal--leaving");
    el._modalLeaveTimer = 0;
  };
  el.addEventListener("animationend", finish, { once: true });
  if (el._modalLeaveTimer) clearTimeout(el._modalLeaveTimer);
  el._modalLeaveTimer = setTimeout(finish, 420);
}

function isWideDMDashboard() {
  return window.matchMedia("(min-width: 1100px)").matches;
}

function getAmbienceTrackLabel(track) {
  const labels = {
    tavern: "Tavern",
    forest: "Forest",
    dungeon: "Dungeon",
    battle: "Battle",
    ocean: "Ocean",
    mysterious: "Mysterious",
  };
  return labels[String(track || "tavern").trim()] || "Tavern";
}

function renderAtmospherePanel(ambience = null) {
  const track = ambience?.track ?? dmAmbience?.value ?? "tavern";
  const volume = Number(ambience?.volume ?? dmVolume?.value ?? 0.6);
  const isPlaying = !!ambience?.isPlaying;
  if (dmAtmosphereTrack) dmAtmosphereTrack.textContent = getAmbienceTrackLabel(track);
  if (dmAtmosphereStatus) dmAtmosphereStatus.textContent = isPlaying ? "Playing" : "Paused";
  if (dmAtmosphereVolume) dmAtmosphereVolume.textContent = `${Math.round(volume * 100)}%`;
}

function syncDMDashboardLayout() {
  const wide = isWideDMDashboard();
  if (btnCloseSocial) btnCloseSocial.classList.toggle("hidden", wide);
  if (!wide) return;

  dmSplit?.classList.remove("social-mode");
  dmSocialPanel?.classList.remove("hidden");
  dmHandoutsPanel?.classList.remove("hidden");
  dmPartyPanel?.classList.remove("hidden");
  if (dmDashTitle) dmDashTitle.textContent = "Handouts";

  const cInline = document.getElementById("btnCreateHandoutInline");
  if (cInline) cInline.style.display = state.role === "dm" ? "" : "none";

  if (btnToggleSocial) {
    btnToggleSocial.classList.remove("is-active");
    btnToggleSocial.setAttribute("aria-pressed", "false");
    btnToggleSocial.title = "Session info";
  }
}

function openHamburgerSpeedDial() {
  if (!hamburgerSpeedDial) return;
  if (speedDialHideTimer) {
    clearTimeout(speedDialHideTimer);
    speedDialHideTimer = 0;
  }
  hamburgerSpeedDial.classList.remove("hidden");
  requestAnimationFrame(() => {
    hamburgerSpeedDial.classList.add("is-open");
  });
  hamburgerSpeedDial.setAttribute("aria-hidden", "false");
  btnHamburger?.setAttribute("aria-expanded", "true");
  btnHamburger?.classList.add("is-open");
}

function closeHamburgerSpeedDial() {
  if (!hamburgerSpeedDial) return;
  hamburgerSpeedDial.classList.remove("is-open");
  if (speedDialHideTimer) clearTimeout(speedDialHideTimer);
  speedDialHideTimer = setTimeout(() => {
    hamburgerSpeedDial.classList.add("hidden");
    speedDialHideTimer = 0;
  }, 180);
  hamburgerSpeedDial.setAttribute("aria-hidden", "true");
  btnHamburger?.setAttribute("aria-expanded", "false");
  btnHamburger?.classList.remove("is-open");
}

function toggleHamburgerSpeedDial() {
  if (!hamburgerSpeedDial) return;
  const willOpen = hamburgerSpeedDial.classList.contains("hidden") || !hamburgerSpeedDial.classList.contains("is-open");
  if (willOpen) openHamburgerSpeedDial();
  else closeHamburgerSpeedDial();
}

function getDefaultQuickStats() {
  return {
    level: "",
    armorRating: "",
    hitPoints: "",
    initiative: "",
    strength: "",
    dexterity: "",
    constitution: "",
    intelligence: "",
    wisdom: "",
    charisma: "",
  };
}

function isPermissionDenied(err) {
  const code = String(err?.code || "");
  return code === "permission-denied" || code === "firestore/permission-denied";
}

function normalizeSpellEntry(entry) {
  if (typeof entry === "string") {
    const name = String(entry || "").trim().slice(0, 80);
    if (!name) return null;
    return { name, school: "", level: "", description: "" };
  }

  if (!entry || typeof entry !== "object") return null;

  const name = String(entry.name || "").trim().slice(0, 80);
  if (!name) return null;

  return {
    name,
    school: String(entry.school || "").trim().slice(0, 40),
    level: String(entry.level || "").trim().slice(0, 24),
    description: String(entry.description || "").trim().slice(0, 280),
  };
}

function normalizeSpellList(entries) {
  if (!Array.isArray(entries)) return [];
  return entries
    .map((entry) => normalizeSpellEntry(entry))
    .filter(Boolean)
    .slice(0, 40);
}

function sanitizeProfileRecord(data, uid) {
  const quickStats = getDefaultQuickStats();
  PROFILE_STAT_KEYS.forEach((key) => {
    quickStats[key] = String(data?.quickStats?.[key] ?? "").trim().slice(0, 24);
  });

  const spells = normalizeSpellList(data?.spells);

  return {
    uid,
    displayName: String(data?.displayName ?? "").trim().slice(0, 60),
    bio: String(data?.bio ?? "").trim().slice(0, 600),
    avatarUrl: String(data?.avatarUrl ?? "").trim(),
    avatarStoragePath: String(data?.avatarStoragePath ?? "").trim(),
    quickStats,
    spells,
  };
}

function normalizeProfileRole(role) {
  return role === "dm" ? "dm" : "player";
}

function profileCacheKey(uid, role = "player") {
  return `${uid}::${normalizeProfileRole(role)}`;
}

const PROFILE_CACHE_TTL = 120_000; // 2 minutes

function getCachedProfile(uid, role = "player") {
  const entry = profileCache.get(profileCacheKey(uid, role));
  if (!entry) return undefined;
  if (Date.now() - entry.ts > PROFILE_CACHE_TTL) return undefined;
  return entry.profile;
}

function setCachedProfile(uid, role, profile) {
  profileCache.set(profileCacheKey(uid, role), { profile, ts: Date.now() });
}

function pickRoleProfileData(userData, role) {
  const normalizedRole = normalizeProfileRole(role);
  const roleData = userData?.roleProfiles?.[normalizedRole];
  if (roleData && typeof roleData === "object") return roleData;

  // Backward compatibility with legacy single-profile documents.
  return {
    displayName: userData?.displayName,
    bio: userData?.bio,
    avatarUrl: userData?.avatarUrl,
    avatarStoragePath: userData?.avatarStoragePath,
    quickStats: userData?.quickStats,
    spells: userData?.spells,
  };
}

function getUserProfileRef(uid) {
  return doc(db, "users", uid);
}

async function loadUserProfile(uid, { role = "player", force = false } = {}) {
  const normalizedRole = normalizeProfileRole(role);
  if (!uid) return sanitizeProfileRecord({}, "");
  if (!force) {
    const cached = getCachedProfile(uid, normalizedRole);
    if (cached) return cached;
  }

  try {
    const snap = await getDoc(getUserProfileRef(uid));
    const rawData = snap.exists() ? snap.data() : {};
    const profile = sanitizeProfileRecord(pickRoleProfileData(rawData, normalizedRole), uid);
    setCachedProfile(uid, normalizedRole, profile);
    return profile;
  } catch (err) {
    if (isPermissionDenied(err)) {
      const fallback = sanitizeProfileRecord({}, uid);
      setCachedProfile(uid, normalizedRole, fallback);
      return fallback;
    }
    throw err;
  }
}

// Returns `url` if truthy, otherwise picks a stable deterministic placeholder
// image from EMPTY_PROFILE_PLACEHOLDER_URLS based on a hash of the uid.
// This ensures a placeholder PNG is always shown, never a blank avatar slot.
function resolveDisplayAvatar(url, uid) {
  const trimmed = String(url || "").trim();
  if (trimmed) return trimmed;
  if (!EMPTY_PROFILE_PLACEHOLDER_URLS || !EMPTY_PROFILE_PLACEHOLDER_URLS.length) return "";
  const hash = String(uid || "").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return EMPTY_PROFILE_PLACEHOLDER_URLS[hash % EMPTY_PROFILE_PLACEHOLDER_URLS.length];
}

function setProfileAvatarPreview(url) {
  const resolved = resolveDisplayAvatar(url, state.uid);
  if (profileAvatarPreview) {
    profileAvatarPreview.classList.toggle("hidden", !resolved);
    if (resolved) profileAvatarPreview.src = resolved;
    else profileAvatarPreview.removeAttribute("src");
  }
  profileAvatarPlaceholder?.classList.toggle("hidden", !!resolved);
}

function updateTopBarAvatar(url) {
  if (!bottomBarAvatarImg) return;
  const src = resolveDisplayAvatar(url, state.uid);
  bottomBarAvatarImg.classList.toggle("hidden", !src);
  if (src) bottomBarAvatarImg.src = src;
  else bottomBarAvatarImg.removeAttribute("src");
}

function applyProfileToEditor(profile, canEdit) {
  profileDisplayName && (profileDisplayName.value = profile.displayName || "");
  profileBio && (profileBio.value = profile.bio || "");
  PROFILE_STAT_KEYS.forEach((key) => {
    const input = profileInputByKey[key];
    if (input) input.value = profile.quickStats?.[key] ?? "";
  });
  setProfileAvatarPreview(profile.avatarUrl || "");

  const disabled = !canEdit;
  profileDisplayName && (profileDisplayName.disabled = disabled);
  profileBio && (profileBio.disabled = disabled);
  profileAvatarFile && (profileAvatarFile.disabled = disabled);
  btnScanCharacterSheet && (btnScanCharacterSheet.disabled = disabled || ocrInProgress);
  btnCaptureCharacterSheet && (btnCaptureCharacterSheet.disabled = disabled || ocrInProgress);
  btnCloseCharacterSheetCamera && (btnCloseCharacterSheetCamera.disabled = disabled || ocrInProgress);
  btnSaveProfile && (btnSaveProfile.disabled = disabled);
  PROFILE_STAT_KEYS.forEach((key) => {
    const input = profileInputByKey[key];
    if (input) input.disabled = disabled;
  });

  if (profileContextMsg) {
    profileContextMsg.classList.toggle("hidden", canEdit);
    if (!canEdit) {
      const name = profile.displayName || "This player";
      profileContextMsg.textContent = `${name} profile is view-only. You can edit your own profile from Settings.`;
    } else {
      profileContextMsg.textContent = "";
    }
  }
}

function stopCharacterSheetCamera() {
  if (characterSheetVideo) {
    characterSheetVideo.pause();
    characterSheetVideo.srcObject = null;
  }
  if (characterSheetStream) {
    characterSheetStream.getTracks().forEach((track) => track.stop());
    characterSheetStream = null;
  }
  characterSheetCameraPanel?.classList.add("hidden");
}

async function openCharacterSheetCamera() {
  if (!state.uid || profileEditingUid !== state.uid) {
    profileScanStatus && (profileScanStatus.textContent = "Only your own profile can be scanned.");
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    profileScanStatus && (profileScanStatus.textContent = "Camera API unavailable. Choose a photo instead.");
    characterSheetPhoto?.click();
    return;
  }

  stopCharacterSheetCamera();
  profileScanStatus && (profileScanStatus.textContent = "Opening camera...");

  try {
    characterSheetStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
      },
      audio: false,
    });

    if (!characterSheetVideo) {
      throw new Error("Camera preview element missing");
    }

    characterSheetVideo.srcObject = characterSheetStream;
    await characterSheetVideo.play();
    characterSheetCameraPanel?.classList.remove("hidden");
    profileScanStatus && (profileScanStatus.textContent = "Frame the sheet and press Capture.");
  } catch (err) {
    console.error("Open character sheet camera failed:", err);
    stopCharacterSheetCamera();
    profileScanStatus && (profileScanStatus.textContent = "Camera access denied/unavailable. Choose a photo instead.");
    characterSheetPhoto?.click();
  }
}

async function captureCharacterSheetFromCamera() {
  if (!characterSheetVideo || !characterSheetVideo.videoWidth || !characterSheetVideo.videoHeight) {
    profileScanStatus && (profileScanStatus.textContent = "Camera is not ready yet.");
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.width = characterSheetVideo.videoWidth;
  canvas.height = characterSheetVideo.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    profileScanStatus && (profileScanStatus.textContent = "Could not capture frame.");
    return;
  }

  ctx.drawImage(characterSheetVideo, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 0.96));
  stopCharacterSheetCamera();
  if (!blob) {
    profileScanStatus && (profileScanStatus.textContent = "Capture failed. Try again.");
    return;
  }
  await scanCharacterSheetAndFill(blob);
}

function normalizeOcrText(rawText) {
  // OCR reminder: Optical Character Recognition converts text in images into machine-readable text.
  // OCR output often includes smart quotes, non-breaking spaces, and
  // repeated newlines. This canonicalization improves regex reliability.
  return String(rawText || "")
    .replace(/\r/g, "\n")
    .replace(/[|]/g, "I")
    .replace(/[��]/g, '"')
    .replace(/[�]/g, "'")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseCharacterSheetText(rawText) {
  // Regex reminder: regular expressions are text patterns used to find structured values.
  // OCR parsing strategy:
  // 1) Normalize text into a consistent format.
  // 2) Use multiple regex patterns per field (for sheet variations).
  // 3) Fill a strict output schema used by profile editor UI.
  const text = normalizeOcrText(rawText);
  const upperText = text.toUpperCase();
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);

  const findStat = (patterns) => {
    // Try patterns in order; first successful capture wins.
    // Ordered fallbacks let us support multiple sheet templates.
    for (const pattern of patterns) {
      const match = upperText.match(pattern);
      if (match?.[1]) return String(match[1]).trim();
    }
    return "";
  };

  const parsed = {
    displayName: "",
    bio: "",
    quickStats: getDefaultQuickStats(),
  };

  // Name extraction prefers explicit "Character Name:" style fields,
  // then falls back to reading the next line after a name anchor.
  const explicitNameMatch = text.match(/(?:CHARACTER\s*NAME|NAME)\s*[:\-]\s*([^\n]{2,60})/i);
  if (explicitNameMatch?.[1]) {
    parsed.displayName = explicitNameMatch[1].trim();
  } else {
    const nameAnchorIndex = lines.findIndex((line) => /character\s*name/i.test(line));
    if (nameAnchorIndex >= 0 && lines[nameAnchorIndex + 1]) {
      parsed.displayName = lines[nameAnchorIndex + 1].replace(/[^a-zA-Z\s'\-]/g, "").trim();
    }
  }

  // Each stat can appear with aliases (e.g. AC vs Armor Class).
  // We map many aliases into one normalized quickStats shape.
  parsed.quickStats.level = findStat([/(?:\bLEVEL\b|\bLVL\b|\bLV\b)\s*[:\-]?\s*(\d{1,2})/i]);
  parsed.quickStats.armorRating = findStat([
    /(?:ARMOR\s*RATING|ARMOR\s*CLASS|\bAC\b)\s*[:\-]?\s*(\d{1,3})/i,
    /\bAC\b\s*(\d{1,3})/i,
  ]);
  parsed.quickStats.hitPoints = findStat([
    /(?:HIT\s*POINTS?|\bHP\b)\s*[:\-]?\s*(\d{1,4})(?:\s*\/\s*\d{1,4})?/i,
    /(?:MAX\s*HP)\s*[:\-]?\s*(\d{1,4})/i,
  ]);
  parsed.quickStats.initiative = findStat([
    /(?:INITIATIVE|\bINIT\b)\s*[:\-]?\s*([+\-]?\d{1,2})/i,
  ]);
  parsed.quickStats.strength = findStat([/(?:\bSTRENGTH\b|\bSTR\b)\s*[:\-]?\s*(\d{1,2})/i]);
  parsed.quickStats.dexterity = findStat([/(?:\bDEXTERITY\b|\bDEX\b)\s*[:\-]?\s*(\d{1,2})/i]);
  parsed.quickStats.constitution = findStat([/(?:\bCONSTITUTION\b|\bCON\b)\s*[:\-]?\s*(\d{1,2})/i]);
  parsed.quickStats.intelligence = findStat([/(?:\bINTELLIGENCE\b|\bINT\b)\s*[:\-]?\s*(\d{1,2})/i]);
  parsed.quickStats.wisdom = findStat([/(?:\bWISDOM\b|\bWIS\b)\s*[:\-]?\s*(\d{1,2})/i]);
  parsed.quickStats.charisma = findStat([/(?:\bCHARISMA\b|\bCHA\b)\s*[:\-]?\s*(\d{1,2})/i]);

  // Optional "bio" summary is synthesized from common sheet identity fields.
  // We only include fields that were actually detected.
  const race = text.match(/\bRACE\b\s*[:\-]\s*([^\n]{1,40})/i)?.[1]?.trim() || "";
  const klass = text.match(/\bCLASS\b\s*[:\-]\s*([^\n]{1,40})/i)?.[1]?.trim() || "";
  const background = text.match(/\bBACKGROUND\b\s*[:\-]\s*([^\n]{1,60})/i)?.[1]?.trim() || "";
  const bioParts = [race, klass, background].filter(Boolean);
  if (bioParts.length > 0) {
    parsed.bio = bioParts.join(" � ");
  }

  return parsed;
}

async function preprocessImageForOcr(file) {
  try {
    // createImageBitmap is faster and memory-friendlier than loading
    // through <img> tags for processing pipelines.
    if (!("createImageBitmap" in window)) return file;
    const bitmap = await createImageBitmap(file);
    // Scale down oversized photos to reduce OCR latency while preserving detail.
    const maxWidth = 1800;
    const scale = Math.min(1, maxWidth / bitmap.width);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    // Hint reminder: this canvas hint asks browser engines to optimize frequent pixel reads.
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    // Per-pixel preprocessing:
    // - Convert to luminance grayscale (human-perception weighted channels)
    // - Apply simple thresholding to increase text/background contrast
    // This improves OCR hit rate on noisy photos.
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      const contrasted = gray > 160 ? 255 : gray < 90 ? 0 : gray;
      data[i] = contrasted;
      data[i + 1] = contrasted;
      data[i + 2] = contrasted;
    }
    ctx.putImageData(imageData, 0, 0);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 0.98));
    return blob || file;
  } catch {
    return file;
  }
}

function applyParsedProfileToEditor(parsed) {
  if (parsed.displayName) profileDisplayName && (profileDisplayName.value = parsed.displayName.slice(0, 60));
  if (parsed.bio) profileBio && (profileBio.value = parsed.bio.slice(0, 600));

  PROFILE_STAT_KEYS.forEach((key) => {
    const incoming = String(parsed.quickStats?.[key] || "").trim();
    if (!incoming) return;
    const input = profileInputByKey[key];
    if (input) input.value = incoming.slice(0, 24);
  });
}

async function scanCharacterSheetAndFill(file) {
  if (!file) return;
  if (!state.uid || profileEditingUid !== state.uid) {
    profileScanStatus && (profileScanStatus.textContent = "Only your own profile can be auto-filled.");
    return;
  }
  if (!file.type.startsWith("image/")) {
    profileScanStatus && (profileScanStatus.textContent = "Please choose an image file.");
    return;
  }
  if (!window.Tesseract?.recognize) {
    profileScanStatus && (profileScanStatus.textContent = "OCR library not available.");
    return;
  }

  ocrInProgress = true;
  btnScanCharacterSheet && (btnScanCharacterSheet.disabled = true);
  btnCaptureCharacterSheet && (btnCaptureCharacterSheet.disabled = true);
  profileScanStatus && (profileScanStatus.textContent = "Preparing image...");

  try {
    const preparedImage = await preprocessImageForOcr(file);
    const result = await window.Tesseract.recognize(preparedImage, "eng", {
      logger: (msg) => {
        if (msg?.status === "recognizing text" && typeof msg.progress === "number" && profileScanStatus) {
          profileScanStatus.textContent = `Reading character sheet... ${Math.round(msg.progress * 100)}%`;
        }
      },
    });

    const parsed = parseCharacterSheetText(result?.data?.text || "");
    applyParsedProfileToEditor(parsed);
    profileScanStatus && (profileScanStatus.textContent = "Character sheet imported. Review and save profile.");
  } catch (err) {
    console.error("Character sheet scan failed:", err);
    profileScanStatus && (profileScanStatus.textContent = "Could not read this photo. Try a clearer, flatter image.");
  } finally {
    ocrInProgress = false;
    btnScanCharacterSheet && (btnScanCharacterSheet.disabled = profileEditingUid !== state.uid);
    btnCaptureCharacterSheet && (btnCaptureCharacterSheet.disabled = profileEditingUid !== state.uid);
  }
}

function collectProfileFromEditor() {
  const quickStats = getDefaultQuickStats();
  PROFILE_STAT_KEYS.forEach((key) => {
    const input = profileInputByKey[key];
    quickStats[key] = String(input?.value || "").trim().slice(0, 24);
  });

  return sanitizeProfileRecord(
    {
      displayName: String(profileDisplayName?.value || "").trim(),
      bio: String(profileBio?.value || "").trim(),
      avatarUrl: profileEditorData?.avatarUrl || "",
      avatarStoragePath: profileEditorData?.avatarStoragePath || "",
      quickStats,
      spells: Array.isArray(profileEditorData?.spells) ? profileEditorData.spells : [],
    },
    profileEditingUid || state.uid || ""
  );
}

async function openProfileEditor(targetUid, returnScreenKey = currentScreenKey) {
  if (!targetUid) return;
  pendingAvatarNugget = false;
  settingsProfileReturnScreenKey = returnScreenKey;
  profileEditingUid = targetUid;
  profileEditingRole = normalizeProfileRole(targetUid === state.uid ? state.role : "player");
  const qsWrap = document.getElementById("profileQuickStatsWrap");
  if (qsWrap) qsWrap.classList.toggle("hidden", profileEditingRole === "dm");
  profileSaveMsg && (profileSaveMsg.textContent = "Loading profile...");

  const profile = await loadUserProfile(targetUid, { role: profileEditingRole, force: true });
  profileEditorData = { ...profile, quickStats: { ...profile.quickStats } };
  const canEdit = targetUid === state.uid;
  const roleLabel = profileEditingRole === "dm" ? "DM" : "Player";
  applyProfileToEditor(profileEditorData, canEdit);

  if (profileAvatarStatus) {
    profileAvatarStatus.textContent = canEdit
      ? "Upload a profile picture to preview it before saving."
      : "Picture upload is disabled for other users.";
  }
  if (profileScanStatus) {
    profileScanStatus.textContent = canEdit
      ? ""
      : "Character sheet scan is disabled for other users.";
  }
  if (profileSaveMsg) {
    profileSaveMsg.textContent = canEdit ? `Editing ${roleLabel} profile.` : "Viewing profile.";
  }
  showOnly(SCREEN_KEYS.SETTINGS_PROFILE);
}

// ---- Profile screen rendering (new bottom-bar profile tab) ----
async function renderProfileScreen() {
  const profilePlayerContent = $("profilePlayerContent");
  const profileGMContent = $("profileGMContent");
  const profileHeroImg = $("profileHeroImg");
  const profileHeroName = $("profileHeroName");
  const profileHeroBio = $("profileHeroBio");
  const profileGMImg = $("profileGMImg");
  const profileGMName = $("profileGMName");
  const profileGMBio = $("profileGMBio");
  const profileStatsReadOnly = $("profileStatsReadOnly");
  const profileSpellsList = $("profileSpellsList");
  const profileSpellsEmpty = $("profileSpellsEmpty");
  const profileTabBar = $("profileTabBar");
  const profileStatsPane = $("profileStatsPane");
  const profileSpellsPane = $("profileSpellsPane");
  const btnAddSpell = $("btnAddSpell");

  setAccordionState(btnProfileAbilityToggle, profileAbilityScoresBody, false);

  const isGM = state.role === "dm";
  if (profilePlayerContent) profilePlayerContent.classList.toggle("hidden", isGM);
  if (profileGMContent) profileGMContent.classList.toggle("hidden", !isGM);

  try {
    const role = isGM ? "dm" : "player";
    const profile = await loadUserProfile(state.uid, { role, force: false });
    const alternateRole = role === "dm" ? "player" : "dm";
    const fallbackProfile = await loadUserProfile(state.uid, { role: alternateRole, force: false });
    const resolvedTopBarAvatar = String(profile?.avatarUrl || fallbackProfile?.avatarUrl || "").trim();
    updateTopBarAvatar(resolvedTopBarAvatar);

    // Update hero section (player + GM use separate DOM nodes).
    const src = resolveDisplayAvatar(profile.avatarUrl, state.uid);
    if (isGM) {
      if (profileGMImg) {
        profileGMImg.classList.toggle("hidden", !src);
        if (src) profileGMImg.src = src;
      }
      if (profileGMName) profileGMName.textContent = profile.displayName || "Dungeon Master";
      if (profileGMBio) profileGMBio.textContent = profile.bio || "";
    } else {
      if (profileHeroImg) {
        profileHeroImg.classList.toggle("hidden", !src);
        if (src) profileHeroImg.src = src;
      }
      if (profileHeroName) profileHeroName.textContent = profile.displayName || "Adventurer";
      if (profileHeroBio) profileHeroBio.textContent = profile.bio || "";
    }

    // Player: populate quick stats in read-only grid
    if (!isGM && profileStatsReadOnly) {
      const qs = profile.quickStats || {};
      const statLabels = { level: "Level", armorRating: "AC", hitPoints: "HP", initiative: "Init", strength: "STR", dexterity: "DEX", constitution: "CON", intelligence: "INT", wisdom: "WIS", charisma: "CHA" };
      const coreStats = new Set(["level", "armorRating", "hitPoints", "initiative"]);
      profileStatsReadOnly.innerHTML = "";
      for (const [key, label] of Object.entries(statLabels)) {
        const val = qs[key] || "-";
        const el = document.createElement("div");
        el.className = `profileStatItem${coreStats.has(key) ? " profileStatItem--core" : ""}`;
        el.dataset.statKey = key;
        el.innerHTML = `<span class="profileStatItem__label">${label}</span><span class="profileStatItem__value">${val}</span>`;
        profileStatsReadOnly.appendChild(el);
      }
      profileStatsReadOnly.classList.remove("hidden");
    }

    // Player: render spell list from profile data
    if (!isGM && profileSpellsList && profileSpellsEmpty) {
      const spells = normalizeSpellList(profile.spells);
      profileSpellsList.innerHTML = spells
        .map((spell, idx) => {
          const schoolLevel = [spell.school, spell.level].filter(Boolean).join(" • ");
          return `<div class="profileSpellCard"><div class="profileSpellCard__top"><div><div class="profileSpellCard__name">${escapeHtml(spell.name)}</div>${schoolLevel ? `<div class="profileSpellCard__school">${escapeHtml(schoolLevel)}</div>` : ""}</div><button class="btn btn--ghost btn--small" type="button" data-remove-spell="${idx}">Remove</button></div>${spell.description ? `<div class="profileSpellCard__desc">${escapeHtml(spell.description)}</div>` : ""}</div>`;
        })
        .join("");
      profileSpellsEmpty.classList.toggle("hidden", spells.length > 0);

      profileSpellsList.querySelectorAll("[data-remove-spell]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const idx = Number(btn.getAttribute("data-remove-spell"));
          if (!Number.isFinite(idx)) return;
          const nextSpells = spells.filter((_, i) => i !== idx);
          try {
            await updateDoc(getUserProfileRef(state.uid), {
              [`roleProfiles.${role}.spells`]: nextSpells,
              ...(role === "player" ? { spells: nextSpells } : {}),
              updatedAt: serverTimestamp(),
            });
            profileCache.delete(profileCacheKey(state.uid, role));
            renderProfileScreen().catch(() => {});
          } catch (err) {
            console.error("Remove spell failed:", err);
            showToast("Could not remove spell.", "error");
          }
        });
      });

      if (btnAddSpell) {
        btnAddSpell.onclick = async () => {
          const nextSpell = await openSpellModal();
          if (!nextSpell) return;
          const nextSpells = [...spells, nextSpell].slice(0, 40);
          try {
            await updateDoc(getUserProfileRef(state.uid), {
              [`roleProfiles.${role}.spells`]: nextSpells,
              ...(role === "player" ? { spells: nextSpells } : {}),
              updatedAt: serverTimestamp(),
            });
            profileCache.delete(profileCacheKey(state.uid, role));
            renderProfileScreen().catch(() => {});
          } catch (err) {
            console.error("Add spell failed:", err);
            showToast("Could not add spell.", "error");
          }
        };
      }
    }

    if (!isGM && profileTabBar) {
      profileTabBar.querySelectorAll(".chip").forEach((chip) => {
        chip.classList.toggle("chip--active", chip.dataset.profileTab === "stats");
      });
    }
    if (profileStatsPane) profileStatsPane.classList.toggle("hidden", isGM);
    if (profileSpellsPane) profileSpellsPane.classList.add("hidden");
  } catch (err) {
    console.warn("renderProfileScreen error:", err);
  }

  // Show the Edit button so the player can edit their own profile (GM uses btnGMProfileEdit instead)
  const btnProfileEditEl = $("btnProfileEdit");
  if (btnProfileEditEl) btnProfileEditEl.classList.toggle("hidden", isGM);
}

async function saveCurrentProfile() {
  if (!state.uid || profileEditingUid !== state.uid) {
    profileSaveMsg && (profileSaveMsg.textContent = "Only your own profile can be updated.");
    return;
  }

  if (pendingAvatarNugget) {
    const ok = await spendNuggetWithFeedback("profile picture");
    if (!ok) {
      profileSaveMsg && (profileSaveMsg.textContent = "Not enough nuggets to save.");
      return;
    }
    pendingAvatarNugget = false;
  }

  const payload = collectProfileFromEditor();
  const normalizedRole = normalizeProfileRole(profileEditingRole);
  profileSaveMsg && (profileSaveMsg.textContent = "Saving profile...");

  const roleProfilePayload = {
    displayName: payload.displayName,
    bio: payload.bio,
    avatarUrl: payload.avatarUrl,
    avatarStoragePath: payload.avatarStoragePath,
    quickStats: payload.quickStats,
    spells: payload.spells,
  };

  const writePayload = {
    roleProfiles: {
      [normalizedRole]: roleProfilePayload,
    },
    updatedAt: serverTimestamp(),
  };

  // Keep legacy top-level fields in sync for broad compatibility.
  if (normalizedRole === "player") {
    writePayload.displayName = payload.displayName;
    writePayload.bio = payload.bio;
    writePayload.avatarUrl = payload.avatarUrl;
    writePayload.avatarStoragePath = payload.avatarStoragePath;
    writePayload.quickStats = payload.quickStats;
    writePayload.spells = payload.spells;
  }

  await setDoc(getUserProfileRef(state.uid), writePayload, { merge: true });

  profileEditorData = payload;
  setCachedProfile(state.uid, normalizedRole, payload);
  updateTopBarAvatar(payload.avatarUrl);
  profileSaveMsg && (profileSaveMsg.textContent = "Profile saved.");
  showToast("Profile saved.", "success");

  // Navigate back to the main handout page after a short delay
  setTimeout(() => {
    showOnly(getDefaultRoleScreen());
  }, 400);
}

async function uploadOwnAvatar(file) {
  if (!file || !state.uid || profileEditingUid !== state.uid) return;
  if (!file.type.startsWith("image/")) {
    profileAvatarStatus && (profileAvatarStatus.textContent = "Please upload an image file.");
    return;
  }
  profileAvatarStatus && (profileAvatarStatus.textContent = "Uploading profile picture...");
  try { file = await compressImageToMaxSize(file); } catch (_) { profileAvatarStatus && (profileAvatarStatus.textContent = "Could not process image."); return; }
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `users/${state.uid}/avatar-${Date.now()}.${ext}`;
  const avatarRef = storageRef(storage, path);
  try {
    await uploadBytes(avatarRef, file, { contentType: file.type });
  } catch (uploadErr) {
    console.error("Storage upload failed:", uploadErr);
    const msg = String(uploadErr?.message || "");
    if (msg.includes("unauthorized") || msg.includes("403") || msg.includes("storage/unauthorized")) {
      profileAvatarStatus && (profileAvatarStatus.textContent = "Upload not allowed right now. Please try again later.");
    } else {
      profileAvatarStatus && (profileAvatarStatus.textContent = "Upload failed. Please try another image.");
    }
    throw uploadErr;
  }
  const avatarUrl = await getDownloadURL(avatarRef);

  if (!profileEditorData) {
    profileEditorData = sanitizeProfileRecord({}, state.uid);
  }
  profileEditorData.avatarUrl = avatarUrl;
  profileEditorData.avatarStoragePath = path;
  setProfileAvatarPreview(avatarUrl);
  pendingAvatarNugget = true;
  profileAvatarStatus && (profileAvatarStatus.textContent = "Profile picture uploaded. Costs 1 nugget when you save.");
}

async function ensureOwnProfileLoaded() {
  if (!state.uid) return;
  let primaryProfile;
  let fallbackProfile;
  try {
    const preferredRole = normalizeProfileRole(state.role || "player");
    const alternateRole = preferredRole === "dm" ? "player" : "dm";
    primaryProfile = await loadUserProfile(state.uid, { role: preferredRole });
    fallbackProfile = await loadUserProfile(state.uid, { role: alternateRole });
  } catch (err) {
    console.warn("Profile preload skipped:", err);
    return;
  }
  const resolvedAvatarUrl = String(primaryProfile?.avatarUrl || fallbackProfile?.avatarUrl || "").trim();
  updateTopBarAvatar(resolvedAvatarUrl);
}

async function hydrateActivePlayerProfiles(players) {
  // Hydrate reminder: this preloads player profile data into cache before it is rendered.
  const ids = players.map((p) => p.id).filter(Boolean);
  if (ids.length === 0) return;

  await Promise.all(ids.map(async (uid) => {
    try {
      await loadUserProfile(uid, { role: "player" });
    } catch (e) {}
  }));
}

function setLiveTick() {
  const joinTag = String(state.joinTag || "").trim();
  const sessionId = String(state.sessionId || "").trim();
  const fromHash = joinTag.match(/#(\d{4})$/)?.[1] || "";
  const fromLegacyDash = joinTag.match(/-(\d{4})$/)?.[1] || "";
  const fromSessionId = sessionId.slice(-4);
  const code = (fromHash || fromLegacyDash || fromSessionId || "----").toUpperCase();
  const tagText = joinTag || `session#${code}`;
  const idText = sessionId || "--------";
  const fullDisplay = `${tagText} � ${idText}`;
  const summaryDisplay = tagText;

  if (liveStatus) {
    liveStatus.title = fullDisplay;
    liveStatus.dataset.sessionText = fullDisplay;
    liveStatus.dataset.sessionSummary = summaryDisplay;
  }

  if (liveStatusTag) liveStatusTag.textContent = tagText;
  if (liveStatusId) liveStatusId.textContent = idText;

  if (plSessionBadgeText) plSessionBadgeText.textContent = `#${code}`;
  if (plSessionTag) plSessionTag.textContent = tagText;
  if (plSessionIdText) plSessionIdText.textContent = idText;

  if (playerSessionRef) {
    const hasSession = !!(joinTag || sessionId);
    playerSessionRef.classList.toggle("hidden", !hasSession);
  }
}

let liveStatusPinned = false;
let playerSessionPinned = false;

function setSessionPanelState(panel, trigger, isOpen) {
  if (!panel || !trigger) return;
  panel.classList.toggle("hidden", !isOpen);
  panel.setAttribute("aria-hidden", isOpen ? "false" : "true");
  trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
}

function setAdvancedState(detailsEl, toggleBtn, isOpen) {
  if (!detailsEl || !toggleBtn) return;
  detailsEl.classList.toggle("hidden", !isOpen);
  detailsEl.setAttribute("aria-hidden", isOpen ? "false" : "true");
  toggleBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
  toggleBtn.textContent = isOpen ? "Hide advanced" : "Advanced details";
}

// Close every top-bar dropdown so only one is open at a time.
function closeAllTopBarPanels() {
  closeLiveStatusPanel();
  liveStatusPinned = false;
  closePlayerSessionPanel();
  playerSessionPinned = false;
  if (playerListDropdown) { playerListDropdown.classList.add("hidden"); }
  if (notifPanel) { notifPanel.classList.add("hidden"); notifPanel.setAttribute("aria-hidden", "true"); }
}

function openLiveStatusPanel() {
  setSessionPanelState(liveStatusPanel, liveStatus, true);
}

function closeLiveStatusPanel() {
  setSessionPanelState(liveStatusPanel, liveStatus, false);
  setAdvancedState(liveAdvancedDetails, btnToggleLiveAdvanced, false);
}

function openPlayerSessionPanel() {
  setSessionPanelState(plSessionDetails, plSessionBadge, true);
}

function closePlayerSessionPanel() {
  setSessionPanelState(plSessionDetails, plSessionBadge, false);
  setAdvancedState(playerAdvancedDetails, btnTogglePlayerAdvanced, false);
}

btnToggleLiveAdvanced?.addEventListener("click", (event) => {
  event.preventDefault();
  const willOpen = liveAdvancedDetails?.classList.contains("hidden");
  setAdvancedState(liveAdvancedDetails, btnToggleLiveAdvanced, !!willOpen);
});

btnTogglePlayerAdvanced?.addEventListener("click", (event) => {
  event.preventDefault();
  const willOpen = playerAdvancedDetails?.classList.contains("hidden");
  setAdvancedState(playerAdvancedDetails, btnTogglePlayerAdvanced, !!willOpen);
});

const liveStatusWrap = liveStatus?.closest(".sessionPeekWrap");
liveStatus?.addEventListener("mouseenter", () => {
  if (!liveStatusPinned) openLiveStatusPanel();
});

liveStatus?.addEventListener("focus", () => {
  if (!liveStatusPinned) openLiveStatusPanel();
});

liveStatus?.addEventListener("click", (event) => {
  event.preventDefault();
  const wasOpen = liveStatusPinned;
  closeAllTopBarPanels();
  liveStatusPinned = !wasOpen;
  if (liveStatusPinned) openLiveStatusPanel();
  else closeLiveStatusPanel();
});

liveStatusWrap?.addEventListener("mouseleave", () => {
  if (!liveStatusPinned) closeLiveStatusPanel();
});

const playerSessionWrap = plSessionBadge?.closest(".playerSessionRef");
plSessionBadge?.addEventListener("mouseenter", () => {
  if (!playerSessionPinned) openPlayerSessionPanel();
});

plSessionBadge?.addEventListener("focus", () => {
  if (!playerSessionPinned) openPlayerSessionPanel();
});

plSessionBadge?.addEventListener("click", (event) => {
  event.preventDefault();
  playerSessionPinned = !playerSessionPinned;
  if (playerSessionPinned) openPlayerSessionPanel();
  else closePlayerSessionPanel();
});

playerSessionWrap?.addEventListener("mouseleave", () => {
  if (!playerSessionPinned) closePlayerSessionPanel();
});

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Node)) return;

  if (hamburgerSpeedDial && btnHamburger) {
    const clickedInsideDial = hamburgerSpeedDial.contains(target);
    const clickedHamburger = btnHamburger.contains(target);
    if (!clickedInsideDial && !clickedHamburger) {
      closeHamburgerSpeedDial();
    }
  }

  if (liveStatusWrap && !liveStatusWrap.contains(target)) {
    liveStatusPinned = false;
    closeLiveStatusPanel();
  }

  if (playerSessionWrap && !playerSessionWrap.contains(target)) {
    playerSessionPinned = false;
    closePlayerSessionPanel();
  }
});

document.addEventListener("keydown", (event) => {
  const key = event.key;

  // Escape: close panels
  if (key === "Escape") {
    liveStatusPinned = false;
    playerSessionPinned = false;
    closeHamburgerSpeedDial();
    closeSettingsDrawer();
    closeLiveStatusPanel();
    closePlayerSessionPanel();
    if (notifPanel && !notifPanel.classList.contains("hidden")) {
      notifPanel.classList.add("hidden");
      notifPanel.setAttribute("aria-hidden", "true");
    }
    closePlayerCard();
    return;
  }

  // Desktop-only shortcuts (Ctrl/Cmd combos)
  if (!matchMedia("(pointer: fine)").matches) return;
  const ctrl = event.ctrlKey || event.metaKey;
  if (!ctrl) return;

  // Ctrl+S � save current handout
  if (key === "s") {
    event.preventDefault();
    btnSaveHandout?.click();
    return;
  }
  // Ctrl+N � open create handout modal
  if (key === "n") {
    event.preventDefault();
    btnOpenCreateHandout?.click();
    return;
  }
  // Ctrl+F � focus handout search
  if (key === "f") {
    const search = $("dmSearch");
    if (search) { event.preventDefault(); search.focus(); }
    return;
  }
  // Ctrl+1-5 � bottom bar buttons
  const barBtns = [btnToggleSocial, btnOpenAmbienceBar, btnOpenHandouts, btnOpenInventory, btnOpenSettings];
  const idx = parseInt(key, 10);
  if (idx >= 1 && idx <= 5) {
    event.preventDefault();
    barBtns[idx - 1]?.click();
  }
});

btnCopyLiveStatus?.addEventListener("click", async () => {
  await shareSessionInvite();
});

btnCopyPlayerSession?.addEventListener("click", async () => {
  const includeAdvanced = !!btnTogglePlayerAdvanced?.getAttribute("aria-expanded") && btnTogglePlayerAdvanced.getAttribute("aria-expanded") === "true";
  const text = String(includeAdvanced
    ? liveStatus?.dataset.sessionText
    : liveStatus?.dataset.sessionSummary || "").trim();
  if (!text) return;
  await copyToClipboard(text);
  pulseCopiedFeedback(btnCopyPlayerSession, plSessionBadge);
  showToast(includeAdvanced ? "Session details copied." : "Session tag copied.", "success");
});

// Nugget counter is updated by subscribeNuggets() when in a session.
// No separate network indicator needed � Firebase handles reconnection.

function showToast(message, type = "info", timeoutMs = 2600) {
  // Toasts are non-blocking messages (better UX than alert popups).
  if (!toastStack) return;
  const toast = document.createElement("div");
  toast.className = `toast${type === "info" ? "" : ` toast--${type}`}`;
  toast.textContent = message;
  toastStack.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("toast--leaving");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
    // Fallback: remove even if animationend never fires (e.g. reduced motion).
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
  }, timeoutMs);
}

// Undo toast: shows a message with an Undo button. If user doesn't click Undo
// within timeoutMs, onConfirm() executes the destructive action.
function showUndoToast(message, onConfirm, timeoutMs = 5000) {
  if (!toastStack) { onConfirm(); return; }
  let cancelled = false;
  const toast = document.createElement("div");
  toast.className = "toast toast--undo";
  const msgSpan = document.createElement("span");
  msgSpan.textContent = message;
  const undoBtn = document.createElement("button");
  undoBtn.className = "toast__undoBtn";
  undoBtn.textContent = "Undo";
  undoBtn.type = "button";
  toast.appendChild(msgSpan);
  toast.appendChild(undoBtn);
  toastStack.appendChild(toast);

  undoBtn.addEventListener("click", () => {
    cancelled = true;
    toast.remove();
    showToast("Action undone.", "info", 1500);
  });

  setTimeout(() => {
    if (!cancelled) onConfirm();
    toast.classList.add("toast--leaving");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
  }, timeoutMs);
}

// Auth loading overlay blocks interaction during auth/resume work.
const authLoadingOverlay = $("authLoadingOverlay");
const authLoadingText = authLoadingOverlay?.querySelector(".authLoadingOverlay__text");
let authLoadingDepth = 0;
let authLoadingShownAt = 0;
function showAuthLoading(message = "Loading your adventure...") {
  if (!authLoadingOverlay) return;
  if (authLoadingText) authLoadingText.textContent = message;
  authLoadingDepth += 1;
  if (authLoadingDepth > 1) return;
  authLoadingShownAt = Date.now();
  authLoadingOverlay.classList.remove("hidden");
  authLoadingOverlay.setAttribute("aria-hidden", "false");
}

function hideAuthLoading(force = false) {
  if (!authLoadingOverlay) return;
  if (force) authLoadingDepth = 0;
  else authLoadingDepth = Math.max(0, authLoadingDepth - 1);
  if (authLoadingDepth > 0) return;

  const elapsed = Date.now() - authLoadingShownAt;
  const remaining = Math.max(0, 320 - elapsed);
  const close = () => {
    authLoadingOverlay.classList.add("hidden");
    authLoadingOverlay.setAttribute("aria-hidden", "true");
  };
  if (remaining > 0) setTimeout(close, remaining);
  else close();
}

function delayMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Haptic feedback: micro-vibrate (10ms) on any button tap.
document.body.addEventListener("click", (e) => {
  if (e.target instanceof HTMLElement && e.target.closest("button")) {
    navigator.vibrate?.(10);
  }
}, { passive: true });

// -- Notification bell (toggle panel, render, mark read) --
// The bell appears in the topbar for both GM and players once they enter a
// session. Clicking it toggles a dropdown panel listing the latest 10
// notifications. The badge shows an unread count.
let notifItems = []; // cached array of {id, type, message, payload, read, createdAt}

function toggleNotifPanel() {
  if (!notifPanel) return;
  const opening = notifPanel.classList.contains("hidden");
  notifPanel.classList.toggle("hidden", !opening);
  notifPanel.setAttribute("aria-hidden", String(!opening));
}

btnNotifBell?.addEventListener("click", (e) => {
  e.stopPropagation();
  const wasOpen = notifPanel && !notifPanel.classList.contains("hidden");
  closeAllTopBarPanels();
  if (!wasOpen) {
    toggleNotifPanel();
  }
  // User explicitly opened notifications: mark everything read immediately.
  markAllNotifsRead().catch((err) => {
    console.warn("markAllNotifsRead on bell click failed:", err);
  });
});

// Close notification panel when clicking outside
document.addEventListener("click", (e) => {
  if (notifPanel && !notifPanel.classList.contains("hidden") &&
      !notifPanel.contains(e.target) && e.target !== btnNotifBell &&
      !btnNotifBell?.contains(e.target)) {
    notifPanel.classList.add("hidden");
    notifPanel.setAttribute("aria-hidden", "true");
  }
});

function updateNotifBadge() {
  const unread = notifItems.filter(n => !n.read).length;
  if (notifBadge) {
    notifBadge.textContent = "";
    notifBadge.classList.toggle("hidden", unread === 0);
  }
  // Bell turns orange when there are unread notifications.
  if (btnNotifBell) {
    btnNotifBell.classList.toggle("notifBell--unread", unread > 0);
  }
}

const NOTIF_ICONS = {
  handoutRevealed: "📜",
  itemReceived: "🎁",
  coinsReceived: "💰",
  profileOffer: "🎭",
  profileOfferResponse: "✅",
  roleTransfer: "👑",
  nuggetSpent: "🪙",
  playerJoined: "🧙",
  playerKicked: "🚫",
  playerLeft: "👋",
  sessionDeleted: "💀",
  dmMessage: "📢",
  default: "🔔"
};

function renderNotifications() {
  if (!notifList || !notifEmpty) return;
  notifList.innerHTML = "";
  if (notifItems.length === 0) {
    notifEmpty.classList.remove("hidden");
    return;
  }
  notifEmpty.classList.add("hidden");
  notifItems.forEach((n, index) => {
    const el = document.createElement("div");
    el.className = `notifItem list-stagger-item${n.read ? "" : " notifItem--unread"}`;
    el.dataset.id = n.id;
    el.style.setProperty("--stagger-index", String(index));
    const icon = NOTIF_ICONS[n.type] || NOTIF_ICONS.default;
    const timeStr = n.createdAt?.toDate
      ? n.createdAt.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "";
    el.innerHTML = `<span class="notifItem__icon" aria-hidden="true">${icon}</span>`
      + `<div class="notifItem__body">`
      + `<span class="notifItem__msg">${escapeHtml(n.message)}</span>`
      + `<span class="notifItem__time">${escapeHtml(timeStr)}</span>`
      + `</div>`;
    el.addEventListener("click", () => markNotifRead(n.id));
    notifList.appendChild(el);
  });
  updateNotifBadge();
}

async function markNotifRead(notifId) {
  if (!state.sessionId) return;
  const item = notifItems.find(n => n.id === notifId);
  if (item) item.read = true;
  renderNotifications();
  try {
    await updateDoc(doc(db, "sessions", state.sessionId, "notifications", notifId), { read: true });
  } catch (e) { console.warn("markNotifRead:", e); }
}

async function markAllNotifsRead() {
  if (!state.sessionId) return;
  notifItems.forEach(n => { n.read = true; });
  renderNotifications();
  for (const n of notifItems) {
    try {
      await updateDoc(doc(db, "sessions", state.sessionId, "notifications", n.id), { read: true });
    } catch (e) { /* ignore */ }
  }
}
btnNotifMarkAll?.addEventListener("click", markAllNotifsRead);

// Subscribe to notifications � called when entering a session.
function subscribeNotifications() {
  // onSnapshot reminder: a realtime listener that re-runs callback whenever matching data changes.
  // unsub reminder: stored unsubscribe function is called later to stop the listener cleanly.
  if (!state.sessionId || !state.uid) return;
  if (state.unsubNotifications) state.unsubNotifications();
  const notifsRef = collection(db, "sessions", state.sessionId, "notifications");
  const q = query(notifsRef, where("targetUid", "==", state.uid), orderBy("createdAt", "desc"), limit(10));
  state.unsubNotifications = onSnapshot(q, (snap) => {
    notifItems = snap.docs.map((d) => {
      const data = d.data() || {};
      // Only explicit `false` counts as unread to avoid stale legacy docs keeping bell lit.
      return { id: d.id, ...data, read: data.read === false ? false : true };
    });
    renderNotifications();
    // Show bell if in a session
    btnNotifBell?.classList.remove("hidden");
    // Check for blocking modals (transfer, profile offer)
    checkBlockingNotifications();
  }, (err) => {
    console.warn("Notification listener error:", err);
  });
}

// Create a notification for a target player (used by GM actions).
async function createNotification(targetUid, type, message, payload = {}) {
  if (!state.sessionId) return;
  try {
    await addDoc(collection(db, "sessions", state.sessionId, "notifications"), {
      targetUid,
      type,
      message,
      payload,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (e) { console.warn("createNotification:", e); }
}

// Check for role-transfer or profile-offer notifications and show blocking modal.
function checkBlockingNotifications() {
  // Transfer modal
  const transferNotif = notifItems.find(n => n.type === "roleTransfer" && !n.read);
  if (transferNotif && transferModal) {
    transferModalMsg && (transferModalMsg.textContent = transferNotif.message || "The DM wants to transfer the DM role to you.");
    animateModalIn(transferModal);
  }
  // Profile offer modal
  const profileNotif = notifItems.find(n => n.type === "profileOffer" && !n.read);
  if (profileNotif && profileOfferModal) {
    profileOfferMsg && (profileOfferMsg.textContent = profileNotif.message || "The DM has created a character for you.");
    if (profileOfferPreview && profileNotif.payload) {
      const p = profileNotif.payload;
      let html = `<strong>${escapeHtml(p.name || "Character")}</strong>`;
      if (p.bio) html += `<p class="muted small">${escapeHtml(p.bio)}</p>`;
      const statKeys = ["level","armorRating","hitPoints","initiative","strength","dexterity","constitution","intelligence","wisdom","charisma"];
      const stats = statKeys.filter(k => p[k] != null).map(k => `<div class="profileOfferPreview__stat"><span>${k}</span><span>${p[k]}</span></div>`).join("");
      if (stats) html += `<div class="profileOfferPreview__stats">${stats}</div>`;
      profileOfferPreview.innerHTML = html;
    }
    animateModalIn(profileOfferModal);
  }
  // Session deleted modal � blocking overlay for players
  const deletedNotif = notifItems.find(n => n.type === "sessionDeleted" && !n.read);
  if (deletedNotif && sessionDeletedModal) {
    animateModalIn(sessionDeletedModal);
  }
}

// -- Nugget Currency System --
const NUGGET_STARTING_BALANCE = 6;
const NUGGET_RESET_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const NUGGET_RESET_KEY = "tv_lastNuggetReset";

function updateNuggetDisplay(balance) {
  if (nuggetBalanceEl) nuggetBalanceEl.textContent = String(balance ?? 0);
  const shopBal = $("nuggetShopBalance");
  if (shopBal) shopBal.textContent = String(balance ?? 0);
}

function subscribeNuggets() {
  // Realtime wallet sync uses onSnapshot so nugget counts update immediately for current session.
  if (!state.sessionId || !state.uid) return;
  if (state.unsubNuggets) state.unsubNuggets();

  const walletId = state.role === "dm" ? "dm" : state.uid;
  const walletRef = doc(db, "sessions", state.sessionId, "wallets", walletId);

  state.unsubNuggets = onSnapshot(walletRef, async (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      updateNuggetDisplay(data.nuggets ?? 0);
    } else {
      // First time: create wallet with starting nuggets
      try {
        await setDoc(walletRef, { nuggets: NUGGET_STARTING_BALANCE });
        updateNuggetDisplay(NUGGET_STARTING_BALANCE);
      } catch (e) { console.warn("Init nugget wallet:", e); }
    }
  }, (err) => {
    console.warn("Nugget listener error:", err);
  });
}

// -- Nugget Shop --
const nuggetShopModal = $("nuggetShopModal");
const btnCloseNuggetShop = $("btnCloseNuggetShop");
const btnResetNuggets = $("btnResetNuggets");
const nuggetResetStatus = $("nuggetResetStatus");

function openNuggetShop() {
  if (!nuggetShopModal) return;
  const shopBal = $("nuggetShopBalance");
  if (shopBal && nuggetBalanceEl) shopBal.textContent = nuggetBalanceEl.textContent;
  updateNuggetResetStatus();
  animateModalIn(nuggetShopModal);
}

function updateNuggetResetStatus() {
  if (!nuggetResetStatus) return;
  const lastReset = parseInt(localStorage.getItem(NUGGET_RESET_KEY) || "0", 10);
  const elapsed = Date.now() - lastReset;
  if (elapsed < NUGGET_RESET_COOLDOWN_MS) {
    const minsLeft = Math.ceil((NUGGET_RESET_COOLDOWN_MS - elapsed) / 60000);
    nuggetResetStatus.textContent = `Available again in ${minsLeft} min`;
    if (btnResetNuggets) btnResetNuggets.disabled = true;
  } else {
    nuggetResetStatus.textContent = "";
    if (btnResetNuggets) btnResetNuggets.disabled = false;
  }
}

nuggetCounter?.addEventListener("click", () => openNuggetShop());
btnCloseNuggetShop?.addEventListener("click", () => { if (nuggetShopModal) animateModalOut(nuggetShopModal); });
nuggetShopModal?.addEventListener("click", (e) => { if (e.target === nuggetShopModal) animateModalOut(nuggetShopModal); });

btnResetNuggets?.addEventListener("click", async () => {
  if (!state.sessionId || !state.uid) return;
  const lastReset = parseInt(localStorage.getItem(NUGGET_RESET_KEY) || "0", 10);
  if (Date.now() - lastReset < NUGGET_RESET_COOLDOWN_MS) {
    updateNuggetResetStatus();
    showToast("Reset is on cooldown. Try again later.", "error");
    return;
  }
  const walletId = state.role === "dm" ? "dm" : state.uid;
  const walletRef = doc(db, "sessions", state.sessionId, "wallets", walletId);
  try {
    await setDoc(walletRef, { nuggets: NUGGET_STARTING_BALANCE }, { merge: true });
    localStorage.setItem(NUGGET_RESET_KEY, String(Date.now()));
    showToast("Nuggets reset to 6!", "success");
    updateNuggetResetStatus();
  } catch (e) {
    console.error("Reset nuggets:", e);
    showToast("Could not reset nuggets.", "error");
  }
});

// -- Spend Nugget --
// Atomically deducts 1 nugget from the current user's wallet.
// Returns true if successful, false if insufficient balance or error.
async function spendNugget() {
  if (!state.sessionId || !state.uid) return false;
  const walletId = state.role === "dm" ? "dm" : state.uid;
  const walletRef = doc(db, "sessions", state.sessionId, "wallets", walletId);
  try {
    const snap = await getDoc(walletRef);
    if (!snap.exists() || (snap.data().nuggets ?? 0) < 1) {
      showToast("Not enough nuggets! Visit the Nugget Shop.", "error");
      return false;
    }
    await updateDoc(walletRef, { nuggets: increment(-1) });
    return true;
  } catch (e) {
    console.error("spendNugget:", e);
    showToast("Could not spend nugget.", "error");
    return false;
  }
}

// Deducts 1 nugget and provides user feedback (toast + notification).
async function spendNuggetWithFeedback(reason) {
  const ok = await spendNugget();
  if (!ok) return false;
  showToast(`?? 1 nugget spent: ${reason}`, "info", 3000);
  createNotification(state.uid, "nuggetSpent", `1 nugget spent on ${reason}`);
  return true;
}

function confirmNuggetCost(message) {
  return window.confirm(`${message}\n\nThis action costs 1 nugget. Proceed?`);
}

let pendingAvatarNugget = false;
let pendingTemplateNugget = false;
let pendingHandoutNugget = false;
let pendingInventoryNugget = false;
let profileAvatarUploadConfirmed = false;
let createHandoutImageUploadConfirmed = false;
let editHandoutImageUploadConfirmed = false;

// -- GM Role Transfer --
// Flow: GM picks player ? sets PIN ? writes pendingTransfer doc ? target
// player sees blocking modal ? enters PIN ? dmUid is updated ? both reload.
async function initiateGMTransfer() {
  if (state.role !== "dm" || !state.sessionId) return;
  const players = (state.activePlayers || []).filter(p => (p.id || p.uid) !== state.uid);
  if (players.length === 0) { showToast("No players to transfer to.", "error"); return; }
  const choice = await openPlayerPicker({
    title: "Transfer DM Role",
    players,
    submitLabel: "Start Transfer",
    requirePin: true,
  });
  if (!choice) return;
  const targetUid = choice.uid;
  const pin = choice.pin;
  const pinHash = await sha256(pin.trim());
  try {
    await setDoc(doc(db, "sessions", state.sessionId, "pendingTransfer", "current"), {
      targetUid,
      pinHash,
      fromUid: state.uid,
      status: "pending",
      createdAt: serverTimestamp()
    });
    await createNotification(targetUid, "roleTransfer", `${state.displayName || "The DM"} wants to transfer the DM role to you.`, { fromUid: state.uid });
    showToast("Transfer initiated! Waiting for player to accept.", "info");
  } catch (e) {
    console.error("initiateGMTransfer:", e);
    showToast("Failed to initiate transfer.", "error");
  }
}

function renderPlayerPickerList(players) {
  if (!playerPickerList) return;
  playerPickerList.innerHTML = "";
  players.forEach((p, index) => {
    const uid = p.id || p.uid;
    const nick = p.nickname || getOwnerNick(uid) || uid;
    const row = document.createElement("button");
    row.type = "button";
    row.className = `playerPickerRow list-stagger-item${pickerSelectionUid === uid ? " is-active" : ""}`;
    row.dataset.uid = uid;
    row.style.setProperty("--stagger-index", String(index));
    row.innerHTML = `<span>${escapeHtml(nick)}</span><span class="muted small">${escapeHtml(uid)}</span>`;
    row.addEventListener("click", () => {
      pickerSelectionUid = uid;
      renderPlayerPickerList(players);
    });
    playerPickerList.appendChild(row);
  });
}

function closePlayerPicker(result = null) {
  if (playerPickerModal) animateModalOut(playerPickerModal);
  if (pickerResolver) {
    const resolve = pickerResolver;
    pickerResolver = null;
    resolve(result);
  }
}

function openPlayerPicker({ title, players, submitLabel = "Assign", requirePin = false }) {
  if (!playerPickerModal || !playerPickerList || !btnPlayerPickerConfirm) return Promise.resolve(null);
  if (!players || players.length === 0) return Promise.resolve(null);

  pickerSelectionUid = String(players[0].id || players[0].uid || "");
  if (playerPickerTitle) playerPickerTitle.textContent = title || "Select Player";
  btnPlayerPickerConfirm.textContent = submitLabel;
  if (playerPickerPinWrap) playerPickerPinWrap.classList.toggle("hidden", !requirePin);
  if (playerPickerPin) playerPickerPin.value = "";
  renderPlayerPickerList(players);
  animateModalIn(playerPickerModal);

  return new Promise((resolve) => {
    pickerResolver = resolve;

    btnPlayerPickerConfirm.onclick = () => {
      const uid = pickerSelectionUid;
      if (!uid) { showToast("Choose a player first.", "error"); return; }
      let pin = "";
      if (requirePin) {
        pin = String(playerPickerPin?.value || "").trim();
        if (!pin) { showToast("Set a one-time transfer PIN.", "error"); return; }
      }
      closePlayerPicker({ uid, pin });
    };

    if (btnPlayerPickerCancel) {
      btnPlayerPickerCancel.onclick = () => closePlayerPicker(null);
    }
    playerPickerModal.onclick = (e) => {
      if (e.target === playerPickerModal) closePlayerPicker(null);
    };
  });
}

btnTransferGMRole?.addEventListener("click", initiateGMTransfer);

// Target player accepts transfer
btnAcceptTransfer?.addEventListener("click", async () => {
  if (!state.sessionId || !state.uid) return;
  const pin = transferPinInput?.value?.trim();
  if (!pin) { showToast("Please enter the transfer PIN.", "error"); return; }
  try {
    const transferSnap = await getDoc(doc(db, "sessions", state.sessionId, "pendingTransfer", "current"));
    if (!transferSnap.exists()) { showToast("No pending transfer found.", "error"); return; }
    const data = transferSnap.data();
    if (data.targetUid !== state.uid) { showToast("This transfer is not for you.", "error"); return; }
    const pinHash = await sha256(pin);
    if (pinHash !== data.pinHash) { showToast("Incorrect PIN.", "error"); return; }
    // Execute transfer: update dmUid
    await updateDoc(doc(db, "sessions", state.sessionId), { dmUid: state.uid, updatedAt: serverTimestamp() });
    await deleteDoc(doc(db, "sessions", state.sessionId, "pendingTransfer", "current"));
    // Mark notification as read
    const transferNotif = notifItems.find(n => n.type === "roleTransfer" && !n.read);
    if (transferNotif) await markNotifRead(transferNotif.id);
    animateModalOut(transferModal);
    showToast("You are now the DM!", "info");
    // Reload to reflect new role
    state.role = "dm";
    cleanupListeners();
    openDMDashboard(state.sessionName);
  } catch (e) {
    console.error("acceptTransfer:", e);
    showToast("Transfer failed.", "error");
  }
});

btnDeclineTransfer?.addEventListener("click", async () => {
  if (!state.sessionId) return;
  try {
    await deleteDoc(doc(db, "sessions", state.sessionId, "pendingTransfer", "current"));
    const transferNotif = notifItems.find(n => n.type === "roleTransfer" && !n.read);
    if (transferNotif) await markNotifRead(transferNotif.id);
    animateModalOut(transferModal);
    showToast("Transfer declined.", "info");
  } catch (e) { console.warn("declineTransfer:", e); }
});

// -- GM manage player stats --
// When GM opens a player card, an "Edit Stats" button lets them modify
// session-scoped quickStats stored at sessions/{sid}/players/{uid}.
async function savePlayerQuickStats(uid, stats) {
  if (!state.sessionId || !uid) return;
  try {
    await updateDoc(doc(db, "sessions", state.sessionId, "players", uid), {
      quickStats: stats
    });
    showToast("Player stats saved.", "info");
  } catch (e) {
    console.error("savePlayerQuickStats:", e);
    showToast("Failed to save stats.", "error");
  }
}

// -- Keyboard shortcuts card --
btnShowShortcuts?.addEventListener("click", () => {
  if (shortcutOverlay) animateModalIn(shortcutOverlay);
});
btnCloseShortcuts?.addEventListener("click", () => {
  if (shortcutOverlay) animateModalOut(shortcutOverlay);
});
// Show shortcuts button only on desktop
if (matchMedia("(pointer: fine)").matches && btnShowShortcuts) {
  // Will be shown/hidden when settings menu is painted
}

// -- Settings menu: show/hide GM-only and desktop-only buttons --
function updateSettingsButtons() {
  const isDM = state.role === "dm";
  const hasSession = !!state.sessionId;
  const isDesktop = matchMedia("(pointer: fine)").matches;
  if (btnCharacterProfiles) btnCharacterProfiles.classList.toggle("hidden", !isDM || !hasSession);
  if (btnTransferGMRole) btnTransferGMRole.classList.toggle("hidden", !isDM || !hasSession);
  if (btnShowShortcuts) btnShowShortcuts.classList.toggle("hidden", !isDesktop || !hasSession);
}

// -- Character Templates CRUD --
let editingTemplateId = null; // null = creating new
let pendingTemplateImageUrl = null; // uploaded image URL for current template

btnPickTemplateImage?.addEventListener("click", () => templateImage?.click());
templateImage?.addEventListener("change", async () => {
  const file = templateImage.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    if (templateImageStatus) templateImageStatus.textContent = "Please select an image file.";
    return;
  }
  if (templateImageStatus) templateImageStatus.textContent = "Uploading...";
  let uploadFile;
  try { uploadFile = await compressImageToMaxSize(file); } catch (_) { if (templateImageStatus) templateImageStatus.textContent = "Could not process image."; return; }
  const ext = (uploadFile.name.split(".").pop() || "png").toLowerCase();
  const path = `users/${state.uid}/templates/${Date.now()}.${ext}`;
  const ref = storageRef(storage, path);
  try {
    await uploadBytes(ref, uploadFile, { contentType: uploadFile.type });
    pendingTemplateImageUrl = await getDownloadURL(ref);
    if (templateImagePreview) {
      templateImagePreview.src = pendingTemplateImageUrl;
      templateImagePreview.classList.remove("hidden");
    }
    if (templateImageStatus) templateImageStatus.textContent = "Uploaded (1 ?? on save).";
    pendingTemplateNugget = true;
  } catch (e) {
    console.error("Template image upload:", e);
    if (templateImageStatus) templateImageStatus.textContent = "Upload failed.";
  }
});

btnCharacterProfiles?.addEventListener("click", () => {
  showOnly(SCREEN_KEYS.CHARACTER_TEMPLATES);
  renderTemplateList();
});
btnBackFromTemplates?.addEventListener("click", () => showOnly(SCREEN_KEYS.SETTINGS));

btnCreateTemplate?.addEventListener("click", () => {
  editingTemplateId = null;
  pendingTemplateImageUrl = null;
  pendingTemplateNugget = false;
  if (templateModalTitle) templateModalTitle.textContent = "New Premade Profile";
  if (templateName) templateName.value = "";
  if (templateBio) templateBio.value = "";
  if (templateImagePreview) { templateImagePreview.src = ""; templateImagePreview.classList.add("hidden"); }
  if (templateImageStatus) templateImageStatus.textContent = "";
  if (templateImage) templateImage.value = "";
  PROFILE_STAT_KEYS.forEach(k => {
    const el = $(`tplStat${k.charAt(0).toUpperCase() + k.slice(1)}`);
    if (el) el.value = "";
  });
  if (createTemplateModal) animateModalIn(createTemplateModal);
});

btnCloseTemplateModal?.addEventListener("click", () => {
  pendingTemplateNugget = false;
  if (createTemplateModal) animateModalOut(createTemplateModal);
});
btnCancelTemplate?.addEventListener("click", () => {
  pendingTemplateNugget = false;
  if (createTemplateModal) animateModalOut(createTemplateModal);
});

btnSaveTemplate?.addEventListener("click", async () => {
  if (!state.sessionId) return;
  const name = templateName?.value?.trim();
  if (!name) { showToast("Character name is required.", "error"); return; }

  if (pendingTemplateNugget) {
    const ok = await spendNuggetWithFeedback("character image");
    if (!ok) return;
    pendingTemplateNugget = false;
  }

  const bio = templateBio?.value?.trim() || "";
  const stats = {};
  PROFILE_STAT_KEYS.forEach(k => {
    const el = $(`tplStat${k.charAt(0).toUpperCase() + k.slice(1)}`);
    const val = el?.value?.trim();
    if (val) stats[k] = isNaN(Number(val)) ? val : Number(val);
  });
  const payload = { name, bio, quickStats: stats, updatedAt: serverTimestamp() };
  if (pendingTemplateImageUrl) payload.imageUrl = pendingTemplateImageUrl;
  try {
    if (editingTemplateId) {
      await updateDoc(doc(db, "sessions", state.sessionId, "characterTemplates", editingTemplateId), payload);
    } else {
      payload.assignedToUid = null;
      payload.assignmentStatus = "unassigned";
      payload.createdAt = serverTimestamp();
      await addDoc(collection(db, "sessions", state.sessionId, "characterTemplates"), payload);
    }
    if (createTemplateModal) animateModalOut(createTemplateModal);
    showToast(editingTemplateId ? "Profile updated." : "Premade profile created!", "info");
    renderTemplateList();
  } catch (e) {
    console.error("saveTemplate:", e);
    showToast("Failed to save profile.", "error");
  }
});

async function renderTemplateList() {
  if (!templateList || !templateEmpty || !state.sessionId) return;
  try {
    const snap = await getDocs(query(collection(db, "sessions", state.sessionId, "characterTemplates"), orderBy("createdAt", "desc")));
    const templates = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    templateList.innerHTML = "";
    if (templates.length === 0) {
      templateEmpty.classList.remove("hidden");
      return;
    }
    templateEmpty.classList.add("hidden");
    const players = (state.activePlayers || []).filter(p => (p.id || p.uid) !== state.uid);

    templates.forEach(t => {
      const card = document.createElement("div");
      card.className = "templateCard item item--clickable";

      // Status badge
      const statusBadgeCls = t.assignmentStatus === "accepted" ? "templateCard__badge templateCard__badge--accepted"
        : t.assignmentStatus === "rejected" ? "templateCard__badge templateCard__badge--rejected"
        : t.assignmentStatus === "pending" ? "templateCard__badge templateCard__badge--pending"
        : "templateCard__badge";
      const statusIcon = t.assignmentStatus === "accepted"
        ? `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style="width:11px;height:11px;flex-shrink:0"><path d="M4.5 12.75l6 6 9-13.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
        : t.assignmentStatus === "rejected"
        ? `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style="width:11px;height:11px;flex-shrink:0"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`
        : t.assignmentStatus === "pending"
        ? `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style="width:11px;height:11px;flex-shrink:0"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style="width:11px;height:11px;flex-shrink:0"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" stroke-dasharray="3 3"/></svg>`;
      const statusLabel = t.assignmentStatus === "accepted" ? "Accepted"
        : t.assignmentStatus === "rejected" ? "Rejected"
        : t.assignmentStatus === "pending" ? "Pending"
        : "Unassigned";

      // Avatar
      const initial = escapeHtml((t.name || "?").trim().charAt(0).toUpperCase());
      const avatarHtml = t.imageUrl
        ? `<img class="templateCard__avatar" src="${escapeHtml(t.imageUrl)}" alt="${escapeHtml(t.name)}" loading="lazy">`
        : `<div class="templateCard__avatar templateCard__avatar--initials" aria-hidden="true">${initial}</div>`;

      card.innerHTML = `
        ${avatarHtml}
        <div class="templateCard__body">
          <div class="templateCard__titleRow">
            <strong class="templateCard__name">${escapeHtml(t.name)}</strong>
            <span class="${statusBadgeCls}">${statusIcon}${statusLabel}</span>
          </div>
          <p class="templateCard__bio muted small">${escapeHtml(t.bio || "")}</p>
        </div>
        <div class="templateActions">
          <button class="btn btn--small btn--ghost tpl-edit templateActionBtn" type="button" aria-label="Edit premade profile" title="Edit">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M16.862 4.487a2.25 2.25 0 1 1 3.182 3.182L9.75 17.963 6 18.75l.787-3.75L16.862 4.487Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button class="btn btn--small btn--ghost tpl-assign templateActionBtn" type="button" ${t.assignmentStatus === "accepted" ? "disabled" : ""} aria-label="Assign to player" title="Assign to player">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="currentColor"/></svg>
          </button>
          <button class="btn btn--small btn--ghost tpl-qr templateActionBtn" type="button" ${t.assignedToUid ? "disabled" : ""} aria-label="Share via QR code" title="Share via QR code">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1.2" stroke="currentColor" stroke-width="1.8"/><rect x="14" y="4" width="6" height="6" rx="1.2" stroke="currentColor" stroke-width="1.8"/><rect x="4" y="14" width="6" height="6" rx="1.2" stroke="currentColor" stroke-width="1.8"/><path d="M15 14h2v2h-2v-2Zm3 0h2v4h-2v-4Zm-3 3h2v3h-2v-3Z" fill="currentColor"/></svg>
          </button>
          <button class="btn btn--small btn--danger tpl-delete templateActionBtn" type="button" aria-label="Delete premade profile" title="Delete profile">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 4h6m-9 3h12m-9 0v11a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      `;

      // Edit
      card.querySelector(".tpl-edit")?.addEventListener("click", (e) => {
        e.stopPropagation();
        editingTemplateId = t.id;
        pendingTemplateImageUrl = t.imageUrl || null;
        if (templateModalTitle) templateModalTitle.textContent = "Edit Premade Profile";
        if (templateName) templateName.value = t.name || "";
        if (templateBio) templateBio.value = t.bio || "";
        if (templateImagePreview) {
          if (t.imageUrl) { templateImagePreview.src = t.imageUrl; templateImagePreview.classList.remove("hidden"); }
          else { templateImagePreview.src = ""; templateImagePreview.classList.add("hidden"); }
        }
        if (templateImageStatus) templateImageStatus.textContent = "";
        if (templateImage) templateImage.value = "";
        PROFILE_STAT_KEYS.forEach(k => {
          const el = $(`tplStat${k.charAt(0).toUpperCase() + k.slice(1)}`);
          if (el) el.value = t.quickStats?.[k] ?? "";
        });
        if (createTemplateModal) animateModalIn(createTemplateModal);
      });

      // Assign
      card.querySelector(".tpl-assign")?.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (players.length === 0) { showToast("No players in session.", "error"); return; }
        const choice = await openPlayerPicker({
          title: `Assign \"${t.name}\"`,
          players,
          submitLabel: "Assign",
          requirePin: false,
        });
        if (!choice) return;
        const targetUid = choice.uid;
        const targetPlayer = players.find((p) => (p.id || p.uid) === targetUid);
        const targetName = targetPlayer?.nickname || getOwnerNick(targetUid) || targetUid;
        try {
          await updateDoc(doc(db, "sessions", state.sessionId, "characterTemplates", t.id), {
            assignedToUid: targetUid,
            assignmentStatus: "pending"
          });
          await createNotification(targetUid, "profileOffer", `The DM created a character for you: ${t.name}`, {
            templateId: t.id, name: t.name, bio: t.bio, ...t.quickStats
          });
          showToast(`Profile sent to ${targetName}.`, "info");
          renderTemplateList();
        } catch (err) {
          console.error("assignTemplate:", err);
          showToast("Failed to assign template.", "error");
        }
      });

      // QR code
      card.querySelector(".tpl-qr")?.addEventListener("click", (e) => {
        e.stopPropagation();
        if (typeof QRCode === "undefined") { showToast("QR library not loaded.", "error"); return; }
        const pinPart = state.dmPinPlain ? `&pin=${encodeURIComponent(state.dmPinPlain)}` : "";
        const url = `${location.origin}${location.pathname}?join=${encodeURIComponent(state.joinTag || state.sessionId)}${pinPart}&template=${encodeURIComponent(t.id)}`;
        const container = document.createElement("div");
        container.style.cssText = "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center";
        container.className = "modal";
        const inner = document.createElement("div");
        inner.style.cssText = "background:var(--card);padding:24px;border-radius:var(--radius-sm);text-align:center";
        inner.innerHTML = `<p style="margin-bottom:8px;color:var(--text)"><strong>${escapeHtml(t.name)}</strong></p>`;
        const qrDiv = document.createElement("div");
        inner.appendChild(qrDiv);
        const closeBtn = document.createElement("button");
        closeBtn.textContent = "Close";
        closeBtn.className = "btn btn--small";
        closeBtn.style.marginTop = "12px";
        closeBtn.addEventListener("click", () => container.remove());
        inner.appendChild(closeBtn);
        container.appendChild(inner);
        container.addEventListener("click", (ev) => { if (ev.target === container) container.remove(); });
        document.body.appendChild(container);
        new QRCode(qrDiv, { text: url, width: 200, height: 200 });
      });

      // Delete
      card.querySelector(".tpl-delete")?.addEventListener("click", (e) => {
        e.stopPropagation();
        showUndoToast(`Delete "${t.name}"?`, async () => {
          try {
            await deleteDoc(doc(db, "sessions", state.sessionId, "characterTemplates", t.id));
            renderTemplateList();
          } catch (err) { showToast("Failed to delete template.", "error"); }
        });
      });

      templateList.appendChild(card);
    });
  } catch (e) {
    console.error("renderTemplateList:", e);
  }
}

// Player accepts profile offer
btnAcceptProfile?.addEventListener("click", async () => {
  const profileNotif = notifItems.find(n => n.type === "profileOffer" && !n.read);
  if (!profileNotif || !state.sessionId || !state.uid) return;
  const p = profileNotif.payload || {};
  try {
    // Update player's global profile with template data
    const profileData = {};
    if (p.name) profileData.displayName = p.name;
    if (p.bio) profileData.bio = p.bio;
    PROFILE_STAT_KEYS.forEach(k => { if (p[k] != null) profileData[k] = p[k]; });
    if (Object.keys(profileData).length > 0) {
      await setDoc(doc(db, "users", state.uid), profileData, { merge: true });
    }

    let templateId = String(p.templateId || "").trim();
    if (!templateId) {
      const pendingForPlayer = await getDocs(query(
        collection(db, "sessions", state.sessionId, "characterTemplates"),
        where("assignedToUid", "==", state.uid),
        where("assignmentStatus", "==", "pending"),
        limit(1)
      ));
      if (!pendingForPlayer.empty) templateId = pendingForPlayer.docs[0].id;
    }

    // Update template status
    if (templateId) {
      await updateDoc(doc(db, "sessions", state.sessionId, "characterTemplates", templateId), {
        assignmentStatus: "accepted"
      });
    }
    await markNotifRead(profileNotif.id);
    animateModalOut(profileOfferModal);
    showToast("Character profile applied!", "info");
  } catch (e) {
    console.error("acceptProfile:", e);
    showToast("Failed to apply profile.", "error");
  }
});

btnRejectProfile?.addEventListener("click", async () => {
  const profileNotif = notifItems.find(n => n.type === "profileOffer" && !n.read);
  if (!profileNotif || !state.sessionId) return;
  const p = profileNotif.payload || {};
  try {
    let templateId = String(p.templateId || "").trim();
    if (!templateId && state.uid) {
      const pendingForPlayer = await getDocs(query(
        collection(db, "sessions", state.sessionId, "characterTemplates"),
        where("assignedToUid", "==", state.uid),
        where("assignmentStatus", "==", "pending"),
        limit(1)
      ));
      if (!pendingForPlayer.empty) templateId = pendingForPlayer.docs[0].id;
    }

    if (templateId) {
      await updateDoc(doc(db, "sessions", state.sessionId, "characterTemplates", templateId), {
        assignmentStatus: "rejected"
      });
    }
    await markNotifRead(profileNotif.id);
    animateModalOut(profileOfferModal);
    showToast("Profile rejected.", "info");
  } catch (e) { console.warn("rejectProfile:", e); }
});

// -- Inventory search/filter --
let inventorySearchQuery = "";
inventorySearch?.addEventListener("input", debounce(() => {
  inventorySearchQuery = (inventorySearch.value || "").trim().toLowerCase();
  renderInventoryScreen();
}, 250));

// -- Session notes (local autosave + manual undo) --
const NOTES_HISTORY_LIMIT = 60;
let notesHistory = [];
let notesAutosaveTimer = null;
let notesLastValue = "";

function getNotesStorageKey() {
  const sid = String(state.sessionId || "").trim();
  const uid = String(state.uid || "guest").trim();
  return sid ? `tv_notes_${sid}_${uid}` : "";
}

function loadNotesForCurrentSession() {
  const key = getNotesStorageKey();
  if (!notesEditor) return;
  const value = key ? (localStorage.getItem(key) || "") : "";
  notesEditor.value = value;
  notesHistory = [];
  notesLastValue = value;
  btnNotesUndo && (btnNotesUndo.disabled = true);
  if (notesStatus) notesStatus.textContent = key ? "Tap Save to store your notes." : "Join a session to save notes.";
}

function saveNotesNow(showSavedState = false) {
  const key = getNotesStorageKey();
  if (!notesEditor || !key) return;
  const text = notesEditor.value || "";
  localStorage.setItem(key, text);
  notesLastValue = text;
  if (showSavedState && notesStatus) {
    notesStatus.textContent = "Saved ?";
    setTimeout(() => {
      if (notesStatus) notesStatus.textContent = "Tap Save to store your notes.";
    }, 1500);
  }
}

notesEditor?.addEventListener("input", () => {
  const current = notesEditor.value || "";
  if (current !== notesLastValue) {
    notesHistory.push(notesLastValue);
    if (notesHistory.length > NOTES_HISTORY_LIMIT) notesHistory.shift();
    btnNotesUndo && (btnNotesUndo.disabled = notesHistory.length === 0);
  }
  if (notesStatus) notesStatus.textContent = "Unsaved changes";
});

btnNotesUndo?.addEventListener("click", () => {
  if (!notesEditor || notesHistory.length === 0) return;
  const previous = notesHistory.pop();
  notesEditor.value = previous || "";
  btnNotesUndo && (btnNotesUndo.disabled = notesHistory.length === 0);
  if (notesStatus) notesStatus.textContent = "Unsaved changes";
});

// Manual save button
const btnNotesSave = $("btnNotesSave");
btnNotesSave?.addEventListener("click", () => {
  saveNotesNow(true);
  setTimeout(() => showOnly(getDefaultRoleScreen()), 400);
});

btnNotesBack && (btnNotesBack.onclick = () => {
  const backScreen = state.role === "dm" ? "dmDash" : "plView";
  showOnly(backScreen);
});

// -- Tooltip onboarding for first-time users --
function buildOnboardSteps() {
  const isGM = state.role === "dm";
  return [
    {
      title: "Welcome to TomeVault! 🎲",
      text: isGM
        ? "You're the Game Master. This quick tour covers your dashboard. Interact with the highlighted buttons when asked — they do the real thing!"
        : "Welcome, adventurer! This quick tour covers your TomeVault basics. Tap the highlighted buttons when asked — they do the real thing!",
    },
    isGM ? {
      title: "Session Info — tap Social",
      target: "btnOpenSocialFromParty",
      tap: true,
      tutorialPlacement: "top-third",
      text: "Tap Social to open the invite panel where your Join Tag, PIN, and QR live.",
    } : {
      title: "Handouts from your GM",
      target: "screenPlayerView",
      text: "Your Game Master shares handouts here in real time — maps, clues, loot, and story reveals appear the moment they're shared.",
    },
    isGM ? {
      title: "Session Info + QR",
      target: "dmSocialPanel",
      text: "Your Join Tag and optional PIN let players connect. Share the QR code or copy the join link to invite your table.",
    } : null,
    isGM ? {
      title: "Handouts Panel",
      target: "dmHandoutsPanel",
      text: "Create and organise handouts by category: Loot, NPC, Clue, Letter, Quest, and Map. Players see new handouts the instant you create them.",
    } : null,
    isGM ? {
      title: "Filters",
      target: "dmFilterRow",
      text: "Use filters to quickly focus your handout types during play.",
    } : null,
    isGM ? {
      title: "The Party",
      target: "dmPartyPanel",
      text: "See who's online, roll dice for the whole table, toggle Battle Mode for turn-order encounters, and invite more players with a single tap.",
    } : null,
    {
      title: "Notifications — tap the bell",
      target: "btnNotifBell",
      tap: true,
      text: "The bell lights up when something happens. Tap it now — handout reveals, coin grants, and profile offers all arrive here.",
    },
    {
      title: "Music & Ambience — tap Music",
      target: "btnOpenAmbienceBar",
      tap: true,
      tutorialPlacement: "top-third",
      text: "Set the mood with soundscapes your whole table hears in sync. Changes apply instantly to every connected player. Tap Music now!",
    },
    {
      title: "Ambience Controls",
      target: "ambienceBar",
      delay: 420,
      tutorialPlacement: "top-third",
      text: "Pick a track from the dropdown, adjust the volume slider, and hit ▶ Play. The GM controls audio for the entire session.",
    },
    {
      title: isGM ? "Your DM Profile — tap Profile" : "Your Character — tap Profile",
      target: "btnOpenProfile",
      tap: true,
      tutorialPlacement: "top-third",
      text: isGM
        ? "Access your DM profile, campaign notes, and premade character templates. Tap Profile now!"
        : "Edit your character name, avatar, stats, and spell list. Tap Profile now!",
    },
    {
      title: isGM ? "DM Profile" : "Character Profile",
      target: "screenProfile",
      delay: 420,
      text: isGM
        ? "Manage your DM identity and avatar. Nuggets (🪙) are earned through play and let you save a profile picture."
        : "Your character sheet lives here. Tap Edit to update stats, add spells, or upload a profile picture using Nuggets.",
    },
    {
      title: "Inventory — tap to open",
      target: "btnOpenInventory",
      tap: true,
      tutorialPlacement: "top-third",
      text: "Track coin pouches across four denominations per player. The GM can grant coins and loot directly from here. Tap Inventory!",
    },
    {
      title: "Session Notes — tap to open",
      target: "btnOpenNotes",
      tap: true,
      tutorialPlacement: "top-third",
      text: "Private notes only you can see, saved per session. Includes Undo support. Tap Notes now!",
    },
    {
      title: "Settings — tap to open",
      target: "btnHamburger",
      tap: true,
      tutorialPlacement: "top-third",
      text: "Switch roles, change the light/dark theme, replay this tour, and access advanced options. Tap it now!",
    },
    {
      title: "You're all set! 🎲",
      returnTo: isGM ? "dmDash" : "plView",
      text: isGM
        ? "Jump in! Use the + button to create your first handout — your players will see it in seconds."
        : "You're ready! Browse GM handouts, check your inventory, and enjoy the session.",
    },
  ].filter(Boolean);
}

function completeOnboarding() {
  const roleKey = normalizeProfileRole(state.role || "player");
  localStorage.setItem(`tv_onboarded:${roleKey}`, "1");
  localStorage.removeItem(`tv_onboardingReplay:${roleKey}`);
}

function startOnboarding(options = {}) {
  const force = !!options.force;
  const roleKey = normalizeProfileRole(state.role || "player");
  const legacyCompleted = localStorage.getItem("tv_onboarded") === "1";
  if (legacyCompleted && !localStorage.getItem(`tv_onboarded:${roleKey}`)) {
    localStorage.setItem(`tv_onboarded:${roleKey}`, "1");
  }
  if (!force && localStorage.getItem(`tv_onboarded:${roleKey}`)) return;
  const STEPS = buildOnboardSteps();
  let step = 0;
  const overlay = document.createElement("div");
  overlay.className = "onboardOverlay";
  let activeTarget = null;
  let targetCleanup = null;
  const originalFabPos = {
    right: btnHamburger?.style.right || "",
    bottom: btnHamburger?.style.bottom || "",
  };

  if (btnHamburger) {
    // Keep FAB stable during tutorial so spotlight doesn't jump to user-saved drag positions.
    btnHamburger.style.right = "20px";
    btnHamburger.style.bottom = "92px";
  }

  function clearActiveTarget() {
    if (activeTarget) {
      activeTarget.classList.remove("onboard-target-active");
      activeTarget.style.removeProperty("z-index");
    }
    if (targetCleanup) { targetCleanup(); targetCleanup = null; }
    activeTarget = null;
  }

  function advance() {
    clearActiveTarget();
    step++;
    const next = STEPS[step];
    if (next && next.delay) {
      setTimeout(showStep, next.delay);
    } else {
      showStep();
    }
  }

  function showStep() {
    if (step >= STEPS.length) {
      clearActiveTarget();
      if (btnHamburger) {
        btnHamburger.style.right = originalFabPos.right;
        btnHamburger.style.bottom = originalFabPos.bottom;
      }
      overlay.remove();
      completeOnboarding();
      return;
    }
    const s = STEPS[step];

    if (s?.returnTo) {
      if (s.returnTo === SCREEN_KEYS.DM_DASH) {
        showOnly(SCREEN_KEYS.DM_DASH);
        try { setDMSocialMode(false); } catch (_) {}
      } else if (s.returnTo === SCREEN_KEYS.PLAYER_VIEW) {
        showOnly(SCREEN_KEYS.PLAYER_VIEW);
      }
    }

    const el = $(s.target);
    overlay.innerHTML = "";

    if (el) {
      const rect = el.getBoundingClientRect();
      const pad = 8;
      const spot = document.createElement("div");
      spot.className = "onboardSpotlight";
      spot.style.cssText = `top:${rect.top - pad}px;left:${rect.left - pad}px;width:${rect.width + pad * 2}px;height:${rect.height + pad * 2}px`;
      overlay.appendChild(spot);

      if (s.tap) {
        activeTarget = el;
        el.classList.add("onboard-target-active");
        el.style.zIndex = "8003";
        // Allow the real action to fire — just call advance() alongside it
        const handler = () => { advance(); };
        el.addEventListener("click", handler, { once: true });
        targetCleanup = () => { el.style.removeProperty("z-index"); };
      }
    }

    const tip = document.createElement("div");
    tip.className = "onboardTooltip";
    const isTap = s.tap && el;
    const isLast = step >= STEPS.length - 1;
    tip.innerHTML = `
      ${s.title ? `<div class="onboardTooltip__title">${escapeHtml(s.title)}</div>` : ""}
      <div class="onboardTooltip__text">${escapeHtml(s.text)}</div>
      ${isTap ? `<div class="onboardTooltip__tapHint"><span>👆</span><span>Tap the highlighted button to continue</span></div>` : ""}
      <div class="onboardTooltip__actions">
        <button class="onboard-skip" type="button" aria-label="Skip tutorial">Skip</button>
        ${!isTap ? `<button class="btn btn--small onboard-next" type="button">${isLast ? "Done" : "Next →"}</button>` : ""}
      </div>
      <div class="onboardTooltip__step">${step + 1} / ${STEPS.length}</div>
    `;
    tip.querySelector(".onboard-skip")?.addEventListener("click", () => {
      clearActiveTarget();
      if (btnHamburger) {
        btnHamburger.style.right = originalFabPos.right;
        btnHamburger.style.bottom = originalFabPos.bottom;
      }
      overlay.remove();
      completeOnboarding();
    });
    tip.querySelector(".onboard-next")?.addEventListener("click", () => advance());

    // Adaptive positioning to keep tap targets unobstructed on phone + desktop.
    if (el) {
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isMobile = vw <= 768;
      const margin = isMobile ? 12 : 16;
      const gap = isTap ? 22 : 12;

      tip.style.left = "0";
      tip.style.top = "0";
      tip.style.right = "auto";
      tip.style.bottom = "auto";
      tip.style.transform = "none";

      const maxWidthPx = Math.max(260, Math.min(420, vw - margin * 2));
      tip.style.maxWidth = `${maxWidthPx}px`;
      const tipWidth = Math.min(maxWidthPx, tip.offsetWidth || maxWidthPx);
      const tipHeight = tip.offsetHeight || 220;

      const spaceAbove = rect.top;
      const spaceBelow = vh - rect.bottom;
      const forceTopThird = s?.tutorialPlacement === "top-third";

      // Prefer above for tap steps in lower viewport (e.g. hamburger), else choose side with more room.
      const placeAbove = forceTopThird
        ? true
        : isTap
        ? (spaceAbove >= tipHeight + gap || rect.top > vh * 0.45)
        : (spaceBelow < tipHeight + gap && spaceAbove > spaceBelow);

      const anchorCenterX = rect.left + rect.width / 2;
      let left = anchorCenterX - tipWidth / 2;
      left = Math.max(margin, Math.min(vw - tipWidth - margin, left));

      let top;
      if (forceTopThird) {
        top = Math.round(vh * (isMobile ? 0.14 : 0.18));
      } else if (placeAbove) {
        top = rect.top - tipHeight - gap;
      } else {
        top = rect.bottom + gap;
      }

      // Keep tooltip fully on-screen, and prioritize higher placement on cramped screens.
      top = Math.max(margin, Math.min(vh - tipHeight - margin, top));
      if (isTap && !placeAbove && rect.bottom + gap + tipHeight > vh - margin) {
        top = Math.max(margin, rect.top - tipHeight - gap);
      }

      tip.style.left = `${left}px`;
      tip.style.top = `${top}px`;
    } else {
      tip.classList.add("onboardTooltip--center");
    }
    overlay.appendChild(tip);
  }

  document.body.appendChild(overlay);
  showStep();
}

// -- Virtual scrolling helper --
// Activates only when a list container has > 50 children. Uses IntersectionObserver
// to hide off-screen items and reserve their space, reducing DOM paint cost.
function initVirtualScroll(container, itemHeight = 72) {
  if (!container || container.children.length <= 50) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const el = entry.target;
      if (entry.isIntersecting) {
        el.style.visibility = "visible";
        el.style.contentVisibility = "visible";
      } else {
        el.style.visibility = "hidden";
        el.style.contentVisibility = "hidden";
      }
    });
  }, { root: container, rootMargin: "200px 0px" });
  Array.from(container.children).forEach(child => {
    child.style.minHeight = `${itemHeight}px`;
    observer.observe(child);
  });
  container._virtualObserver = observer;
}

// -- Drag-and-drop with Sortable.js --
let dmHandoutSortable = null;
let inventorySortables = [];

function initDragDrop() {
  if (typeof Sortable === "undefined") return;

  // GM handout list
  const dmList = $("dmHandoutList");
  if (dmList && state.role === "dm" && !dmHandoutSortable) {
    dmHandoutSortable = new Sortable(dmList, {
      animation: 150,
      handle: ".item",
      ghostClass: "item--dragging",
      onEnd: async (evt) => {
        if (!state.sessionId) return;
        const items = Array.from(dmList.children);
        const batch = [];
        items.forEach((el, i) => {
          const id = el.dataset.id;
          if (id) batch.push(updateDoc(doc(db, "sessions", state.sessionId, "handouts", id), { sortOrder: i }));
        });
        try { await Promise.all(batch); } catch (e) { console.warn("sortOrder update:", e); }
      }
    });
  }
}

// -- Modal animation helpers --
function pulseCopiedFeedback(...elements) {
  // Subtle visual confirmation on copy actions without adding extra noise.
  elements.filter(Boolean).forEach((el) => {
    el.classList.remove("is-copied");
    // Restart CSS animation on repeated fast clicks.
    void el.offsetWidth;
    el.classList.add("is-copied");
    setTimeout(() => el.classList.remove("is-copied"), 360);
  });
}

// -- Skeleton loading placeholders --
// Show shimmering fake cards while Firestore data is in transit.
// The first real render call (renderDMHandouts / renderPlayerHandouts / etc.)
// will do `container.innerHTML = ""` which clears the skeletons.
function showSkeletonCards(container, count = 3) {
  if (!container) return;
  container.innerHTML = Array.from({ length: count },
    () => '<div class="skeleton skeleton--card" aria-hidden="true"></div>'
  ).join("");
}

async function sha256(text) {
  // Converts plain pincode to SHA-256 digest so we compare hashes, not raw PIN.
  // This is stronger than storing pinPlain in Firestore documents.
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function cleanupListeners() {
  // Realtime listeners keep connections open.
  // Before switching context/session, always unsubscribe old listeners to avoid:
  // - duplicate renders
  // - memory leaks
  // - stale updates from previous screens
  if (state.unsubSession) state.unsubSession();
  if (state.unsubHandouts) state.unsubHandouts();
  if (state.unsubPlayers) state.unsubPlayers();
  if (state.unsubInventory) state.unsubInventory();
  if (state.unsubWallets) state.unsubWallets();
  if (state.unsubNotifications) state.unsubNotifications();
  if (state.unsubTransfer) state.unsubTransfer();
  if (state.unsubNuggets) state.unsubNuggets();
  if (state.unsubTemplateAssignments) state.unsubTemplateAssignments();
  state.unsubSession = null;
  state.unsubHandouts = null;
  state.unsubPlayers = null;
  state.unsubInventory = null;
  state.unsubWallets = null;
  state.unsubNotifications = null;
  state.unsubTransfer = null;
  state.unsubNuggets = null;
  state.unsubTemplateAssignments = null;
  notifItems = [];
  updateNotifBadge();
  if (notifPanel) {
    notifPanel.classList.add("hidden");
    notifPanel.setAttribute("aria-hidden", "true");
  }
  dmSeenHumanPlayerIdsForJoinNotifs = null;
  dmTemplateStatusSnapshot = null;
}

function leaveCurrentSessionLocally(message, tone = "info") {
  releaseWakeLock();
  cleanupListeners();
  stopHeartbeat();
  state.role = null;
  state.sessionId = null;
  state.joinTag = null;
  state.sessionName = "";
  state.dmPinPlain = null;
  state.joinLink = null;
  state.dmHandoutsRaw = [];
  state.playerInventoryRaw = [];
  state.activePlayers = [];
  state.partyRoster = [];
  state.battleActive = false;
  state.dmUid = null;
  state.currentTurnUid = null;
  state.turnRound = 1;
  state.inventoryItems = [];
  state.wallets = {};
  localStorage.removeItem("tv_role");
  localStorage.removeItem("tv_sessionId");
  localStorage.removeItem("tv_joinTag");
  localStorage.removeItem("tv_dmPin");
  showOnly(SCREEN_KEYS.LANDING);
  loadMySessions();
  if (message) showToast(message, tone);
}

function persistLocal() {
  // localStorage keeps tiny pieces of state across refreshes.
  // This gives an app-like "resume where I left off" experience.
  localStorage.setItem("tv_role", state.role ?? "");
  localStorage.setItem("tv_sessionId", state.sessionId ?? "");
  localStorage.setItem("tv_joinTag", state.joinTag ?? "");
  if (plNick?.value?.trim()) localStorage.setItem("tv_nick", plNick.value.trim());
  if (state.playerNick?.trim()) localStorage.setItem("tv_nick", state.playerNick.trim());
  if (state.role === "dm" && state.dmPinPlain) localStorage.setItem("tv_dmPin", state.dmPinPlain);
  if (state.role === "dm" && state.sessionId) localStorage.setItem("tv_lastDmSessionId", state.sessionId);
}

function loadLocal() {
  // Reads previously persisted state and pre-fills form inputs.
  // This reduces friction for users re-opening the app.
  const r = localStorage.getItem("tv_role") || "";
  const s = localStorage.getItem("tv_sessionId") || "";
  const t = localStorage.getItem("tv_joinTag") || "";
  const n = localStorage.getItem("tv_nick") || "";
  const dm = localStorage.getItem("tv_lastDmSessionId") || "";

  if (plNick && n) plNick.value = n;
  if (plSessionId && (t || s)) plSessionId.value = t || s;
  state.playerNick = n;

  return { r, s, t, dm };
}

function slugifySessionName(name) {
  const trimmed = String(name || "").trim().slice(0, LIMITS.SESSION_NAME_MAX);
  const base = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, LIMITS.SESSION_SLUG_MAX)
    .replace(/^-+|-+$/g, "");
  return base || "session";
}

function normalizeJoinTagInput(value) {
  let normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
  normalized = normalized.replace(/-([0-9]{4,8})$/, "#$1");
  return normalized;
}

function toSafeJoinTagForLink(value) {
  return normalizeJoinTagInput(value).replace(/#([0-9]{4,8})$/, "-$1");
}

function toLegacyHashJoinTag(value) {
  return normalizeJoinTagInput(value).replace(/-([0-9]{4,8})$/, "#$1");
}

function getJoinTagLookupVariants(value) {
  const normalized = normalizeJoinTagInput(value);
  if (!normalized) return [];
  return Array.from(new Set([
    normalized,
    toSafeJoinTagForLink(normalized),
    toLegacyHashJoinTag(normalized),
  ].filter(Boolean)));
}

function buildSessionJoinLink(joinTagRaw) {
  const safeJoinTag = toSafeJoinTagForLink(joinTagRaw);
  if (!safeJoinTag) return `${location.origin}${location.pathname}`;
  return `${location.origin}${location.pathname}?join=${encodeURIComponent(safeJoinTag)}`;
}

function parseInviteUrlFields(urlLike) {
  const u = (urlLike instanceof URL) ? urlLike : new URL(String(urlLike || ""), location.href);
  let join = normalizeJoinTagInput(u.searchParams.get("join") || "");
  const pin = String(u.searchParams.get("pin") || "").trim();
  const templateId = String(u.searchParams.get("template") || "").trim();
  const hashCode = String(u.hash || "").replace(/^#/, "").trim();

  // Some chat apps decode `%23` and treat it as fragment (`#1234`). Recover it.
  if (join && hashCode && /^\d{4,8}$/.test(hashCode) && !/[#-]\d{4,8}$/.test(join)) {
    join = `${join}#${hashCode}`;
  }

  return {
    join,
    pin,
    templateId: templateId || null,
  };
}

async function generateUniqueJoinTag(sessionName) {
  const base = slugifySessionName(sessionName);
  const sessionsRef = collection(db, "sessions");

  for (let i = 0; i < 30; i++) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const candidate = `${base}#${code}`;
    const safeCandidate = toSafeJoinTagForLink(candidate);
    const [hashSnap, safeSnap] = await Promise.all([
      getDocs(query(sessionsRef, where("joinTag", "==", candidate))),
      getDocs(query(sessionsRef, where("joinTag", "==", safeCandidate))),
    ]);
    if (hashSnap.empty && safeSnap.empty) return candidate;
  }

  // Very rare fallback if collisions happen repeatedly.
  const fallback = `${base}#${String(Date.now()).slice(-4)}`;
  return fallback;
}

async function hydrateJoinSessionPreview(joinTagRaw) {
  const variants = getJoinTagLookupVariants(joinTagRaw);
  if (!variants.length) return null;

  try {
    let sessionDoc = null;

    for (const candidate of variants) {
      const byTag = await getDocs(query(collection(db, "sessions"), where("joinTag", "==", candidate)));
      if (!byTag.empty) {
        sessionDoc = byTag.docs[0];
        break;
      }
    }

    if (!sessionDoc) {
      for (const candidate of variants) {
        const byId = await getDoc(doc(db, "sessions", candidate));
        if (byId.exists()) {
          sessionDoc = byId;
          break;
        }
      }
    }

    if (!sessionDoc) return null;

    const sessionData = sessionDoc.data() || {};
    state.sessionId = sessionDoc.id;
    state.joinTag = String(sessionData.joinTag || toLegacyHashJoinTag(variants[0]) || variants[0]).trim();
    state.joinLink = buildSessionJoinLink(state.joinTag);
    state.sessionName = String(sessionData.name || "").trim();
    setLiveTick();

    if (plJoinMsg && state.sessionName) {
      plJoinMsg.textContent = `Session found: ${state.sessionName}. Enter your name and PIN.`;
    }

    return {
      sessionId: sessionDoc.id,
      sessionName: state.sessionName,
      joinTag: state.joinTag,
    };
  } catch (err) {
    console.warn("Join preview lookup failed:", err);
    return null;
  }
}

function parseJoinParam() {
  // QR codes open a URL like ?join=<joinTag>&pin=<pin>&template=<templateId>.
  // This helper extracts those parameters so the player join screen is pre-filled.
  const u = new URL(location.href);
  const { join, pin, templateId } = parseInviteUrlFields(u);
  if (join && plSessionId) {
    plSessionId.value = join;
    void hydrateJoinSessionPreview(join);
    if (pin && plPin) plPin.value = pin;
    // Store template for auto-apply after joining
    if (templateId) state._pendingTemplateId = templateId;
    // Clean URL so pin isn't visible in browser bar
    u.searchParams.delete("pin");
    u.searchParams.delete("template");
    window.history.replaceState({}, "", u.toString());
    return { join, pin: pin || "", templateId: templateId || null };
  }
  return null;
}

function getGuestNicknameFallback() {
  const uidSuffix = String(state.uid || "").replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase();
  const suffix = uidSuffix || String(Math.floor(1000 + Math.random() * 9000));
  return `Traveler-${suffix}`;
}

async function tryAutoJoinFromDeepLink(joinFromUrl) {
  if (!joinFromUrl?.join || !plSessionId || !plPin) return false;
  const pin = String(plPin.value || "").trim();
  if (!/^\d{4,8}$/.test(pin)) return false;

  // Use a temporary fallback name so deep links can join instantly.
  const existingNick = getPlayerNickname();
  const hadNickname = !!existingNick;
  const nick = existingNick || getGuestNicknameFallback();
  if (plNick && !String(plNick.value || "").trim()) plNick.value = nick;

  const ok = await joinPlayerSession(plSessionId.value, nick, pin);
  if (ok && !hadNickname) {
    await requireNickname({ forcePrompt: true });
  }
  return !!ok;
}

function getPlayerNickname() {
  // Centralized nickname resolution:
  // 1) explicit in-memory state (set on join)
  // 2) current input value (if available)
  // 3) localStorage fallback
  // 4) final anonymous label
  const fromState = String(state.playerNick || "").trim();
  if (fromState) return fromState;

  const fromInput = String(plNick?.value || "").trim();
  if (fromInput) return fromInput;

  const fromLocal = String(localStorage.getItem("tv_nick") || "").trim();
  if (fromLocal) return fromLocal;

  return "";
}

function openSpellModal(initialSpell = null) {
  return new Promise((resolve) => {
    if (!spellModal || !spellNameInput || !spellSchoolInput || !spellLevelInput || !spellDescInput || !btnSpellCancel || !btnSpellSave) {
      resolve(null);
      return;
    }

    const seed = normalizeSpellEntry(initialSpell) || { name: "", school: "", level: "", description: "" };
    spellNameInput.value = seed.name;
    spellSchoolInput.value = seed.school;
    spellLevelInput.value = seed.level;
    spellDescInput.value = seed.description;

    const cleanup = () => {
      btnSpellSave.removeEventListener("click", onSave);
      btnSpellCancel.removeEventListener("click", onCancel);
      spellModal.removeEventListener("click", onBackdrop);
      spellNameInput.removeEventListener("keydown", onKeydown);
    };

    const closeWith = (value) => {
      cleanup();
      animateModalOut(spellModal);
      resolve(value);
    };

    const onSave = () => {
      const next = normalizeSpellEntry({
        name: spellNameInput.value,
        school: spellSchoolInput.value,
        level: spellLevelInput.value,
        description: spellDescInput.value,
      });
      if (!next) {
        showToast("Spell name is required.", "error");
        spellNameInput.focus();
        return;
      }
      closeWith(next);
    };

    const onCancel = () => closeWith(null);
    const onBackdrop = (event) => {
      if (event.target === spellModal) closeWith(null);
    };
    const onKeydown = (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        onSave();
      }
    };

    btnSpellSave.addEventListener("click", onSave);
    btnSpellCancel.addEventListener("click", onCancel);
    spellModal.addEventListener("click", onBackdrop);
    spellNameInput.addEventListener("keydown", onKeydown);

    animateModalIn(spellModal);
    spellNameInput.focus();
  });
}

// ---------------------------------------------------------------------------
// CREATE HANDOUT BUILDER HELPERS
// ---------------------------------------------------------------------------
// These helpers add "character" to handouts:
// - visual identity (icon + color)
// - semantic flavor (reveal mode + npc disposition)
// - content generation (random handout button)
// - local placeholder image matching (title + public content)
// ---------------------------------------------------------------------------

function getActiveIcon() {
  // Reads the selected emoji from the emoji picker input, or falls back to the
  // old icon grid if it still exists (backward compat during transition).
  const emoji = String(emojiInput?.value || "").trim();
  if (emoji) return emoji;
  const active = dmIconGrid?.querySelector(".iconTile--active");
  return active?.getAttribute("data-icon") || "🎭";
}

function setCreateIcon(icon) {
  const nextIcon = String(icon || "").trim() || "🎭";
  if (emojiInput) emojiInput.value = nextIcon;
  if (emojiPreview) emojiPreview.textContent = nextIcon;

  if (!dmIconGrid) return;
  dmIconGrid.querySelectorAll(".iconTile").forEach((tile) => {
    if (!(tile instanceof HTMLElement)) return;
    tile.classList.toggle("iconTile--active", tile.getAttribute("data-icon") === nextIcon);
  });
  renderIconSuggestions();
}

function syncCreateRevealButton() {
  if (!btnCreateRevealToggle) return;
  btnCreateRevealToggle.classList.toggle("revealStarBtn--active", createRevealDraft);
  btnCreateRevealToggle.setAttribute("aria-pressed", createRevealDraft ? "true" : "false");
  const label = btnCreateRevealToggle.querySelector(".revealStarBtn__text");
  if (label) label.textContent = createRevealDraft ? "Revealed" : "Unrevealed";
  createRevealEyeOpen?.classList.toggle("hidden", !createRevealDraft);
  createRevealEyeClosed?.classList.toggle("hidden", createRevealDraft);
}

function syncCreateClaimableButton() {
  // Keeps visual state + accessibility state in sync with our JS boolean.
  if (!btnCreateClaimable) return;
  btnCreateClaimable.classList.toggle("btn--active", createClaimableDraft);
  btnCreateClaimable.setAttribute("aria-pressed", createClaimableDraft ? "true" : "false");
  btnCreateClaimable.textContent = createClaimableDraft ? "Claimable On" : "Claimable Off";
}

function getActiveColor() {
  const active = dmColorRow?.querySelector(".colorDot--active");
  return active?.getAttribute("data-color") || "#f5c82f";
}

// ---------------------------------------------------------------------------
// ICON SUGGESTION ENGINE
// Maps keywords in the handout title + public content to relevant emoji icons.
// Top matches (up to 4) are rendered in the suggestions strip above the grid.
// ---------------------------------------------------------------------------
const ICON_KEYWORD_MAP = [
  { icon: "🎭", keywords: ["npc", "character", "actor", "mask", "persona", "villain", "hero", "noble", "lord", "king", "queen", "wizard", "sorcerer"] },
  { icon: "📜", keywords: ["letter", "scroll", "message", "note", "document", "parchment", "decree", "missive", "contract", "writ", "proclamation"] },
  { icon: "🗺️", keywords: ["map", "location", "region", "journey", "travel", "terrain", "cartograph", "route", "path", "territory"] },
  { icon: "🗝️", keywords: ["key", "lock", "unlock", "secret", "door", "chest", "entrance", "vault", "gate"] },
  { icon: "🧭", keywords: ["compass", "direction", "navigate", "explore", "quest", "guide", "wayfind", "bearing"] },
  { icon: "💰", keywords: ["loot", "gold", "treasure", "coin", "money", "reward", "wealth", "payment", "hoard", "bounty"] },
  { icon: "⚔️", keywords: ["combat", "fight", "battle", "weapon", "sword", "enemy", "war", "attack", "ambush", "duel"] },
  { icon: "🛡️", keywords: ["shield", "defense", "protect", "armor", "guard", "ward", "sanctuary", "bastion"] },
  { icon: "🧪", keywords: ["potion", "brew", "magic", "spell", "elixir", "vial", "alchemist", "ingredient", "formula", "tincture"] },
  { icon: "📖", keywords: ["book", "lore", "knowledge", "library", "tome", "grimoire", "study", "research", "ritual", "spellbook"] },
  { icon: "💎", keywords: ["gem", "jewel", "diamond", "rare", "valuable", "precious", "crystal", "stone", "ruby", "sapphire"] },
  { icon: "☠️", keywords: ["death", "dead", "skull", "danger", "trap", "deadly", "undead", "kill", "murder", "assassin", "poison"] },
];

function suggestHandoutIcons(title, pub) {
  const text = `${title} ${pub}`.toLowerCase();
  if (!text.trim()) return [];
  const scored = ICON_KEYWORD_MAP.map(({ icon, keywords }) => ({
    icon,
    score: keywords.reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0),
  }));
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((s) => s.icon);
}

function renderIconSuggestions() {
  if (!iconSuggestRow || !iconSuggestTiles) return;
  const title = String(dmTitle?.value || "").trim();
  const pub = String(dmPublic?.value || "").trim();
  const suggestions = suggestHandoutIcons(title, pub);
  if (!suggestions.length) {
    iconSuggestRow.classList.add("hidden");
    return;
  }
  const current = getActiveIcon();
  iconSuggestTiles.innerHTML = suggestions
    .map((icon) => `<button class="iconTile iconSuggestTile${icon === current ? " iconTile--active" : ""}" type="button" data-icon="${icon}" aria-label="${icon}">${icon}</button>`)
    .join("");
  iconSuggestRow.classList.remove("hidden");
}

function getNpcDisposition() {
  const active = npcDispositionRow?.querySelector(".chip--active");
  return active?.getAttribute("data-npc-disposition") || "";
}

const PLACEHOLDER_SERIES_DEFS = [
  // BEGINNER NOTE:
  // This array is the "catalog blueprint" for your local image files.
  // Each object describes one filename family inside /placeholders.
  //
  // Example filename pattern in this project:
  //   Prompt1image4_7.png
  //   ^^^^^^ prefix
  //         ^ prompt number
  //               ^ image number in that prompt
  //                 ^ variant number (1..9)
  //
  // Why not hardcode every file path by hand?
  // - Less typing
  // - Fewer mistakes
  // - Easy to expand: add one line here, get many generated paths
  //
  // `tags` represent the visual "theme" this image family fits.
  // The scoring algorithm compares handout text against these tags.
  //
  // `isItem` helps give extra points to loot-style handouts.
  { prefix: "Prompt", prompt: 1, images: 4, tags: ["npc", "social", "urban", "mystery"], isItem: false },
  { prefix: "Prompt", prompt: 2, images: 1, tags: ["letter", "clue", "mystery", "urban"], isItem: false },
  { prefix: "Prompt", prompt: 3, images: 1, tags: ["map", "travel", "nature", "quest"], isItem: false },
  { prefix: "Prompt", prompt: 4, images: 1, tags: ["quest", "magic", "danger", "clue"], isItem: false },
  { prefix: "itemsPrompt", prompt: 1, images: 2, tags: ["loot", "combat", "danger"], isItem: true },
  { prefix: "itemsPrompt", prompt: 2, images: 2, tags: ["loot", "magic", "clue"], isItem: true },
  { prefix: "itemsPrompt", prompt: 3, images: 2, tags: ["loot", "religion", "quest"], isItem: true },
  { prefix: "itemsPrompt", prompt: 4, images: 3, tags: ["loot", "map", "letter", "clue"], isItem: true },
];

const SEMANTIC_KEYWORDS = {
  // BEGINNER NOTE:
  // This object is a tiny local "meaning dictionary".
  //
  // Left side (key): a semantic concept (npc, loot, clue, ...)
  // Right side (array): words we search for in title/public text.
  //
  // If users write "journal" or "dispatch", we treat that as "letter".
  // If users write "artifact" or "chest", we treat that as "loot".
  //
  // You can improve matching quality by expanding these arrays over time.
  // Keep words lowercase because we normalize all text to lowercase first.
  npc: ["npc", "person", "character", "villager", "captain", "guard", "merchant", "noble", "king", "queen", "priest", "sage"],
  loot: ["loot", "treasure", "gold", "coin", "artifact", "relic", "item", "gear", "drop", "chest", "inventory", "reward"],
  clue: ["clue", "hint", "evidence", "symbol", "code", "cipher", "rumor", "trace", "mark", "scrap", "mystery"],
  letter: ["letter", "note", "journal", "diary", "dispatch", "message", "document", "writ", "ledger", "scroll", "report"],
  quest: ["quest", "mission", "contract", "objective", "task", "goal", "bounty", "assignment", "operation"],
  map: ["map", "route", "path", "atlas", "chart", "location", "region", "road", "cave", "ruins", "catacomb"],
  magic: ["magic", "arcane", "rune", "spell", "enchanted", "mystic", "sorcery", "ritual", "mana"],
  combat: ["sword", "blade", "dagger", "bow", "shield", "battle", "fight", "war", "attack", "armor", "weapon"],
  social: ["ally", "friend", "friendly", "help", "contact", "faction", "court", "politic", "diplomacy", "trust"],
  travel: ["travel", "journey", "expedition", "road", "trail", "pass", "crossing", "scout", "patrol"],
  urban: ["city", "town", "street", "district", "market", "castle", "keep", "harbor", "gate"],
  nature: ["forest", "swamp", "river", "mountain", "valley", "wild", "grove", "coast", "island"],
  danger: ["enemy", "hostile", "threat", "danger", "curse", "poison", "trap", "blood", "dark", "ambush"],
  religion: ["temple", "shrine", "saint", "divine", "holy", "church", "cleric", "blessing", "oath"],
};

const PLACEHOLDER_CATALOG = (() => {
  // BEGINNER NOTE:
  // This IIFE (Immediately Invoked Function Expression) runs once at startup
  // and builds one flat list of all candidate images.
  //
  // Output shape per entry:
  // {
  //   url: "placeholders/Prompt1image2_3.png",
  //   tags: ["npc", "social", ...],
  //   isItem: false
  // }
  //
  // Why precompute this list?
  // - Selection becomes fast later (no filename construction each click)
  // - Keeps selection code clean and focused on scoring
  const entries = [];
  PLACEHOLDER_SERIES_DEFS.forEach((series, seriesOrder) => {
    for (let imageIndex = 1; imageIndex <= series.images; imageIndex += 1) {
      for (let variantIndex = 1; variantIndex <= 9; variantIndex += 1) {
        entries.push({
          url: `placeholders/${series.prefix}${series.prompt}image${imageIndex}_${variantIndex}.png`,
          tags: [...series.tags],
          isItem: !!series.isItem,
          seriesOrder,
          seriesPrefix: series.prefix,
          prompt: series.prompt,
          image: imageIndex,
          variant: variantIndex,
        });
      }
    }
  });
  return entries;
})();

const createImageHistoryBySeed = new Map();
// BEGINNER NOTE:
// This map remembers which image URLs we already showed for a specific handout
// context, so "Change image" can rotate through alternatives before repeating.
//
// Key   = normalized seed built from title + public text + type + disposition
// Value = array of URLs already used for that key
//
// We clear this map when a handout is submitted/reset, because the next handout
// should start with a fresh rotation history.

function stableHash(input) {
  // BEGINNER NOTE:
  // This function converts text into a deterministic number.
  // Deterministic means: same input -> same output.
  //
  // We use it only for tie-breaking when two images score similarly.
  // That keeps results stable instead of looking random/jumpy.
  //
  // Algorithm: FNV-like 32-bit hash (fast and simple for UI ranking).
  const text = String(input || "");
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizeSearchText(value) {
  // BEGINNER NOTE:
  // Text normalization makes matching much more reliable.
  //
  // Steps:
  // 1) lowercase everything
  // 2) remove punctuation/symbol noise
  // 3) collapse repeated spaces
  //
  // Example:
  // "Captain's Journal!!!" -> "captain s journal"
  //
  // Without normalization, small formatting differences break keyword matches.
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSemanticSignalMap(title, publicContent, handoutType) {
  // BEGINNER NOTE:
  // Purpose: turn user text into weighted semantic signals.
  //
  // Example output:
  // { npc: 4, clue: 2, urban: 1 }
  //
  // How values are computed:
  // - Keyword hits in body text add normal weight.
  // - Keyword hits in title add EXTRA weight (title is usually high intent).
  // - Selected template type also gets a boost, so explicit user choice matters.
  //
  // This output is later consumed by scorePlaceholderCandidate().
  const titleText = normalizeSearchText(title);
  const bodyText = normalizeSearchText(publicContent);
  const merged = `${titleText} ${bodyText}`.trim();
  const words = merged ? merged.split(" ") : [];

  const counts = {};
  Object.entries(SEMANTIC_KEYWORDS).forEach(([key, variants]) => {
    let value = 0;
    variants.forEach((token) => {
      if (!token) return;
      const bodyCount = words.reduce((acc, word) => acc + (word.includes(token) ? 1 : 0), 0);
      const titleHit = titleText.includes(token) ? 1 : 0;
      value += bodyCount + (titleHit * 2);
    });
    if (value > 0) counts[key] = value;
  });

  const normalizedType = String(handoutType || "").toLowerCase();
  if (normalizedType) counts[normalizedType] = (counts[normalizedType] || 0) + 3;

  return counts;
}

function scorePlaceholderCandidate(candidate, context) {
  // BEGINNER NOTE:
  // This is the heart of the ranking algorithm.
  // Each candidate image gets points for relevance.
  //
  // Scoring strategy (high level):
  // 1) Strong boost if candidate tag matches selected handout type
  // 2) Extra bias for item images on loot handouts
  // 3) Semantic boosts when candidate tags appear in signal map
  // 4) Optional NPC-disposition flavor boosts
  // 5) Tiny deterministic tie-breaker
  //
  // If you want different behavior, tweak constants gradually and test.
  // Large jumps can create surprising ranking side effects.
  const type = String(context.type || "").toLowerCase();
  const disposition = String(context.npcDisposition || "").toLowerCase();
  const signals = context.signals || {};

  let score = 0;
  const matchedTags = [];

  if (type && candidate.tags.includes(type)) {
    score += 36;
    matchedTags.push(type);
  }

  if (type === "loot" && candidate.isItem) score += 14;
  if (type === "npc" && !candidate.isItem) score += 12;
  if (type !== "loot" && candidate.isItem) score -= 6;

  candidate.tags.forEach((tag) => {
    const signalStrength = Math.min(signals[tag] || 0, 4);
    if (signalStrength > 0) {
      score += signalStrength * 8;
      if (!matchedTags.includes(tag)) matchedTags.push(tag);
    }
  });

  if (type === "npc") {
    if (disposition === "enemy" && candidate.tags.includes("danger")) score += 8;
    if (disposition === "friendly" && candidate.tags.includes("social")) score += 8;
    if (disposition === "neutral" && candidate.tags.includes("mystery")) score += 4;
  }

  const tieBreaker = (stableHash(`${context.seed}|${candidate.url}`) % 1000) / 1000;
  score += tieBreaker;

  return { score, matchedTags };
}

function buildImageSelectionSeed({ title, publicContent, type, npcDisposition }) {
  // BEGINNER NOTE:
  // A "seed" is just a stable key representing the current handout context.
  // We normalize all parts so trivial formatting differences do not create
  // separate histories.
  //
  // This key is used in createImageHistoryBySeed to track already shown images.
  return [
    normalizeSearchText(title),
    normalizeSearchText(publicContent),
    normalizeSearchText(type),
    normalizeSearchText(npcDisposition),
  ].join("|");
}

function rankPlaceholderImages({ title, publicContent, type, npcDisposition }) {
  // BEGINNER NOTE:
  // This function scores ALL catalog images, then sorts best -> worst.
  // Think of it as building a leaderboard.
  //
  // Separating ranking from "choose one" gives two big advantages:
  // - We can get top image quickly (best match)
  // - We can rotate through alternatives without rescoring logic duplication
  if (!PLACEHOLDER_CATALOG.length) return [];

  const signals = buildSemanticSignalMap(title, publicContent, type);
  const seed = `${String(title || "").trim()}|${String(publicContent || "").trim()}|${String(type || "").trim()}`;

  return PLACEHOLDER_CATALOG
    .map((candidate) => {
      const result = scorePlaceholderCandidate(candidate, {
        type,
        npcDisposition,
        signals,
        seed,
      });
      return {
        url: candidate.url,
        score: result.score,
        matchedTags: result.matchedTags,
      };
    })
    .sort((a, b) => b.score - a.score);
}

function getChronologicalPlaceholderImages() {
  return [...PLACEHOLDER_CATALOG]
    .sort((left, right) => {
      if (left.seriesOrder !== right.seriesOrder) return left.seriesOrder - right.seriesOrder;
      if (left.prompt !== right.prompt) return left.prompt - right.prompt;
      if (left.image !== right.image) return left.image - right.image;
      return left.variant - right.variant;
    })
    .map((entry) => ({
      url: entry.url,
      reason: "chronological catalog order",
      matchedTags: entry.tags,
    }));
}

function getCurrentImageContext() {
  const type = String(dmType?.value || "").toLowerCase();
  return {
    title: String(dmTitle?.value || "").trim(),
    publicContent: String(dmPublic?.value || "").trim(),
    type,
    npcDisposition: type === "npc" ? getNpcDisposition() : "",
  };
}

function getActiveImageQueue() {
  const context = getCurrentImageContext();
  if (!context.title || !context.publicContent) {
    return getChronologicalPlaceholderImages();
  }

  return rankPlaceholderImages(context).map((entry) => ({
    url: entry.url,
    matchedTags: entry.matchedTags,
    reason: entry.matchedTags?.length
      ? `matched ${entry.matchedTags.slice(0, 2).join(" + ")}`
      : "best default theme",
  }));
}

function selectBestPlaceholderImage({ title, publicContent, type, npcDisposition }) {
  // BEGINNER NOTE:
  // Convenience helper: returns top-ranked image only.
  // We keep this because other flows (e.g. auto-fill on create) may only need
  // the single best option.
  const ranked = rankPlaceholderImages({ title, publicContent, type, npcDisposition });
  const best = ranked[0] || null;

  if (!best) return null;
  const reason = best.matchedTags.length
    ? `matched ${best.matchedTags.slice(0, 2).join(" + ")}`
    : "best default theme";

  return { ...best, reason };
}

function clampValue(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampCreateImageFrameOffsets() {
  const frameEl = dmImagePreview?.closest(".portraitFrame");
  if (!(frameEl instanceof HTMLElement)) return;
  const frameWidth = frameEl.clientWidth || 132;
  const frameHeight = frameEl.clientHeight || 132;
  const maxX = Math.max(0, ((frameWidth * createImageScale) - frameWidth) / 2);
  const maxY = Math.max(0, ((frameHeight * createImageScale) - frameHeight) / 2);
  createImageOffsetX = clampValue(createImageOffsetX, -maxX, maxX);
  createImageOffsetY = clampValue(createImageOffsetY, -maxY, maxY);
}

function applyCreateImageFrameTransform() {
  if (!dmImagePreview) return;
  clampCreateImageFrameOffsets();
  dmImagePreview.style.transform = `translate(${createImageOffsetX.toFixed(1)}px, ${createImageOffsetY.toFixed(1)}px) scale(${createImageScale.toFixed(3)})`;
  dmImagePreview.style.transformOrigin = "center";
}

function resetCreateImageFrame() {
  createImageScale = 1.14;
  createImageOffsetX = 0;
  createImageOffsetY = 0;
  applyCreateImageFrameTransform();
}

function setCreateImageFrame(frame) {
  const scale = Number(frame?.scale);
  const offsetX = Number(frame?.offsetX);
  const offsetY = Number(frame?.offsetY);
  createImageScale = Number.isFinite(scale) ? clampValue(scale, 1, 2.8) : 1.14;
  createImageOffsetX = Number.isFinite(offsetX) ? offsetX : 0;
  createImageOffsetY = Number.isFinite(offsetY) ? offsetY : 0;
  applyCreateImageFrameTransform();
}

function getCreateImageFrameData() {
  if (!dmImagePreview || dmImagePreview.classList.contains("hidden")) return null;
  return {
    scale: Number(createImageScale.toFixed(3)),
    offsetX: Number(createImageOffsetX.toFixed(1)),
    offsetY: Number(createImageOffsetY.toFixed(1)),
  };
}

function buildImageFrameInlineStyle(frame) {
  const frameScale = Number(frame?.scale);
  const frameOffsetX = Number(frame?.offsetX);
  const frameOffsetY = Number(frame?.offsetY);
  if (!Number.isFinite(frameScale) && !Number.isFinite(frameOffsetX) && !Number.isFinite(frameOffsetY)) {
    return "";
  }
  const scale = Number.isFinite(frameScale) ? clampValue(frameScale, 1, 2.8) : 1;
  const offsetX = Number.isFinite(frameOffsetX) ? frameOffsetX : 0;
  const offsetY = Number.isFinite(frameOffsetY) ? frameOffsetY : 0;
  return ` style="transform:translate(${offsetX.toFixed(1)}px, ${offsetY.toFixed(1)}px) scale(${scale.toFixed(3)});transform-origin:center;"`;
}

function setupCreateImageFrameInteractions() {
  const frameEl = dmImagePreview?.closest(".portraitFrame");
  if (!(frameEl instanceof HTMLElement) || !dmImagePreview) return;
  if (frameEl.dataset.dragZoomBound === "1") return;
  frameEl.dataset.dragZoomBound = "1";

  const startDrag = (event) => {
    if (dmImagePreview.classList.contains("hidden")) return;
    createImageDragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: createImageOffsetX,
      startOffsetY: createImageOffsetY,
    };
    dmImagePreview.setPointerCapture(event.pointerId);
    frameEl.classList.add("is-dragging");
  };

  const moveDrag = (event) => {
    if (!createImageDragState || createImageDragState.pointerId !== event.pointerId) return;
    const dx = event.clientX - createImageDragState.startX;
    const dy = event.clientY - createImageDragState.startY;
    createImageOffsetX = createImageDragState.startOffsetX + dx;
    createImageOffsetY = createImageDragState.startOffsetY + dy;
    applyCreateImageFrameTransform();
  };

  const stopDrag = (event) => {
    if (!createImageDragState || createImageDragState.pointerId !== event.pointerId) return;
    if (dmImagePreview.hasPointerCapture(event.pointerId)) {
      dmImagePreview.releasePointerCapture(event.pointerId);
    }
    createImageDragState = null;
    frameEl.classList.remove("is-dragging");
  };

  dmImagePreview.addEventListener("pointerdown", startDrag);
  dmImagePreview.addEventListener("pointermove", moveDrag);
  dmImagePreview.addEventListener("pointerup", stopDrag);
  dmImagePreview.addEventListener("pointercancel", stopDrag);

  frameEl.addEventListener("wheel", (event) => {
    if (dmImagePreview.classList.contains("hidden")) return;
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.08 : 0.08;
    createImageScale = clampValue(createImageScale + delta, 1, 2.8);
    applyCreateImageFrameTransform();
  }, { passive: false });

  frameEl.addEventListener("dblclick", () => {
    if (dmImagePreview.classList.contains("hidden")) return;
    resetCreateImageFrame();
  });
}

function setImagePickerOpen(isOpen) {
  imagePickerPanel?.classList.toggle("hidden", !isOpen);
  btnImageSelect?.classList.toggle("is-active", !!isOpen);
}

function renderImagePicker() {
  if (!imagePickerList) return;

  const chronological = getChronologicalPlaceholderImages();
  const currentUrl = String(dmImagePreview?.getAttribute("src") || "").trim();

  imagePickerList.innerHTML = chronological.map((entry) => {
    const isActive = currentUrl && currentUrl === entry.url;
    return `<button class="imagePickerTile${isActive ? " is-active" : ""}" type="button" role="option" aria-selected="${isActive ? "true" : "false"}" data-url="${escapeHtml(entry.url)}"><img src="${escapeHtml(entry.url)}" alt="Placeholder option" loading="lazy" /></button>`;
  }).join("");

  const selectedTile = imagePickerList.querySelector(".imagePickerTile.is-active");
  if (selectedTile instanceof HTMLElement) {
    selectedTile.scrollIntoView({ block: "center", inline: "nearest" });
  }
}

function applySelectedCreateImage(selected, messages = {}) {
  if (!selected?.url) {
    showToast("No placeholder images available.", "error");
    return;
  }

  setImagePreview(selected.url, {
    loading: messages.loading || "Selecting image...",
    success: messages.success || `Image changed (${selected.reason || "manual selection"}).`,
    fail: messages.fail || "Selected placeholder image failed to load.",
  });

  if (!imagePickerPanel?.classList.contains("hidden")) {
    renderImagePicker();
  }
}

function cycleCreateImage(direction = "next") {
  const queue = getActiveImageQueue();
  if (!queue.length) {
    showToast("No placeholder images available.", "error");
    return;
  }

  const currentUrl = String(dmImagePreview?.getAttribute("src") || "").trim();
  const currentIndex = queue.findIndex((entry) => entry.url === currentUrl);

  let targetIndex = 0;
  if (currentIndex < 0) {
    targetIndex = direction === "previous" ? (queue.length - 1) : 0;
  } else if (direction === "previous") {
    targetIndex = (currentIndex - 1 + queue.length) % queue.length;
  } else {
    targetIndex = (currentIndex + 1) % queue.length;
  }

  const target = queue[targetIndex];
  applySelectedCreateImage(target, {
    loading: direction === "previous" ? "Loading previous image..." : "Loading next image...",
  });
}

function selectRandomCreateImage() {
  const queue = getActiveImageQueue();
  if (!queue.length) {
    showToast("No placeholder images available.", "error");
    return;
  }

  const currentUrl = String(dmImagePreview?.getAttribute("src") || "").trim();
  const candidates = queue.filter((entry) => entry.url !== currentUrl);
  const target = candidates.length ? randomPick(candidates) : queue[0];
  applySelectedCreateImage(target, {
    loading: "Picking random image...",
    success: `Random image selected (${target.reason || "placeholder"}).`,
  });
}

function selectNextPlaceholderImage({ title, publicContent, type, npcDisposition, currentUrl }) {
  // BEGINNER NOTE:
  // "Change image" behavior lives here.
  // Goal: show another good option and avoid immediate repeats.
  //
  // Steps:
  // 1) Rank all images for current context
  // 2) Load seen history for this context
  // 3) Pick first ranked image not in seen history
  // 4) If all seen, reset cycle and continue
  // 5) Avoid returning currentUrl when alternatives exist
  // 6) Save chosen URL back into history
  //
  // Result: users cycle through fitting alternatives before repeats happen.
  const ranked = rankPlaceholderImages({ title, publicContent, type, npcDisposition });
  if (!ranked.length) return null;

  const selectionSeed = buildImageSelectionSeed({ title, publicContent, type, npcDisposition });
  const seenList = createImageHistoryBySeed.get(selectionSeed) || [];
  const seenSet = new Set(seenList);

  let next = ranked.find((entry) => !seenSet.has(entry.url));

  if (!next) {
    createImageHistoryBySeed.set(selectionSeed, []);
    next = ranked.find((entry) => entry.url !== currentUrl) || ranked[0];
  }

  if (currentUrl && next?.url === currentUrl) {
    const different = ranked.find((entry) => entry.url !== currentUrl && !seenSet.has(entry.url))
      || ranked.find((entry) => entry.url !== currentUrl);
    if (different) next = different;
  }

  if (!next) return null;

  const updatedSeen = [...(createImageHistoryBySeed.get(selectionSeed) || []), next.url];
  const keep = Math.min(ranked.length, 120);
  createImageHistoryBySeed.set(selectionSeed, updatedSeen.slice(-keep));

  const reason = next.matchedTags.length
    ? `matched ${next.matchedTags.slice(0, 2).join(" + ")}`
    : "best default theme";

  return {
    ...next,
    reason,
    alternatives: ranked.length,
  };
}

function setImagePreview(url, messages = {}) {
  // BEGINNER NOTE:
  // This function only updates UI preview state.
  // It does NOT decide which image to choose.
  //
  // Why this separation is good:
  // - selection logic stays testable/independent
  // - rendering logic stays simple and reusable
  const loadingMsg = messages.loading || "Generating portrait...";
  const successMsg = messages.success || "Portrait generated successfully.";
  const failMsg = messages.fail || "Portrait generation failed. Try again.";

  if (!dmImagePreview) return;
  if (!url) {
    dmImagePreview.classList.add("hidden");
    dmImagePreview.removeAttribute("src");
    dmImagePreview.removeAttribute("style");
    portraitPlaceholder?.classList.remove("hidden");
    resetCreateImageFrame();
    if (dmImageStatus) dmImageStatus.textContent = "Portrait is selected from local placeholders using Title + Public Content only.";
    return;
  }

  if (messages.frame) {
    setCreateImageFrame(messages.frame);
  } else {
    resetCreateImageFrame();
  }

  // Attach explicit load/error handlers so the UI communicates real generation
  // success/failure instead of only showing image alt text.
  dmImagePreview.onload = () => {
    dmImagePreview.classList.remove("hidden");
    portraitPlaceholder?.classList.add("hidden");
    if (dmImageStatus) dmImageStatus.textContent = successMsg;
  };

  dmImagePreview.onerror = () => {
    dmImagePreview.classList.add("hidden");
    portraitPlaceholder?.classList.remove("hidden");
    if (dmImageStatus) dmImageStatus.textContent = failMsg;
  };

  if (dmImageStatus) dmImageStatus.textContent = loadingMsg;
  applyCreateImageFrameTransform();
  dmImagePreview.src = url;
}

async function generateHandoutImage() {
  // BEGINNER NOTE:
  // Main "Change image" action flow:
  // - Validate required fields (title + public content)
  // - Compute next best alternative based on semantic ranking
  // - Push chosen URL into preview renderer
  //
  // Important privacy rule retained:
  // Secret content is NEVER used for image matching.
  const title = String(dmTitle?.value || "").trim();
  const pub = String(dmPublic?.value || "").trim();
  const type = String(dmType?.value || "").toLowerCase();
  const npcDisposition = type === "npc" ? getNpcDisposition() : "";
  const currentUrl = String(dmImagePreview?.getAttribute("src") || "").trim();

  if (!title || !pub) {
    showToast("Add title and public content first.", "error");
    return;
  }

  const selected = selectNextPlaceholderImage({
    title,
    publicContent: pub,
    type,
    npcDisposition,
    currentUrl,
  });

  applySelectedCreateImage(selected, {
    loading: "Finding another fitting placeholder image...",
  });
}

function toggleNpcSpecificUI() {
  const isNpc = String(dmType?.value || "").toLowerCase() === "npc";
  npcDispositionWrap?.classList.toggle("hidden", !isNpc);
}

function isMapHandoutType(type) {
  return String(type || "").trim().toLowerCase() === "map";
}

function syncCreateTypeDependentUI() {
  toggleNpcSpecificUI();
  const isMap = isMapHandoutType(dmType?.value);
  createMapUploadWrap?.classList.toggle("hidden", !isMap);
  if (isMap && handoutImageStatus && !String(handoutImageStatus.textContent || "").trim()) {
    handoutImageStatus.textContent = "Upload a map image (cost: 1 nugget).";
  } else if (!isMap && handoutImageStatus && !String(handoutImageStatus.textContent || "").trim()) {
    handoutImageStatus.textContent = "Upload your own portrait (costs 1 nugget when creating).";
  }
}

function canUserViewMap(handout, role = state.role, uid = state.uid) {
  if (!isMapHandoutType(handout?.type)) return true;
  if (role === "dm") return true;
  const visibleUid = String(handout?.mapVisibleToUid || handout?.claimedByUid || "").trim();
  return !!uid && !!visibleUid && visibleUid === uid;
}

function getVisibleHandoutImageUrl(handout, role = state.role, uid = state.uid) {
  if (isMapHandoutType(handout?.type)) {
    return canUserViewMap(handout, role, uid)
      ? String(handout?.mapImageUrl || "").trim()
      : "";
  }
  return String(handout?.imageUrl || "").trim();
}

/**
 * Compresses an image File to fit within maxBytes using canvas re-encoding.
 * Returns the original file unchanged when it already fits.
 * Always outputs JPEG for images that need compression.
 */
async function compressImageToMaxSize(file, maxBytes = 5 * 1024 * 1024) {
  if (file.size <= maxBytes) return file;
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      const tryCompress = (w, h, quality) => {
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(blob => {
          if (!blob) { reject(new Error("Compression failed")); return; }
          const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
          if (blob.size <= maxBytes) {
            resolve(new File([blob], name, { type: "image/jpeg" }));
          } else if (quality > 0.3) {
            tryCompress(w, h, Math.round((quality - 0.1) * 10) / 10);
          } else if (w > 50 && h > 50) {
            tryCompress(Math.round(w * 0.75), Math.round(h * 0.75), 0.85);
          } else {
            resolve(new File([blob], name, { type: "image/jpeg" }));
          }
        }, "image/jpeg", quality);
      };
      tryCompress(img.naturalWidth, img.naturalHeight, 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Image load failed")); };
    img.src = objectUrl;
  });
}

async function uploadMapImageToStorage(file, { handoutId = "create" } = {}) {
  if (!file) return { ok: false, message: "No file selected." };
  if (!state.uid || !state.sessionId) return { ok: false, message: "Sign in is required before uploading maps." };
  if (!file.type.startsWith("image/")) return { ok: false, message: "Please select an image file." };
  try { file = await compressImageToMaxSize(file); } catch (_) { return { ok: false, message: "Could not process image." }; }

  const spent = await spendNuggetWithFeedback("map image upload");
  if (!spent) return { ok: false, message: "Not enough nuggets for upload." };

  const walletId = state.role === "dm" ? "dm" : state.uid;
  const walletRef = doc(db, "sessions", state.sessionId, "wallets", walletId);
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `users/${state.uid}/maps/${state.sessionId}/${handoutId}-${Date.now()}.${ext}`;
  const ref = storageRef(storage, path);

  try {
    await uploadBytes(ref, file, { contentType: file.type });
    const url = await getDownloadURL(ref);
    return { ok: true, url, path };
  } catch (err) {
    try {
      await updateDoc(walletRef, { nuggets: increment(1) });
    } catch (_) {}
    console.error("Map upload failed:", err);
    const msg = String(err?.message || "").toLowerCase();
    if (msg.includes("unauthorized") || msg.includes("403") || msg.includes("permission")) {
      return { ok: false, message: "Upload blocked by Storage rules." };
    }
    return { ok: false, message: "Upload failed. Nugget refunded." };
  }
}

async function uploadHandoutImageToStorage(file, { handoutId = "create" } = {}) {
  if (!file) return { ok: false, message: "No file selected." };
  if (!state.uid || !state.sessionId) return { ok: false, message: "Sign in is required before uploading images." };
  if (!file.type.startsWith("image/")) return { ok: false, message: "Please select an image file." };
  try { file = await compressImageToMaxSize(file); } catch (_) { return { ok: false, message: "Could not process image." }; }

  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `users/${state.uid}/handouts/${state.sessionId}/${handoutId}-${Date.now()}.${ext}`;
  const ref = storageRef(storage, path);

  try {
    await uploadBytes(ref, file, { contentType: file.type });
    const url = await getDownloadURL(ref);
    return { ok: true, url, path };
  } catch (err) {
    console.error("Handout image upload failed:", err);
    const msg = String(err?.message || "").toLowerCase();
    if (msg.includes("unauthorized") || msg.includes("403") || msg.includes("permission")) {
      return { ok: false, message: "Upload blocked by Storage rules." };
    }
    return { ok: false, message: "Upload failed." };
  }
}

function randomPick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomByTemplate(templateType) {
  const type = String(templateType || "clue").toLowerCase();
  // Combinatoric generator:
  // Each category has multiple dimensions (adjective + noun + motif, etc),
  // producing well over 50 outcomes per template category.
  
  const c = RANDOM_GENERATOR_CATALOG[type] || RANDOM_GENERATOR_CATALOG.clue;

  return {
    title: `${randomPick(c.a)} ${randomPick(c.b)}${c.c ? ` ${randomPick(c.c)}` : ""}`.trim(),
    publicContent: `${randomPick(c.p1)} ${randomPick(c.p2)} ${randomPick(c.p3)}`,
    secretContent: `${randomPick(c.s1)} ${randomPick(c.s2)}`,
  };
}

async function generateRandomFromTemplate() {
  const type = String(dmType?.value || "clue").toLowerCase();
  const generated = randomByTemplate(type);

  dmTitle.value = generated.title;
  dmPublic.value = generated.publicContent;
  dmSecret.value = generated.secretContent;

  if (type === "npc" && npcDispositionRow) {
    const options = ["", "friendly", "enemy", "neutral"];
    const selected = randomPick(options);
    npcDispositionRow.querySelectorAll(".chip").forEach((chip) => {
      chip.classList.toggle("chip--active", (chip.getAttribute("data-npc-disposition") || "") === selected);
    });
  }

  // Generate matching image for every template type (AI first, curated fallback second).
  await generateHandoutImage();
  renderIconSuggestions();
}

function findLinkedNpcHandoutByName(name) {
  return (state.dmHandoutsRaw || []).find((handout) => {
    if (String(handout?.type || "").toLowerCase() !== "npc") return false;
    return normalizeNpcSyncKey(handout?.title) === normalizeNpcSyncKey(name);
  }) || null;
}

async function upsertNpcIntoInitiative(name, linkedNpcHandout, dexMod) {
  if (!state.sessionId) return;
  const linkedId = String(linkedNpcHandout?.id || "").trim() || null;
  const existingNpc = (state.partyRoster || []).find((entry) => {
    if (entry?.isNpc !== true || !entry?.id) return false;
    if (linkedId && String(entry?.npcHandoutId || "").trim() === linkedId) return true;
    if (isUnknownNpcLabel(entry?.nickname)) {
      const entryAvatar = String(entry?.avatarUrl || "").trim();
      const handoutAvatar = String(linkedNpcHandout?.imageUrl || "").trim();
      if (entryAvatar && handoutAvatar && entryAvatar === handoutAvatar) return true;
    }
    return normalizeNpcSyncKey(entry?.nickname) === normalizeNpcSyncKey(name);
  });

  const payload = {
    nickname: name,
    isNpc: true,
    isRevealed: linkedNpcHandout?.revealed === true,
    npcHandoutId: linkedId,
    avatarUrl: String(linkedNpcHandout?.imageUrl || "").trim(),
    dexterityMod: dexMod,
    quickStats: { dexterityMod: dexMod },
    updatedAt: serverTimestamp(),
  };

  if (existingNpc?.id) {
    await updateDoc(doc(db, "sessions", state.sessionId, "players", existingNpc.id), {
      ...payload,
      quickStats: { ...(existingNpc.quickStats || {}), dexterityMod: dexMod },
    });
    showToast(`${name} synced in initiative tracker.`, "success");
    return;
  }

  await addDoc(collection(db, "sessions", state.sessionId, "players"), {
    ...payload,
    initiative: null,
    joinedAt: serverTimestamp(),
    lastSeenAt: serverTimestamp(),
  });
  showToast(`${name} added to initiative tracker.`, "success");
}

async function addNpcToInitiativeFromHandoutName(name, linkedNpcHandout = null) {
  if (state.role !== "dm" || !state.sessionId) return;
  const safeName = String(name || "").trim();
  if (!safeName) {
    showToast("NPC name is required before adding to initiative.", "error");
    return;
  }
  const linked = linkedNpcHandout || findLinkedNpcHandoutByName(safeName);
  const dexInput = window.prompt(`DEX modifier for ${safeName} (e.g. +2)`, "0");
  if (dexInput === null) return;
  const dexMod = parseNumericStat(dexInput);
  if (dexMod === null) {
    showToast("Enter a valid numeric DEX modifier.", "error");
    return;
  }

  try {
    await upsertNpcIntoInitiative(safeName, linked, dexMod);
  } catch (err) {
    console.error("Add for initiative failed:", err);
    showToast("Could not add to initiative.", "error");
  }
}

function bindDelegatedClick(container, selector, onMatch) {
  container?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const matched = target.closest(selector);
    if (!(matched instanceof HTMLElement)) return;
    onMatch(matched, event);
  });
}

function setupCreateBuilderUI() {
  // One place where all create-modal listeners are attached.
  dmType?.addEventListener("change", syncCreateTypeDependentUI);
  setupCreateImageFrameInteractions();

  // "Add for Initiative" button in NPC handout creation
  const btnAddHandoutToInitiative = $("btnAddHandoutToInitiative");
  btnAddHandoutToInitiative?.addEventListener("click", async () => {
    const name = String(dmTitle?.value || "").trim();
    const pub = String(dmPublic?.value || "").trim();
    const validationError = validateHandoutCoreFields({
      title: name,
      publicContent: pub,
      type: "npc",
    });
    if (validationError) {
      showToast(validationError, "error");
      return;
    }
    await addNpcToInitiativeFromHandoutName(name);
  });

  npcDispositionRow?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const chip = target.closest(".chip");
    if (!(chip instanceof HTMLElement)) return;
    npcDispositionRow.querySelector(".chip--active")?.classList.remove("chip--active");
    chip.classList.add("chip--active");
  });

  // Emoji icon picker: tapping preview focuses the input; input event captures emoji.
  emojiPreview?.addEventListener("click", () => emojiInput?.focus());
  emojiPreview?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    emojiInput?.focus();
  });

  // Suggestion strip — delegate clicks to iconTile buttons inside it.
  bindDelegatedClick(iconSuggestRow, ".iconTile", (tile) => {
    const icon = String(tile.getAttribute("data-icon") || "").trim();
    if (!icon) return;
    setCreateIcon(icon);
  });

  bindDelegatedClick(dmIconGrid, ".iconTile", (tile) => {
    const icon = String(tile.getAttribute("data-icon") || "").trim();
    if (!icon) return;
    setCreateIcon(icon);
  });

  emojiInput?.addEventListener("input", () => {
    const val = String(emojiInput.value || "").trim();
    // Keep only the first grapheme cluster (one emoji).
    const segments = val ? [...new Intl.Segmenter().segment(val)] : [];
    const firstEmoji = segments.length ? segments[0].segment : "";
    setCreateIcon(firstEmoji || "🎭");
  });

  bindDelegatedClick(dmColorRow, ".colorDot", (dot) => {
    dmColorRow.querySelector(".colorDot--active")?.classList.remove("colorDot--active");
    dot.classList.add("colorDot--active");
  });

  // Update icon suggestions as the GM types the title or public content.
  const _debouncedSuggestions = debounce(renderIconSuggestions, UI_TIMERS.ICON_SUGGEST_DEBOUNCE_MS);
  dmTitle?.addEventListener("input", _debouncedSuggestions);
  dmPublic?.addEventListener("input", _debouncedSuggestions);

  // Prevent long-press "save image" on mobile for all app images.
  document.addEventListener("contextmenu", (e) => {
    if (e.target instanceof HTMLImageElement) e.preventDefault();
  });

  btnImagePrev?.addEventListener("click", () => {
    cycleCreateImage("previous");
  });

  btnImageNext?.addEventListener("click", () => {
    cycleCreateImage("next");
  });

  btnImageRandom?.addEventListener("click", () => {
    selectRandomCreateImage();
  });

  btnImageSelect?.addEventListener("click", () => {
    const opening = !!imagePickerPanel?.classList.contains("hidden");
    if (opening) renderImagePicker();
    setImagePickerOpen(opening);
  });

  btnImageUpload?.addEventListener("click", () => {
    const isMap = isMapHandoutType(dmType?.value);
    if (!isMap) {
      const confirmed = confirmNuggetCost("Uploading or changing this handout portrait");
      if (!confirmed) {
        createHandoutImageUploadConfirmed = false;
        if (handoutImageStatus) handoutImageStatus.textContent = "Handout portrait upload canceled.";
        return;
      }
      createHandoutImageUploadConfirmed = true;
    }
    handoutImageUpload?.click();
  });

  bindDelegatedClick(imagePickerList, ".imagePickerTile", (tile) => {
    const selectedUrl = String(tile.getAttribute("data-url") || "").trim();
    if (!selectedUrl) return;

    applySelectedCreateImage({ url: selectedUrl, reason: "manual selection" }, {
      loading: "Applying selected image...",
      success: "Image selected.",
    });
    setImagePickerOpen(false);
  });

  btnRandomHandout?.addEventListener("click", () => {
    generateRandomFromTemplate().catch(console.error);
  });

  btnCreateClaimable?.addEventListener("click", () => {
    // Toggle local draft state only; persisted when creating the handout.
    createClaimableDraft = !createClaimableDraft;
    syncCreateClaimableButton();
  });

  btnCreateRevealToggle?.addEventListener("click", () => {
    createRevealDraft = !createRevealDraft;
    syncCreateRevealButton();
  });

  syncCreateTypeDependentUI();
  setCreateIcon(getActiveIcon());
  syncCreateRevealButton();
  syncCreateClaimableButton();
  setImagePickerOpen(false);
}

async function copyToClipboard(text) {
  // Browser clipboard API is async because permission and platform behavior vary.
  // Some browsers deny clipboard access without a secure context or user gesture,
  // so we catch failures and show a toast instead of crashing the caller.
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    showToast("Clipboard access denied � copy manually.", "error");
  }
}

function buildInvitePayload() {
  const sessionTag = String(state.joinTag || state.sessionId || "").trim();
  const pin = String(state.dmPinPlain || "").trim();
  const baseJoinUrl = buildSessionJoinLink(sessionTag || state.joinTag || state.sessionId || "");
  const joinUrl = pin ? `${baseJoinUrl}&pin=${encodeURIComponent(pin)}` : baseJoinUrl;
  const lines = [
    "Join our TomeVault session by clicking the following link:",
    "",
    joinUrl,
    "",
    sessionTag ? `Session Tag: ${sessionTag}` : "",
    pin ? `PIN: ${pin}` : "",
  ].filter(Boolean);

  return {
    title: "TomeVault Session Invite",
    text: lines.join("\n"),
    url: joinUrl,
  };
}

async function shareSessionInvite() {
  const payload = buildInvitePayload();

  if (navigator.share) {
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
      });
      dmCreateMsg.textContent = "Invite shared.";
      return;
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.warn("Native share failed; trying WhatsApp fallback:", err);
    }
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(payload.text)}`;
  const popup = window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  if (popup) {
    dmCreateMsg.textContent = "Invite opened in WhatsApp share.";
    return;
  }

  await copyToClipboard(payload.text);
  dmCreateMsg.textContent = "Share text copied to clipboard.";
}

function escapeHtml(s) {
  // Defensive output encoding for strings inserted into innerHTML.
  // Prevents HTML/script injection by turning special characters into entities.
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getSafeHandoutTitle(handout) {
  const rawTitle = String(handout?.title || "").trim();
  if (rawTitle) return rawTitle;
  return String(handout?.type || "").toLowerCase() === "npc" ? "Unnamed NPC" : "Untitled Handout";
}

function validateHandoutCoreFields({ title, publicContent, type }) {
  const safeTitle = String(title || "").trim();
  const safePublic = String(publicContent || "").trim();
  const isNpc = String(type || "").toLowerCase() === "npc";

  if (!safeTitle) {
    return isNpc ? "NPC name is required." : "Handout name is required.";
  }
  if (!safePublic) {
    return isNpc ? "NPC bio is required." : "Public content is required.";
  }

  return "";
}

function normalizeIconKey(iconValue) {
  // Backward compatibility mapper for legacy text keys while preserving
  // arbitrary user-chosen emoji values.
  const raw = String(iconValue || "").trim();
  if (!raw) return "document";

  const aliases = {
    doc: "document",
    scroll: "document",
    weapon: "sword",
    blade: "sword",
    armor: "shield",
    potion: "beaker",
    alchemy: "beaker",
    magic: "sparkles",
    arcane: "sparkles",
    death: "skull",
    treasure: "bag",
    loot: "bag",
    nature: "tree",
    flame: "fire",
    lock: "key",
    vision: "eye",
  };

  const allowed = new Set(["document", "sword", "shield", "beaker", "sparkles", "skull", "map", "bag", "tree", "fire", "key", "eye"]);
  const lower = raw.toLowerCase();
  if (allowed.has(lower)) return lower;
  if (aliases[lower]) return aliases[lower];

  // Keep pictographic symbols (emoji) as-is; otherwise fallback safely.
  if (/\p{Extended_Pictographic}/u.test(raw)) return raw;
  return "document";
}

function getHeroIconSvg(iconName, className = "") {
  // Returns inline SVG markup for template-based rendering in list rows.
  const cls = className ? ` class="${className}"` : "";
  const icons = {
    document: `<svg${cls} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 4H16L19 7V20H7V4Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 4V7H19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 11H16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M10 14H16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    sword: `<svg${cls} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 4L20 10L9 21H3V15L14 4Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 7L17 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    shield: `<svg${cls} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3L19 6V11C19 16.25 15.75 20.74 12 22C8.25 20.74 5 16.25 5 11V6L12 3Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    beaker: `<svg${cls} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 4H15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M10 4V9L5 18C4.5 19 5.2 20 6.3 20H17.7C18.8 20 19.5 19 19 18L14 9V4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    sparkles: `<svg${cls} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3L13.8 8.2L19 10L13.8 11.8L12 17L10.2 11.8L5 10L10.2 8.2L12 3Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 3L19.8 5.2L22 6L19.8 6.8L19 9L18.2 6.8L16 6L18.2 5.2L19 3Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    skull: `<svg${cls} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4C8.686 4 6 6.686 6 10V12C6 13.657 7.343 15 9 15V18H11V16H13V18H15V15C16.657 15 18 13.657 18 12V10C18 6.686 15.314 4 12 4Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="10" r="1" fill="currentColor"/><circle cx="14" cy="10" r="1" fill="currentColor"/></svg>`,
    map: `<svg${cls} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6L9 4L15 6L21 4V18L15 20L9 18L3 20V6Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 4V18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M15 6V20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    bag: `<svg${cls} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 8H17L18 20H6L7 8Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 8V7C9 5.343 10.343 4 12 4C13.657 4 15 5.343 15 7V8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    tree: `<svg${cls} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4L6 12H10L7 17H17L14 12H18L12 4Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 17V20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    fire: `<svg${cls} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3C12 6 9 7.5 9 10C9 11.657 10.343 13 12 13C13.657 13 15 11.657 15 10C15 8 14 7 14 5C17 6.5 20 10 20 14C20 18.418 16.418 22 12 22C7.582 22 4 18.418 4 14C4 10.5 6 8 8 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    key: `<svg${cls} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="12" r="4" stroke="currentColor" stroke-width="1.8"/><path d="M12 12H20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M17 12V15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M19 12V14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    eye: `<svg${cls} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 12C3.8 8.5 7.4 6 12 6C16.6 6 20.2 8.5 22 12C20.2 15.5 16.6 18 12 18C7.4 18 3.8 15.5 2 12Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/></svg>`,
    photo: `<svg${cls} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 6C4 4.895 4.895 4 6 4H18C19.105 4 20 4.895 20 6V18C20 19.105 19.105 20 18 20H6C4.895 20 4 19.105 4 18V6Z" stroke="currentColor" stroke-width="1.8"/><path d="M8 15L10.5 12.5L13 15L16 11L19 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/></svg>`,
  };
  return icons[iconName] || `<span${cls}>${escapeHtml(iconName)}</span>`;
}

// ---- 7) QR generation ----
// ---- 7) QR generation ----
// Uses the qrcode npm package loaded as an ESM module via esm.sh.
// SVG output is injected directly so the code scales perfectly at any size
// and never has the 0×0 canvas problem of hidden containers.
let _qrLib = null;

async function loadQRLib() {
  if (_qrLib) return _qrLib;
  try {
    const mod = await import("https://esm.sh/qrcode@1.5.4?bundle");
    _qrLib = mod.default || mod;
    return _qrLib;
  } catch (e) {
    console.warn("[TomeVault] QR library failed to load:", e);
    return null;
  }
}

async function renderQR(joinUrl) {
  if (!qrBox) return;
  qrBox.innerHTML = "";
  const QRLib = await loadQRLib();
  if (!QRLib) {
    // Graceful fallback: show the raw URL so the GM can still copy-share it.
    qrBox.innerHTML = `<p class="muted small" style="padding:12px;word-break:break-all;max-width:220px">${escapeHtml(joinUrl)}</p>`;
    return;
  }
  try {
    const isLight = document.body.dataset.theme === "light";
    const svg = await QRLib.toString(joinUrl, {
      type: "svg",
      width: 240,
      margin: 2,
      color: { dark: isLight ? "#2c2340" : "#1a0d2e", light: isLight ? "#f8f5ff" : "#ffffff" },
    });
    qrBox.innerHTML = svg;
    // Ensure the injected SVG fills the container.
    const svgEl = qrBox.querySelector("svg");
    if (svgEl) {
      svgEl.setAttribute("width", "100%");
      svgEl.setAttribute("height", "100%");
      svgEl.style.display = "block";
    }
  } catch (e) {
    console.warn("[TomeVault] QR render failed:", e);
    qrBox.innerHTML = `<p class="muted small" style="padding:12px;word-break:break-all">${escapeHtml(joinUrl)}</p>`;
  }
}

// ---- 8) In-app QR scan — native getUserMedia + jsQR ----
// Replaced Html5Qrcode (external CDN dependency, unavailable) with a
// native MediaStream approach: getUserMedia opens the environment camera,
// frames are sampled via requestAnimationFrame, and jsQR (CDN global)
// decodes the barcode pixel-by-pixel without any third-party wrapper.
let _scanRafId = null;

async function startScan() {
  if (!qrReaderWrap) return;

  const videoEl = /** @type {HTMLVideoElement|null} */ ($("scannerVideo"));
  const canvasEl = /** @type {HTMLCanvasElement|null} */ ($("scannerCanvas"));
  if (!videoEl || !canvasEl) return;

  // Show the scanner modal via shared animation path.
  animateModalIn(qrReaderWrap);

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
    });
  } catch (err) {
    if (plJoinMsg) plJoinMsg.textContent = "Camera access denied — enter session tag manually.";
    animateModalOut(qrReaderWrap);
    return;
  }

  // Store raw MediaStream so stopScan() can release tracks.
  state.scan = stream;
  videoEl.srcObject = stream;
  // Required for iOS Safari: playsinline suppresses fullscreen takeover.
  videoEl.setAttribute("playsinline", "");
  try { await videoEl.play(); } catch (_) {}

  const ctx = canvasEl.getContext("2d");
  if (!ctx) return;

  function _onQRDecoded(decodedText) {
    try {
      const { join, pin } = parseInviteUrlFields(decodedText);
      if (join) {
        plSessionId.value = join;
        void hydrateJoinSessionPreview(join);
        if (pin && plPin) plPin.value = pin;
        stopScan();
        if (plNick && !String(plNick.value || "").trim()) plNick.value = getPlayerNickname();
        const nick = String(plNick?.value || "").trim();
        const pinVal = String(plPin?.value || "").trim();
        if (nick && /^\d{4,8}$/.test(pinVal)) {
          if (plJoinMsg) plJoinMsg.textContent = "QR recognized. Joining\u2026";
          joinPlayerSession(plSessionId.value, nick, pinVal)
            .then(ok => { if (!ok && plJoinMsg) plJoinMsg.textContent = "Auto-join failed. Check PIN and try again."; })
            .catch(() => { if (plJoinMsg) plJoinMsg.textContent = "Auto-join failed. Check PIN and try again."; });
        } else if (!nick) {
          if (plJoinMsg) plJoinMsg.textContent = "QR recognized. Enter your name and tap Join.";
          plNick?.focus();
        } else {
          if (plJoinMsg) plJoinMsg.textContent = "QR recognized. Enter PIN and tap Join.";
          plPin?.focus();
        }
      } else {
        if (plJoinMsg) plJoinMsg.textContent = "QR read, but no join-param found.";
      }
    } catch {
      if (plJoinMsg) plJoinMsg.textContent = "QR read, but it\u2019s not a valid invite link.";
    }
  }

  function _tick() {
    // Guard: stop looping once stream is released.
    if (!state.scan) return;
    if (videoEl.readyState >= videoEl.HAVE_ENOUGH_DATA) {
      canvasEl.width = videoEl.videoWidth;
      canvasEl.height = videoEl.videoHeight;
      ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
      const imageData = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
      // jsQR is a CDN global exposed by the <script> tag in index.html.
      // If it hasn't loaded (offline / blocked), degrade gracefully.
      if (typeof jsQR !== "undefined") {
        // eslint-disable-next-line no-undef
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        if (code?.data) {
          _onQRDecoded(code.data);
          return; // exit — stopScan resets state.scan so next raf call exits
        }
      }
    }
    _scanRafId = requestAnimationFrame(_tick);
  }

  _scanRafId = requestAnimationFrame(_tick);
}

function stopScan() {
  // Cancel any pending animation frame first to prevent ghost ticks.
  if (_scanRafId !== null) { cancelAnimationFrame(_scanRafId); _scanRafId = null; }

  // Release camera tracks → turns off the camera LED on mobile.
  if (state.scan instanceof MediaStream) {
    state.scan.getTracks().forEach((t) => t.stop());
  }
  state.scan = null;

  const videoEl = $("scannerVideo");
  if (videoEl) { videoEl.srcObject = null; }

  if (qrReaderWrap) animateModalOut(qrReaderWrap);
}
// BEGINNER NOTE � Authentication overview:
// Firebase Auth handles user identity. This app supports three auth methods:
//   1. Email + password (traditional account)
//   2. Google sign-in (OAuth popup)
//   3. Anonymous / "Guest" (one-shot mode, no account required)
//
// The anonymous-to-permanent upgrade flow is key:
// When a guest creates an account, Firebase "links" the anonymous UID
// to the new credentials. This preserves all Firestore data (sessions,
// handouts, etc.) that was created under the anonymous UID.
//
// Security notes:
// - Passwords require 12+ chars, are checked against a common-passwords list,
//   and must not contain the user's name or email.
// - Password reset uses a generic success message to avoid revealing
//   whether an email exists (prevents user enumeration attacks).

// Validation helpers
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 128;
const COMMON_WEAK_PASSWORDS = new Set([
  "password",
  "password123",
  "123456",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty",
  "qwerty123",
  "111111",
  "abc123",
  "letmein",
  "admin",
  "welcome",
  "iloveyou",
  "dragon",
  "monkey",
  "sunshine",
  "princess",
  "football",
  "baseball",
]);

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateSignUpPassword(password, { email = "", displayName = "", lastName = "" } = {}) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer.`;
  }
  if (/^\s+$/.test(password)) {
    return "Password cannot be only spaces.";
  }

  const normalized = password.toLowerCase();
  const collapsed = normalized.replace(/\s+/g, "");
  if (COMMON_WEAK_PASSWORDS.has(normalized) || COMMON_WEAK_PASSWORDS.has(collapsed)) {
    return "This password is too common. Please choose a more unique passphrase.";
  }

  const emailLocal = String(email).split("@")[0] || "";
  const tokens = [emailLocal, displayName, lastName]
    .flatMap((value) => String(value || "").toLowerCase().split(/[^a-z0-9]+/g))
    .map((value) => value.trim())
    .filter((value) => value.length >= 3);

  if (tokens.some((token) => normalized.includes(token))) {
    return "Password cannot include your name or email.";
  }

  return "";
}

function showFieldError(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("hidden");
}

function clearFieldError(el) {
  if (!el) return;
  el.textContent = "";
  el.classList.add("hidden");
}

function clearAllAuthErrors() {
  [signInEmailErr, signInPasswordErr, signInFormErr,
   signUpIGNErr, signUpEmailErr, signUpPasswordErr, signUpConfirmErr, signUpFormErr,
   authMethodErr
  ].forEach(clearFieldError);
}

// ── reCAPTCHA v3 ─────────────────────────────────────────────────────────────
const RECAPTCHA_SITE_KEY = "6LeMT5EsAAAAABZpKrhXRvmiG2SLIrjUIq5mqeeK";
const RECAPTCHA_VERIFY_ENDPOINT = "/api/verifyRecaptcha";

async function executeRecaptcha(action) {
  if (RECAPTCHA_SITE_KEY === "YOUR_SITE_KEY") return null; // not yet configured
  if (!window.grecaptcha) return null; // script not loaded
  try {
    await new Promise((resolve) => window.grecaptcha.ready(resolve));
    return await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action });
  } catch (e) {
    console.warn("reCAPTCHA execution failed:", e);
    return null;
  }
}

async function verifyRecaptchaToken(action, token) {
  const res = await fetch(RECAPTCHA_VERIFY_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, token }),
  });

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  return {
    ok: res.ok,
    success: payload?.success === true,
    message: payload?.message || "Security verification failed.",
  };
}

async function requireRecaptcha(action) {
  const token = await executeRecaptcha(action);
  if (!token) {
    const err = new Error("Security check unavailable. Refresh and try again.");
    err.code = "recaptcha/unavailable";
    throw err;
  }

  const verification = await verifyRecaptchaToken(action, token);
  if (!verification.ok || !verification.success) {
    const err = new Error(verification.message || "Security verification failed.");
    err.code = "recaptcha/failed";
    throw err;
  }
}

function setSubmitLoading(btn, loading) {
  if (!btn) return;
  btn.classList.toggle("is-loading", loading);
  btn.disabled = loading;
}

// Map Firebase auth error codes to user-friendly messages
function friendlyAuthError(code) {
  const map = {
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-credential": "Invalid email or password.",
    "auth/email-already-in-use": "An account with that email already exists. Try signing in instead.",
    "auth/weak-password": "Password is too weak. Use at least 12 characters and avoid common passwords.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "auth/popup-closed-by-user": "Sign-in popup was closed. Try again.",
    "auth/cancelled-popup-request": "Sign-in was interrupted. Please try again.",
    "auth/popup-blocked": "Popup was blocked by the browser. Please allow popups or use the redirect flow.",
    "auth/operation-not-allowed": "This sign-in method is not enabled in Firebase Authentication yet.",
    "auth/configuration-not-found": "Authentication is not fully configured in Firebase for this project yet.",
    "auth/invalid-api-key": "Firebase API key is invalid for this app configuration.",
    "auth/app-not-authorized": "This app/domain is not authorized for Firebase Authentication.",
    "auth/unauthorized-domain": "This domain is not authorized for Firebase Authentication.",
    "auth/operation-not-supported-in-this-environment": "This browser mode is not fully supported for auth. Please use a normal browser window.",
    "auth/web-storage-unsupported": "Browser storage is blocked. Disable private mode or strict tracking prevention and try again.",
    "auth/account-exists-with-different-credential": "An account already exists with this email using a different sign-in method.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/invalid-email": "Please enter a valid email address.",
    "recaptcha/unavailable": "Security check unavailable. Refresh the page and try again.",
    "recaptcha/failed": "Security verification failed. Please try again.",
  };
  return map[code] || "Something went wrong. Please try again.";
}

function authErrorWithCode(code) {
  const message = friendlyAuthError(code);
  return code ? `${message} (${code})` : message;
}

// Some browsers block local persistence in strict/private mode.
// We fall back to session, then in-memory so auth still works.
async function ensureAuthPersistence() {
  try {
    await setPersistence(auth, browserLocalPersistence);
    return;
  } catch (localErr) {
    console.warn("Auth local persistence unavailable, trying session persistence.", localErr);
  }

  try {
    await setPersistence(auth, browserSessionPersistence);
    return;
  } catch (sessionErr) {
    console.warn("Auth session persistence unavailable, falling back to in-memory.", sessionErr);
  }

  try {
    await setPersistence(auth, inMemoryPersistence);
  } catch (memoryErr) {
    // If this fails too, Firebase will still attempt its default behavior.
    console.warn("Auth in-memory persistence setup failed.", memoryErr);
  }
}

function shouldUseRedirectAuthFlow() {
  const ua = navigator.userAgent || "";
  const isMobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  const hasCoarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches;
  return Boolean(isMobileUA || hasCoarsePointer);
}

async function processRedirectAuthResult() {
  try {
    const result = await getRedirectResult(auth);
    if (!result?.user) return;

    const user = result.user;
    state.uid = user.uid;
    state.isGuest = false;
    state.isSignedIn = true;
    state.displayName = user.displayName || "";
    state.email = user.email || "";

    await ensureFirestoreProfile(user);
    await convertOneShotSessions(user.uid);
    const nick = await requireNickname();
    if (nick) state.displayName = nick;
    updateLandingAuthState();
    showToast("Welcome, " + (state.displayName || "Adventurer") + "!", "success");
  } catch (e) {
    if (e?.code === "auth/no-auth-event") return;
    console.error("Redirect auth result error:", e);
    showToast(friendlyAuthError(e?.code), "error");
  }
}

// Sync the landing page to reflect signed-in vs signed-out state
function updateLandingAuthState() {
  const signedInReal = state.isSignedIn && !state.isGuest;

  if (authCard) authCard.classList.toggle("hidden", signedInReal);
  if (authGuestCta) authGuestCta.classList.toggle("hidden", signedInReal);
  if (landingHome) landingHome.classList.toggle("hidden", !signedInReal);

  if (signedInReal && landingDisplayName) {
    landingDisplayName.textContent = state.displayName || "Adventurer";
  }
  // Show one-shot banner on session screens when guest
  if (oneShotBanner) {
    oneShotBanner.classList.toggle("hidden", !state.isGuest || !state.sessionId);
  }
  if (signedInReal) {
    loadMySessions();
  }
}

const EMPTY_PROFILE_PLACEHOLDER_URLS = [
  "placeholders/emptyProfilePictures/emptyProfilePH1_1.png",
  "placeholders/emptyProfilePictures/emptyProfilePH1_2.png",
  "placeholders/emptyProfilePictures/emptyProfilePH1_3.png",
  "placeholders/emptyProfilePictures/emptyProfilePH1_4.png",
  "placeholders/emptyProfilePictures/emptyProfilePH1_5.png",
  "placeholders/emptyProfilePictures/emptyProfilePH1_6.png",
  "placeholders/emptyProfilePictures/emptyProfilePH1_7.png",
  "placeholders/emptyProfilePictures/emptyProfilePH1_8.png",
  "placeholders/emptyProfilePictures/emptyProfilePH1_9.png",
  "placeholders/emptyProfilePictures/emptyProfilePH1_10.png",
  "placeholders/emptyProfilePictures/emptyProfilePH1_11.png",
  "placeholders/emptyProfilePictures/emptyProfilePH1_12.png",
  "placeholders/emptyProfilePictures/emptyProfilePH1_13.png",
  "placeholders/emptyProfilePictures/emptyProfilePH1_14.png",
  "placeholders/emptyProfilePictures/emptyProfilePH1_15.png",
  "placeholders/emptyProfilePictures/emptyProfilePH2_1.png",
  "placeholders/emptyProfilePictures/emptyProfilePH2_2.png",
  "placeholders/emptyProfilePictures/emptyProfilePH2_3.png",
  "placeholders/emptyProfilePictures/emptyProfilePH2_4.png",
  "placeholders/emptyProfilePictures/emptyProfilePH2_5.png",
  "placeholders/emptyProfilePictures/emptyProfilePH2_6.png",
  "placeholders/emptyProfilePictures/emptyProfilePH2_7.png",
  "placeholders/emptyProfilePictures/emptyProfilePH2_8.png",
  "placeholders/emptyProfilePictures/emptyProfilePH2_9.png",
  "placeholders/emptyProfilePictures/emptyProfilePH2_10.png",
  "placeholders/emptyProfilePictures/emptyProfilePH2_11.png",
  "placeholders/emptyProfilePictures/emptyProfilePH2_12.png",
  "placeholders/emptyProfilePictures/emptyProfilePH2_13.png",
  "placeholders/emptyProfilePictures/emptyProfilePH2_14.png",
];

function getPlaceholderColorKey(url) {
  const match = String(url || "").match(/emptyProfilePH\d+_(\d+)\.png$/i);
  return match?.[1] || "";
}

function buildPlaceholderColorGroups() {
  const groups = new Map();
  EMPTY_PROFILE_PLACEHOLDER_URLS.forEach((url) => {
    const colorKey = getPlaceholderColorKey(url);
    if (!colorKey) return;
    const existing = groups.get(colorKey) || [];
    existing.push(url);
    groups.set(colorKey, existing);
  });
  return groups;
}

const EMPTY_PROFILE_PLACEHOLDER_GROUPS = buildPlaceholderColorGroups();

function pickRandomFromList(items) {
  if (!Array.isArray(items) || items.length === 0) return "";
  return items[Math.floor(Math.random() * items.length)] || "";
}

function extractAssignedPlaceholderColorFromUserData(userData) {
  if (!userData || typeof userData !== "object") return "";

  const candidates = [
    userData?.roleProfiles?.player?.avatarUrl,
    userData?.roleProfiles?.dm?.avatarUrl,
    userData?.avatarUrl,
  ];

  for (const candidate of candidates) {
    const colorKey = getPlaceholderColorKey(candidate);
    if (colorKey) return colorKey;
  }
  return "";
}

async function pickInitialProfilePlaceholderAvatar() {
  const colorKeys = Array.from(EMPTY_PROFILE_PLACEHOLDER_GROUPS.keys());
  if (colorKeys.length === 0) return "";

  try {
    const allUsersSnap = await getDocs(collection(db, "users"));
    const colorCounts = Object.fromEntries(colorKeys.map((key) => [key, 0]));

    allUsersSnap.forEach((userDoc) => {
      const assignedColor = extractAssignedPlaceholderColorFromUserData(userDoc.data());
      if (assignedColor && Object.prototype.hasOwnProperty.call(colorCounts, assignedColor)) {
        colorCounts[assignedColor] += 1;
      }
    });

    const minCount = Math.min(...colorKeys.map((key) => colorCounts[key]));
    const leastUsedColors = colorKeys.filter((key) => colorCounts[key] === minCount);
    const selectedColor = pickRandomFromList(leastUsedColors);
    const selectedGroup = EMPTY_PROFILE_PLACEHOLDER_GROUPS.get(selectedColor) || [];
    return pickRandomFromList(selectedGroup);
  } catch (err) {
    console.warn("Could not balance placeholder color assignment:", err);
    return pickRandomFromList(EMPTY_PROFILE_PLACEHOLDER_URLS);
  }
}

// Write or update the user profile doc in Firestore after sign-up/link
async function ensureFirestoreProfile(user, extraData = {}) {
  if (!user?.uid) return;
  const userRef = doc(db, "users", user.uid);
  const resolvedDisplayName = String(extraData.displayName || user.displayName || "").trim();
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const initialPlaceholderAvatar = await pickInitialProfilePlaceholderAvatar();
      await setDoc(userRef, {
        uid: user.uid,
        displayName: resolvedDisplayName,
        email: user.email || extraData.email || "",
        lastName: extraData.lastName || "",
        createdAt: serverTimestamp(),
        avatarUrl: initialPlaceholderAvatar,
        avatarStoragePath: "",
        quickStats: {},
        roleProfiles: {
          player: {
            displayName: resolvedDisplayName,
            avatarUrl: initialPlaceholderAvatar,
            avatarStoragePath: "",
          },
          dm: {
            displayName: resolvedDisplayName,
            avatarUrl: initialPlaceholderAvatar,
            avatarStoragePath: "",
          },
        },
      });
    } else if (extraData.displayName || extraData.lastName) {
      // Only update if TomeVault explicitly provides a name — never let the auth
      // provider's displayName (e.g. Google account name) overwrite the user's
      // custom in-game name on an existing profile.
      const updates = {};
      const explicitName = String(extraData.displayName || "").trim();
      if (explicitName) {
        updates.displayName = explicitName;
        updates["roleProfiles.player.displayName"] = explicitName;
        updates["roleProfiles.dm.displayName"] = explicitName;
      }
      if (extraData.lastName) updates.lastName = extraData.lastName;
      if (Object.keys(updates).length > 0) await updateDoc(userRef, updates);
    }
  } catch (e) {
    console.warn("ensureFirestoreProfile error:", e);
  }
}

// One-time migration:
// Keep displayName consistent across legacy top-level field and roleProfiles.{player,dm}.
async function runOneTimeRoleDisplayNameMigration(user) {
  const uid = String(user?.uid || "").trim();
  if (!uid) return;

  const migrationKey = `tv:role-name-migrated:v1:${uid}`;
  if (localStorage.getItem(migrationKey) === "1") return;

  const preferredName = String(
    localStorage.getItem("tv_nickname")
    || localStorage.getItem("tv_nick")
    || state.displayName
    || user.displayName
    || ""
  ).trim();

  if (!preferredName) {
    localStorage.setItem(migrationKey, "1");
    return;
  }

  try {
    await setDoc(getUserProfileRef(uid), {
      displayName: preferredName,
      roleProfiles: {
        player: { displayName: preferredName },
        dm: { displayName: preferredName },
      },
      updatedAt: serverTimestamp(),
    }, { merge: true });

    const cachedPlayer = getCachedProfile(uid, "player") || {};
    const cachedDm = getCachedProfile(uid, "dm") || {};
    setCachedProfile(uid, "player", { ...cachedPlayer, displayName: preferredName });
    setCachedProfile(uid, "dm", { ...cachedDm, displayName: preferredName });

    if (auth.currentUser && auth.currentUser.uid === uid && auth.currentUser.displayName !== preferredName) {
      try {
        await updateProfile(auth.currentUser, { displayName: preferredName });
      } catch (profileErr) {
        console.warn("One-time displayName auth sync failed:", profileErr);
      }
    }

    state.displayName = preferredName;
    localStorage.setItem("tv_nickname", preferredName);
    localStorage.setItem("tv_nick", preferredName);
    localStorage.setItem(migrationKey, "1");
  } catch (err) {
    if (isPermissionDenied(err)) {
      localStorage.setItem(migrationKey, "1");
      return;
    }
    console.warn("One-time role displayName migration failed:", err);
  }
}

// Trial system: free campaign access for 30 days after account creation.
// One-shots stay free forever.
// TODO: 6-month archival � a Cloud Function on pubsub.schedule('every 24 hours')
// should query sessions where ALL players' lastSeenAt > 6 months ago, move docs
// to an 'archivedSessions' collection, and delete originals. This requires
// Firebase Cloud Functions (server-side) and is out of scope for client code.
const TRIAL_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

async function checkTrialStatus() {
  if (!state.uid) return false;
  try {
    const userSnap = await getDoc(doc(db, "users", state.uid));
    if (!userSnap.exists()) return true; // new user, will get createdAt on next write
    const data = userSnap.data();
    const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : null;
    if (!createdAt) return true; // no timestamp yet � allow
    const remaining = (createdAt.getTime() + TRIAL_DURATION_MS) - Date.now();
    state.trialDaysLeft = Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
    state.trialHoursLeft = Math.max(0, Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)));
    return remaining > 0;
  } catch (e) {
    console.warn("Trial check failed, allowing access:", e);
    return true; // fail open so users aren't locked out by network issues
  }
}

function getTrialText() {
  if (state.trialDaysLeft === undefined || state.trialDaysLeft === null) return "";
  if (state.trialDaysLeft <= 0) return "Free trial expired � one-shots only";
  const days = state.trialDaysLeft;
  const hours = state.trialHoursLeft || 0;
  const dayPart = `${days} day${days === 1 ? "" : "s"}`;
  const hourPart = hours > 0 ? `, ${hours} hour${hours === 1 ? "" : "s"}` : "";
  return `Free trial: ${dayPart}${hourPart} remaining`;
}

// Convert one-shot sessions to permanent after account creation
async function convertOneShotSessions(uid) {
  if (!uid) return;
  try {
    const q = query(collection(db, "sessions"), where("dmUid", "==", uid), where("isOneShot", "==", true));
    const snap = await getDocs(q);
    const promises = snap.docs.map((d) =>
      updateDoc(doc(db, "sessions", d.id), { isOneShot: false, expiresAt: null })
    );
    await Promise.all(promises);
  } catch (e) {
    console.warn("convertOneShotSessions error:", e);
  }
}

async function cleanupOwnedExpiredOneShots(uid) {
  if (!uid) return;
  try {
    const q = query(collection(db, "sessions"), where("dmUid", "==", uid), where("isOneShot", "==", true));
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map(async (d) => {
      const data = d.data();
      if (!isExpiredOneShotSession(data)) return;
      await tryDeleteExpiredOneShotSession(d.id, data);
    }));
  } catch (e) {
    console.warn("cleanupOwnedExpiredOneShots error:", e);
  }
}

// ================================================================
// ZONE: AUTHENTICATION FLOW
// Purpose: auth state bootstrap, sign-in/up providers, guest mode, session ping.
// ================================================================

// Core auth initializer � returns a promise that resolves on first auth state.
// Does NOT auto-sign-in anonymously; user must choose.
//
// BEGINNER NOTE � onAuthStateChanged:
// This is Firebase's way of saying "call me whenever the user logs in,
// logs out, or the page reloads with a cached session". It fires once
// immediately with the current state, then again on every auth change.
// We wrap it in a Promise so `await initAuth()` in main() blocks until
// we know who the user is (or that nobody is logged in).
function initAuth() {
  return new Promise((resolve) => {
    let resolved = false;
    onAuthStateChanged(auth, (user) => {
      if (user) {
        state.uid = user.uid;
        state.isSignedIn = true;
        state.isGuest = user.isAnonymous;
        state.displayName = user.displayName || "";
        state.email = user.email || "";
        if (resolved) ensureOwnProfileLoaded().catch(() => {});
      } else {
        state.uid = null;
        state.isSignedIn = false;
        state.isGuest = false;
        state.displayName = null;
        state.email = null;
        updateTopBarAvatar("");
      }
      updateLandingAuthState();
      if (!resolved) { resolved = true; resolve(user); }
    });
  });
}

// Sign up with email + password
async function signUpWithEmail() {
  clearAllAuthErrors();
  const ign = signUpIGN?.value?.trim() || "";
  const email = signUpEmail?.value?.trim() || "";
  const pw = signUpPassword?.value || "";
  const pwConfirm = signUpConfirm?.value || "";

  // Validate
  let hasErr = false;
  if (ign.length < 2 || ign.length > 30) {
    showFieldError(signUpIGNErr, "Must be 2�30 characters.");
    hasErr = true;
  }
  if (!isValidEmail(email)) {
    showFieldError(signUpEmailErr, "Please enter a valid email address.");
    hasErr = true;
  }
  const passwordValidationError = validateSignUpPassword(pw, { email, displayName: ign });
  if (passwordValidationError) {
    showFieldError(signUpPasswordErr, passwordValidationError);
    hasErr = true;
  }
  if (!pwConfirm) {
    showFieldError(signUpConfirmErr, "Please re-enter your password.");
    hasErr = true;
  } else if (pw !== pwConfirm) {
    showFieldError(signUpConfirmErr, "Passwords don't match.");
    hasErr = true;
  }
  if (hasErr) return;
  try {
    await requireRecaptcha("sign_up");
  } catch (e) {
    showFieldError(signUpFormErr, authErrorWithCode(e.code));
    return;
  }

  setSubmitLoading(btnSignUp, true);
  showAuthLoading("Creating your account...");
  try {
    let user;
    // If current session is anonymous, link the credential to preserve data
    if (auth.currentUser && auth.currentUser.isAnonymous) {
      const credential = EmailAuthProvider.credential(email, pw);
      const result = await linkWithCredential(auth.currentUser, credential);
      user = result.user;
    } else {
      const result = await createUserWithEmailAndPassword(auth, email, pw);
      user = result.user;
    }
    await updateProfile(user, { displayName: ign });
    // Force refresh so onAuthStateChanged picks up the new displayName
    await user.reload();
    state.displayName = ign;
    state.isGuest = false;
    state.isSignedIn = true;
    state.uid = user.uid;

    await ensureFirestoreProfile(user, { displayName: ign, email });
    await convertOneShotSessions(user.uid);
    const nick = await requireNickname();
    if (nick) state.displayName = nick;

    try {
      await sendEmailVerification(user);
    } catch (verificationErr) {
      console.warn("Verification email send failed:", verificationErr);
    }

    updateLandingAuthState();
    if (!user.emailVerified) {
      showToast("Account created. You're signed in now - please verify your email when convenient.", "info", UI_TIMERS.TOAST_LONG);
    } else {
      showToast("Account created. Welcome to TomeVault!", "success", 4500);
    }
  } catch (e) {
    console.error("Sign up error:", e);
    if (e.code === "auth/email-already-in-use" && auth.currentUser?.isAnonymous) {
      // Can't link � account exists. Inform user to sign in instead.
      showFieldError(signUpFormErr, "That email already has an account. Please sign in instead.");
    } else {
      showFieldError(signUpFormErr, authErrorWithCode(e.code));
    }
  } finally {
    setSubmitLoading(btnSignUp, false);
    hideAuthLoading();
  }
}

// Sign in with email + password
async function signInWithEmailFn() {
  clearAllAuthErrors();
  const email = signInEmail?.value?.trim() || "";
  const pw = signInPassword?.value || "";

  let hasErr = false;
  if (!email) { showFieldError(signInEmailErr, "Enter your email."); hasErr = true; }
  if (!pw) { showFieldError(signInPasswordErr, "Enter your password."); hasErr = true; }
  if (hasErr) return;

  let recaptchaBypassed = false;
  try {
    await requireRecaptcha("sign_in");
  } catch (e) {
    const isRecaptchaFailure = e?.code === "recaptcha/unavailable" || e?.code === "recaptcha/failed";
    if (!isRecaptchaFailure) {
      showFieldError(signInFormErr, authErrorWithCode(e.code));
      return;
    }
    // Keep account access available when reCAPTCHA has infra/false-negative issues.
    recaptchaBypassed = true;
    console.warn("Sign-in reCAPTCHA verification bypassed:", e);
  }

  setSubmitLoading(btnSignIn, true);
  showAuthLoading("Signing you in...");
  try {
    const result = await signInWithEmailAndPassword(auth, email, pw);
    if (!result.user.emailVerified) {
      try {
        await sendEmailVerification(result.user);
      } catch (verificationErr) {
        console.warn("Resend verification failed:", verificationErr);
      }
      showToast("Signed in, but your email is not verified yet. A new verification link was sent.", "info", UI_TIMERS.TOAST_LONG);
    }

    state.uid = result.user.uid;
    state.isGuest = false;
    state.isSignedIn = true;
    state.displayName = result.user.displayName || "";
    state.email = result.user.email || "";
    await ensureFirestoreProfile(result.user);
    const nick = await requireNickname();
    if (nick) state.displayName = nick;
    updateLandingAuthState();
    if (recaptchaBypassed) {
      showToast("Signed in. Security check was unavailable and was bypassed for this attempt.", "info", UI_TIMERS.TOAST_MEDIUM);
    }
    showToast("Welcome back, " + (state.displayName || "Adventurer") + "!", "success");
  } catch (e) {
    console.error("Sign in error:", e);
    showFieldError(signInFormErr, authErrorWithCode(e.code));
  } finally {
    setSubmitLoading(btnSignIn, false);
    hideAuthLoading();
  }
}

// Sign in / sign up with Google (auto-links anonymous accounts)
async function signInWithGoogleFn() {
  if (googleAuthInFlight) {
    showToast("Google sign-in is already in progress...", "info", UI_TIMERS.TOAST_BRIEF);
    return;
  }

  googleAuthInFlight = true;
  clearAllAuthErrors();
  // Google button is on Screen 1 — errors surface to authMethodErr
  const googleErrorTarget = authMethodErr;
  let redirectHandoff = false;
  showAuthLoading("Connecting to Google...");
  try {
    let result;
    if (auth.currentUser && auth.currentUser.isAnonymous) {
      // Attempt to link anonymous account with Google
      try {
        result = await linkWithPopup(auth.currentUser, googleProvider);
      } catch (linkErr) {
        if (linkErr.code === "auth/credential-already-in-use") {
          // Google account already exists � sign in directly
          result = await signInWithPopup(auth, googleProvider);
          showToast("Signed in with existing Google account.", "info", UI_TIMERS.TOAST_SHORT);
        } else {
          throw linkErr;
        }
      }
    } else {
      result = await signInWithPopup(auth, googleProvider);
    }
    const user = result.user;
    state.uid = user.uid;
    state.isGuest = false;
    state.isSignedIn = true;
    state.displayName = user.displayName || "";
    state.email = user.email || "";

    await ensureFirestoreProfile(user);
    await convertOneShotSessions(user.uid);
    const nick = await requireNickname();
    if (nick) state.displayName = nick;

    updateLandingAuthState();
    showToast("Welcome, " + (state.displayName || "Adventurer") + "!", "success");
  } catch (e) {
    if (e.code === "auth/popup-closed-by-user") return; // User cancelled � no error

    if (e.code === "auth/cancelled-popup-request") {
      // Usually caused by overlapping popup attempts (double taps / repeated clicks).
      showToast("Google sign-in was interrupted. Please try again once.", "info", UI_TIMERS.TOAST_SHORT);
      return;
    }

    // If popup auth fails due browser constraints, retry with redirect.
    if (["auth/popup-blocked", "auth/web-storage-unsupported", "auth/operation-not-supported-in-this-environment"].includes(e.code)) {
      try {
        if (auth.currentUser && auth.currentUser.isAnonymous) {
          redirectHandoff = true;
          await linkWithRedirect(auth.currentUser, googleProvider);
        } else {
          redirectHandoff = true;
          await signInWithRedirect(auth, googleProvider);
        }
        return;
      } catch (redirectErr) {
        redirectHandoff = false;
        console.error("Google redirect fallback error:", redirectErr);
        showFieldError(googleErrorTarget, authErrorWithCode(redirectErr.code));
        showToast(authErrorWithCode(redirectErr.code), "error", UI_TIMERS.TOAST_LONG);
        return;
      }
    }

    console.error("Google sign-in error:", e);
    showFieldError(googleErrorTarget, authErrorWithCode(e.code));
    showToast(authErrorWithCode(e.code), "error", UI_TIMERS.TOAST_LONG);
  } finally {
    if (!redirectHandoff) googleAuthInFlight = false;
    if (!redirectHandoff) hideAuthLoading();
  }
}

// Send password reset email
async function sendResetEmailFn() {
  clearAllAuthErrors();
  const email = signInEmail?.value?.trim() || "";
  if (!isValidEmail(email)) {
    showFieldError(signInEmailErr, "Enter your email address first, then click \"Forgot password?\".");
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    showToast("If that email exists, a password reset link has been sent.", "success", UI_TIMERS.TOAST_MED);
  } catch (e) {
    console.error("Reset email error:", e);
    // Show generic message for security (don't reveal if email exists)
    showToast("If that email exists, a password reset link has been sent.", "success", UI_TIMERS.TOAST_MED);
  }
}

// Sign out
// IMPORTANT: Sign-out is more than just Firebase auth � we must also:
// 1. Wipe all in-memory state so stale data doesn't leak into a new session
// 2. Clear localStorage keys so the next page load doesn't auto-resume
// 3. Unsubscribe all Firestore listeners (cleanupListeners) to stop
//    receiving realtime updates for a session we no longer belong to
// 4. Navigate back to landing and update the auth card UI
async function signOutFn() {
  try {
    await signOut(auth);
  } catch (e) {
    console.error("Sign out error:", e);
  }
  // Clear session state
  state.uid = null;
  state.role = null;
  state.sessionId = null;
  state.joinTag = null;
  state.joinLink = null;
  state.dmPinPlain = null;
  state.isGuest = false;
  state.isSignedIn = false;
  state.displayName = null;
  state.email = null;
  state.inventoryItems = [];
  state.wallets = {};
  localStorage.removeItem("tv_role");
  localStorage.removeItem("tv_sessionId");
  localStorage.removeItem("tv_joinTag");
  localStorage.removeItem("tv_lastDmSessionId");
  localStorage.removeItem("tv_nick");
  localStorage.removeItem("tv_dmPin");
  localStorage.removeItem("tv_isGuest");
  cleanupListeners();
  showOnly(SCREEN_KEYS.LANDING);
  showAuthMethodScreen();
  updateLandingAuthState();
  showToast("Signed out.", "info");
}

// Guest one-shot entry (anonymous auth)
async function startGuestOneShot(targetRole = "dm") {
  try {
    const recaptchaAction = targetRole === "player" ? "one_shot_join" : "one_shot_create";
    await requireRecaptcha(recaptchaAction);
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
    state.uid = auth.currentUser.uid;
    state.isGuest = true;
    state.isSignedIn = true;
    localStorage.setItem("tv_isGuest", "1");
    showToast("One-shot mode � your session expires in 24 hours.", "info", UI_TIMERS.TOAST_MED);
    // Navigate directly based on selected guest action
    const openAsPlayer = targetRole === "player";
    state.role = openAsPlayer ? "player" : "dm";
    showOnly(openAsPlayer ? "plJoin" : "dmCreate");
    persistLocal();
  } catch (e) {
    console.error("Guest one-shot error:", e);
    showToast("Could not start guest session. Try again.", "error");
  }
}

// ---- 10) Heartbeat (player lastSeen) ----
let heartbeatTimer = null;

function startHeartbeat() {
  // Heartbeat pattern:
  // Every 20s, player updates lastSeenAt. GM can then see active/online players.
  // serverTimestamp() is used so all clients share server clock semantics.
  stopHeartbeat();
  heartbeatTimer = setInterval(async () => {
    if (!state.sessionId || !state.uid) return;
    const playerRef = doc(db, FIREBASE_PATHS.SESSIONS, state.sessionId, FIREBASE_PATHS.PLAYERS, state.uid);
    try {
      await setDoc(playerRef, { lastSeenAt: serverTimestamp() }, { merge: true });
    } catch {}
  }, UI_TIMERS.HEARTBEAT_MS);
}

function stopHeartbeat() {
  // Prevents duplicate intervals and background updates when leaving a session.
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = null;
}

// ---- 11) Navigation (knoppen) ----
// Pattern note:
// `btn && (btn.onclick = ...)` means "only attach handler if element exists".
// This keeps script robust if HTML structure changes or partial pages are loaded.
btnGoDM && (btnGoDM.onclick = () => {
  // GM role path starts at create-session screen.
  state.role = "dm";
  showOnly(SCREEN_KEYS.DM_CREATE);
  persistLocal();
});

btnGoPlayer && (btnGoPlayer.onclick = () => {
  // Player role path starts at join screen.
  state.role = "player";
  showOnly(SCREEN_KEYS.PL_JOIN);
  persistLocal();
});

// ---- Auth UI wiring ----
// Two-level state:
//   activeAuthView  — which card screen is shown ("method" | "email")
//   activeAuthTab   — which mode is active ("signIn" | "signUp")
let activeAuthView = "method";
let activeAuthTab = "signIn";

function showAuthMethodScreen() {
  activeAuthView = "method";
  authMethodScreen?.classList.remove("hidden");
  authEmailScreen?.classList.add("hidden");
  clearAllAuthErrors();
}

function showAuthEmailScreen() {
  activeAuthView = "email";
  authMethodScreen?.classList.add("hidden");
  authEmailScreen?.classList.remove("hidden");
  clearAllAuthErrors();
  // Focus the first visible input for keyboard accessibility
  requestAnimationFrame(() => {
    const firstInput = authEmailScreen?.querySelector("input:not([disabled])");
    firstInput?.focus();
  });
}

function switchAuthTab(tab) {
  if (!authTabSignIn || !authTabSignUp) return;
  const isSignIn = tab === "signIn";
  activeAuthTab = isSignIn ? "signIn" : "signUp";
  authTabSignIn.classList.toggle("is-active", isSignIn);
  authTabSignUp.classList.toggle("is-active", !isSignIn);
  authTabSignIn.setAttribute("aria-selected", String(isSignIn));
  authTabSignUp.setAttribute("aria-selected", String(!isSignIn));
  // Keep mode selector in sync (Screen 1)
  authModeSignIn?.classList.toggle("is-active", isSignIn);
  authModeSignUp?.classList.toggle("is-active", !isSignIn);
  authModeSignIn?.setAttribute("aria-selected", String(isSignIn));
  authModeSignUp?.setAttribute("aria-selected", String(!isSignIn));
  authSignIn?.classList.toggle("hidden", !isSignIn);
  authSignUp?.classList.toggle("hidden", isSignIn);
  clearAllAuthErrors();
}

function validateConfirmPasswordLive() {
  if (!signUpPassword || !signUpConfirm) return;
  const password = signUpPassword.value || "";
  const confirm = signUpConfirm.value || "";

  if (!confirm) {
    signUpConfirm.setCustomValidity("");
    clearFieldError(signUpConfirmErr);
    return;
  }

  if (password !== confirm) {
    signUpConfirm.setCustomValidity("Passwords do not match.");
    showFieldError(signUpConfirmErr, "Passwords don't match.");
    return;
  }

  signUpConfirm.setCustomValidity("");
  clearFieldError(signUpConfirmErr);
}

authTabSignIn?.addEventListener("click", () => switchAuthTab("signIn"));
authTabSignUp?.addEventListener("click", () => switchAuthTab("signUp"));

// Mode selector on Screen 1
authModeSignIn?.addEventListener("click", () => switchAuthTab("signIn"));
authModeSignUp?.addEventListener("click", () => switchAuthTab("signUp"));

// Email CTA on Screen 1 → go to credential screen
authBtnEmail?.addEventListener("click", () => showAuthEmailScreen());

// Back button on Screen 2 → return to method screen
btnAuthBack?.addEventListener("click", () => showAuthMethodScreen());

// Form submissions
formSignIn?.addEventListener("submit", (e) => { e.preventDefault(); signInWithEmailFn(); });
formSignUp?.addEventListener("submit", (e) => { e.preventDefault(); signUpWithEmail(); });
signUpPassword?.addEventListener("input", () => {
  if (!signUpPasswordErr?.classList.contains("hidden")) {
    const pwError = validateSignUpPassword(signUpPassword.value || "", {
      email: signUpEmail?.value || "",
      displayName: signUpIGN?.value || "",
    });
    if (pwError) showFieldError(signUpPasswordErr, pwError);
    else clearFieldError(signUpPasswordErr);
  }
  validateConfirmPasswordLive();
});
signUpConfirm?.addEventListener("input", validateConfirmPasswordLive);

// Social buttons
btnGoogleContinue?.addEventListener("click", () => signInWithGoogleFn());

// Forgot password
btnForgotPassword?.addEventListener("click", () => sendResetEmailFn());

// Sign out
btnSignOut?.addEventListener("click", () => signOutFn());

// Guest one-shot
btnGuestOneShotCreate?.addEventListener("click", () => startGuestOneShot("dm"));
btnGuestOneShotJoin?.addEventListener("click", () => startGuestOneShot("player"));

// One-shot upgrade banner → switch to sign-up tab on landing
btnOneShotUpgrade?.addEventListener("click", () => {
  showOnly(SCREEN_KEYS.LANDING);
  switchAuthTab("signUp");
  showAuthEmailScreen();
  // Show auth card even if guest is signed in anonymously
  if (authCard) authCard.classList.remove("hidden");
  if (authGuestCta) authGuestCta.classList.add("hidden");
  if (landingHome) landingHome.classList.add("hidden");
});

function isCompactAccordionLayout() {
  return window.matchMedia("(max-width: 800px)").matches;
}

function isCompactPartyLayout() {
  return window.matchMedia("(max-width: 1099px)").matches;
}

function setAccordionState(toggleButton, body, isOpen = false) {
  if (!toggleButton || !body) return;
  const open = isCompactAccordionLayout() ? !!isOpen : true;
  body.classList.toggle("is-open", open);
  toggleButton.setAttribute("aria-expanded", open ? "true" : "false");
}

function syncDMFilterToggleState() {
  const hasActiveFilter = String(state.dmFilter || "all").toLowerCase() !== "all";
  const isOpen = !dmFilterRow?.classList.contains("hidden");
  if (btnToggleFilters) {
    btnToggleFilters.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }
  filterActiveBadge?.classList.toggle("hidden", !hasActiveFilter);
}

function applyDMFilterSelection(chip, handouts = state.dmHandoutsRaw) {
  if (!(chip instanceof HTMLElement) || !dmFilterRow) return;
  const filter = chip.dataset.filter || "all";
  state.dmFilter = filter;
  dmFilterRow.querySelectorAll(".chip").forEach((button) => button.classList.remove("chip--active"));
  chip.classList.add("chip--active");
  syncDMFilterToggleState();
  renderDMHandouts(handouts || []);
}

function openCreateHandoutModal(options = {}) {
  const {
    ensureDashboard = false,
    collapseAppearance = false,
    restoreDraftValues = false,
    resetImageFrameState = false,
    renderSuggestions = false,
  } = options;

  if (ensureDashboard && currentScreenKey !== SCREEN_KEYS.DM_DASH) {
    showOnly(SCREEN_KEYS.DM_DASH);
  }

  syncCreateTypeDependentUI();
  createClaimableDraft = false;
  createRevealDraft = false;
  pendingHandoutImageUrl = null;
  pendingHandoutNugget = false;
  if (resetImageFrameState) resetCreateImageFrame();
  if (handoutImageStatus) handoutImageStatus.textContent = "";
  if (handoutImageUpload) handoutImageUpload.value = "";
  if (restoreDraftValues) restoreCreateDraft();
  syncCreateTypeDependentUI();
  syncCreateRevealButton();
  syncCreateClaimableButton();
  if (collapseAppearance) setAccordionState(btnCreateAppearanceToggle, createAppearanceBody, false);
  setImagePickerOpen(false);
  if (renderSuggestions) renderIconSuggestions();
  animateModalIn(createHandoutModal);
}

function openInventoryScreen() {
  showOnly(SCREEN_KEYS.PLAYER_INVENTORY);
  renderInventoryScreen();
}

function openNotesScreen() {
  showOnly(SCREEN_KEYS.NOTES);
  loadNotesForCurrentSession();
}

function openHandoutsHomeScreen() {
  const target = state.role === "dm" ? SCREEN_KEYS.DM_DASH : SCREEN_KEYS.PLAYER_VIEW;
  showOnly(target);
  // Ensure social mode is closed so the handouts panel is visible.
  if (target === SCREEN_KEYS.DM_DASH) setDMSocialMode(false);
}

function setPartyPanelCollapsed(panel, toggleButton, collapsed) {
  if (!panel || !toggleButton) return;
  const isCollapsed = isCompactPartyLayout() ? !!collapsed : false;
  panel.classList.toggle("is-collapsed", isCollapsed);
  toggleButton.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
}

function syncResponsivePanelState() {
  setAccordionState(btnCreateAppearanceToggle, createAppearanceBody, false);
  setAccordionState(btnProfileAbilityToggle, profileAbilityScoresBody, false);
  setPartyPanelCollapsed(dmPartyPanel, btnCollapseParty, dmPartyPanel?.classList.contains("is-collapsed") ?? isCompactPartyLayout());
  setPartyPanelCollapsed(playerPartyPanel, btnCollapsePlayerParty, playerPartyPanel?.classList.contains("is-collapsed") ?? isCompactPartyLayout());
  syncDMFilterToggleState();
}

// Early fallback wiring for GM dashboard controls.
// This ensures key controls still respond even if a later script section aborts.
function wireDashboardFallbackControls() {
  dmFilterRow?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const chip = target.closest(".chip");
    if (!(chip instanceof HTMLElement)) return;
    applyDMFilterSelection(chip, state.dmHandoutsRaw || []);
  });

  // Social button is handled by the role-aware listener registered later.

  // Ambience button is handled by the role-aware listener registered later.

  btnOpenCreateHandout && (btnOpenCreateHandout.onclick = () => {
    if (btnOpenCreateHandout.disabled) return;
    openCreateHandoutModal({
      ensureDashboard: true,
      collapseAppearance: true,
      renderSuggestions: true,
    });
  });

  btnOpenInventory && (btnOpenInventory.onclick = () => {
    if (btnOpenInventory.disabled) return;
    openInventoryScreen();
  });

  btnOpenNotes && (btnOpenNotes.onclick = () => {
    if (btnOpenNotes.disabled) return;
    openNotesScreen();
  });

  btnOpenHandouts && (btnOpenHandouts.onclick = () => {
    openHandoutsHomeScreen();
  });
}

// ================================================================
// ZONE: SESSION & CONTENT RUNTIME
// Purpose: session lifecycle, handouts, party, inventory, ambience, and modals.
// ================================================================

wireDashboardFallbackControls();

// ---- New navigation wiring ----

// Brand home button in top bar ? navigate to session home
btnBrandHome && (btnBrandHome.onclick = () => {
  showOnly(getDefaultRoleScreen());
});

// Hamburger FAB � toggle speed-dial on tap, draggable on long-press (3s hold)
if (btnHamburger) {
  let fabDragTimer = 0;
  let fabDragging = false;
  let fabStartX = 0, fabStartY = 0;

  // Restore saved position from localStorage
  try {
    const saved = JSON.parse(localStorage.getItem("tv_fabPos") || "null");
    if (saved && typeof saved.right === "number" && typeof saved.bottom === "number") {
      btnHamburger.style.right = saved.right + "px";
      btnHamburger.style.bottom = saved.bottom + "px";
      // Also reposition speed-dial above the FAB
      if (hamburgerSpeedDial) {
        hamburgerSpeedDial.style.right = saved.right + "px";
        hamburgerSpeedDial.style.bottom = (saved.bottom + 80) + "px";
      }
    }
  } catch (_) {}

  function startFabDrag(e) {
    fabStartX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    fabStartY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    fabDragTimer = setTimeout(() => {
      fabDragging = true;
      btnHamburger.classList.add("is-dragging");
      btnHamburger.setPointerCapture?.(e.pointerId);
      navigator.vibrate?.(50);
      showToast("Drag to reposition", "info", UI_TIMERS.FAB_DRAG_TOAST_MS);
    }, UI_TIMERS.FAB_HOLD_MS);
  }

  function moveFab(e) {
    if (!fabDragging) {
      // Cancel hold if user moves finger before timer fires
      const dx = (e.clientX ?? 0) - fabStartX;
      const dy = (e.clientY ?? 0) - fabStartY;
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        clearTimeout(fabDragTimer);
        fabDragTimer = 0;
      }
      return;
    }
    e.preventDefault();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cx = e.clientX ?? e.touches?.[0]?.clientX ?? vw / 2;
    const cy = e.clientY ?? e.touches?.[0]?.clientY ?? vh / 2;
    // Constrain to bottom-right quadrant
    const newRight = Math.max(10, Math.min(vw * 0.5, vw - cx - 28));
    const newBottom = Math.max(10, Math.min(vh * 0.5, vh - cy - 28));
    btnHamburger.style.right = newRight + "px";
    btnHamburger.style.bottom = newBottom + "px";
    if (hamburgerSpeedDial) {
      hamburgerSpeedDial.style.right = newRight + "px";
      hamburgerSpeedDial.style.bottom = (newBottom + 80) + "px";
    }
  }

  function endFabDrag() {
    clearTimeout(fabDragTimer);
    fabDragTimer = 0;
    if (fabDragging) {
      fabDragging = false;
      btnHamburger.classList.remove("is-dragging");
      // Save position
      try {
        localStorage.setItem("tv_fabPos", JSON.stringify({
          right: parseFloat(btnHamburger.style.right) || 20,
          bottom: parseFloat(btnHamburger.style.bottom) || 60,
        }));
      } catch (_) {}
    }
  }

  btnHamburger.addEventListener("pointerdown", startFabDrag);
  btnHamburger.addEventListener("pointermove", moveFab);
  btnHamburger.addEventListener("pointerup", (e) => {
    if (fabDragging) {
      endFabDrag();
      return;
    }
    clearTimeout(fabDragTimer);
    fabDragTimer = 0;
    // Normal click � toggle speed-dial
    toggleHamburgerSpeedDial();
  });
  btnHamburger.addEventListener("pointercancel", endFabDrag);
}

// Settings drawer backdrop click closes
settingsDrawerBackdrop && (settingsDrawerBackdrop.onclick = () => {
  closeSettingsDrawer();
});

btnDialSettings && (btnDialSettings.onclick = () => {
  closeHamburgerSpeedDial();
  openSettingsDrawer();
});

// Share invite button in social panel
btnShareInviteSocial && (btnShareInviteSocial.onclick = () => {
  shareSessionInvite();
});

btnOpenAtmospherePanel?.addEventListener("click", () => {
  btnOpenAmbienceBar?.click();
});

window.addEventListener("resize", () => {
  syncResponsivePanelState();
  if (currentScreenKey === SCREEN_KEYS.DM_DASH) syncDMDashboardLayout();
});

btnToggleFilters?.addEventListener("click", () => {
  dmFilterRow?.classList.toggle("hidden");
  syncDMFilterToggleState();
});

btnCreateAppearanceToggle?.addEventListener("click", () => {
  if (!isCompactAccordionLayout()) return;
  const nextOpen = btnCreateAppearanceToggle.getAttribute("aria-expanded") !== "true";
  setAccordionState(btnCreateAppearanceToggle, createAppearanceBody, nextOpen);
});

btnProfileAbilityToggle?.addEventListener("click", () => {
  if (!isCompactAccordionLayout()) return;
  const nextOpen = btnProfileAbilityToggle.getAttribute("aria-expanded") !== "true";
  setAccordionState(btnProfileAbilityToggle, profileAbilityScoresBody, nextOpen);
});

btnCollapseParty?.addEventListener("click", () => {
  const collapsed = !dmPartyPanel?.classList.contains("is-collapsed");
  setPartyPanelCollapsed(dmPartyPanel, btnCollapseParty, collapsed);
});

btnCollapsePlayerParty?.addEventListener("click", () => {
  const collapsed = !playerPartyPanel?.classList.contains("is-collapsed");
  setPartyPanelCollapsed(playerPartyPanel, btnCollapsePlayerParty, collapsed);
});

syncResponsivePanelState();

// Social toggle in top bar (GM only)
btnTopBarSocial && (btnTopBarSocial.onclick = () => {
  if (currentScreenKey !== SCREEN_KEYS.DM_DASH) {
    showOnly(SCREEN_KEYS.DM_DASH);
    setDMSocialMode(true);
    return;
  }
  const opening = !dmSplit?.classList.contains("social-mode");
  setDMSocialMode(opening);
});

// Profile button in bottom bar
btnOpenProfile && (btnOpenProfile.onclick = () => {
  showOnly(SCREEN_KEYS.PROFILE);
  renderProfileScreen();
});

// GM floating action button � opens create handout modal
gmFab && (gmFab.onclick = () => {
  if (state.role !== "dm") return;
  openCreateHandoutModal({ collapseAppearance: true });
});

// Inline create handout button (replaces floating gmFab)
const btnCreateHandoutInline = $("btnCreateHandoutInline");
if (btnCreateHandoutInline) {
  btnCreateHandoutInline.onclick = () => {
    if (state.role !== "dm") return;
    openCreateHandoutModal({ collapseAppearance: true });
  };
}

// Profile tab bar switching (Stats / Spells)
const profileTabBar = $("profileTabBar");
if (profileTabBar) {
  profileTabBar.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-profile-tab]");
    if (!chip) return;
    const tab = chip.dataset.profileTab;
    profileTabBar.querySelectorAll(".chip").forEach(c => c.classList.remove("chip--active"));
    chip.classList.add("chip--active");
    const statsPane = $("profileStatsPane");
    const spellsPane = $("profileSpellsPane");
    if (statsPane) statsPane.classList.toggle("hidden", tab !== "stats");
    if (spellsPane) spellsPane.classList.toggle("hidden", tab !== "spells");
  });
}

// Profile edit button ? opens existing settings profile editor
const btnProfileEdit = $("btnProfileEdit");
btnProfileEdit && (btnProfileEdit.onclick = () => {
  openProfileEditor(state.uid, "profile").catch(console.warn);
});

// GM profile buttons
const btnGMProfileEdit = $("btnGMProfileEdit");
btnGMProfileEdit && (btnGMProfileEdit.onclick = () => {
  openProfileEditor(state.uid, "profile").catch(console.warn);
});

// GM campaign notes button
const btnGMProfileNotes = $("btnGMProfileNotes");
btnGMProfileNotes && (btnGMProfileNotes.onclick = () => {
  showOnly(SCREEN_KEYS.NOTES);
  loadNotesForCurrentSession();
});

// ---- Dynamic session list on landing page ----
// Queries Firestore for sessions owned by or joined by the current user
// and renders them in the "Your sessions" list on the landing screen.
//
// Generation counter: each call captures `thisGen` at the start. Before any DOM
// write we check that no newer call has started since; if one has, this call's
// results are silently discarded. This prevents duplicate cards when two calls
// (e.g. the leave-handler and an auth-state refresh) race each other.
let _mySessionsGen = 0;
async function loadMySessions() {
  if (!landingSessionList) return;
  if (!state.uid) return;

  const thisGen = ++_mySessionsGen;

  // Clear previous entries
  landingSessionList.innerHTML = "";
  if (landingSessionEmpty) landingSessionEmpty.classList.remove("hidden");
  if (landingSessionCount) landingSessionCount.textContent = "";

  try {
    // Query sessions where current user is the GM.
    // Uses only equality filter (no orderBy) to avoid requiring a composite Firestore index.
    // Results are sorted client-side instead.
    const dmQuery = query(
      collection(db, "sessions"),
      where("dmUid", "==", state.uid)
    );
    const dmSnap = await getDocs(dmQuery);

    const sessions = [];

    for (const d of dmSnap.docs) {
      const data = d.data();
      if (isExpiredOneShotSession(data)) {
        await tryDeleteExpiredOneShotSession(d.id, data);
        continue;
      }
      sessions.push({
        id: d.id,
        joinTag: data.joinTag || d.id,
        name: data.name || "Untitled Session",
        role: "DM",
        updatedAt: data.updatedAt,
        createdAt: data.createdAt,
      });
    }

    // Sort client-side: newest first
    sessions.sort((a, b) => {
      const ams = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0);
      const bms = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0);
      return bms - ams;
    });

    // Also check sessions the user has joined as a player.
    // This list persists across leaves and is pruned when memberships go stale.
    const storedSessionId = localStorage.getItem("tv_sessionId") || "";
    const storedRole = localStorage.getItem("tv_role") || "";
    const joinedEntries = getJoinedSessionEntries();
    if (storedSessionId && storedRole === "player" && !joinedEntries.some((entry) => entry.sessionId === storedSessionId)) {
      joinedEntries.unshift({
        sessionId: storedSessionId,
        joinTag: String(localStorage.getItem("tv_joinTag") || storedSessionId),
        sessionName: "",
        lastSeenAtMs: Date.now(),
      });
    }

    const verifiedJoinedEntries = [];
    for (const entry of joinedEntries) {
      const entrySessionId = String(entry?.sessionId || "").trim();
      if (!entrySessionId) continue;
      const alreadyListed = sessions.some((session) => session.id === entrySessionId);
      if (alreadyListed) {
        verifiedJoinedEntries.push(entry);
        continue;
      }

      try {
        const sessionRef = doc(db, "sessions", entrySessionId);
        const snap = await getDoc(sessionRef);
        if (!snap.exists()) continue;

        const data = snap.data() || {};
        if (isExpiredOneShotSession(data)) {
          await tryDeleteExpiredOneShotSession(entrySessionId, data);
          continue;
        }

        const playerRef = doc(db, "sessions", entrySessionId, "players", state.uid);
        const psnap = await getDoc(playerRef);
        if (!psnap.exists()) continue;

        verifiedJoinedEntries.push({
          sessionId: entrySessionId,
          joinTag: String(data.joinTag || entry.joinTag || entrySessionId),
          sessionName: String(data.name || entry.sessionName || "").trim(),
          lastSeenAtMs: Number(entry?.lastSeenAtMs || Date.now()),
        });

        sessions.push({
          id: entrySessionId,
          joinTag: data.joinTag || entry.joinTag || entrySessionId,
          name: data.name || entry.sessionName || "Untitled Session",
          role: "Player",
          updatedAt: data.updatedAt,
          createdAt: data.createdAt,
        });
      } catch {
        // Skip malformed or unreachable player entries for this refresh.
      }
    }

    saveJoinedSessionEntries(verifiedJoinedEntries);

    // Render session cards
    if (sessions.length === 0) {
      if (thisGen !== _mySessionsGen) return;
      if (landingSessionEmpty) landingSessionEmpty.classList.remove("hidden");
      if (landingSessionCount) landingSessionCount.textContent = "";
      return;
    }

    if (landingSessionEmpty) landingSessionEmpty.classList.add("hidden");
    if (landingSessionCount) landingSessionCount.textContent = `${sessions.length} total`;

    // Guard: discard results if a newer call started while we were awaiting Firestore.
    if (thisGen !== _mySessionsGen) return;

    sessions.forEach((s, idx) => {
      s.__idx = idx;
      const dateStr = s.updatedAt?.toDate
        ? s.updatedAt.toDate().toLocaleDateString()
        : s.createdAt?.toDate
          ? s.createdAt.toDate().toLocaleDateString()
          : "";

      const card = document.createElement("div");
      card.className = "landingSessionItem";
      card.className = "landingSessionItem list-stagger-item";
      card.style.setProperty("--stagger-index", String(s.__idx ?? 0));
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", `Open session: ${s.name}`);
      card.dataset.sessionId = s.id;
      card.dataset.joinTag = s.joinTag || s.id;
      card.dataset.sessionRole = s.role.toLowerCase();
      card.innerHTML = `
        <div class="landingSessionItem__left">
          <span class="tagIcon tagIcon--active" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 4H16L19 7V20H7V4Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
              <path d="M16 4V7H19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
              <path d="M10 11H16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
              <path d="M10 14H16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
            </svg>
          </span>
          <div>
            <div class="landingSessionItem__title">${escapeHtml(s.name)}</div>
            <div class="muted small">${escapeHtml(s.role)} · ${escapeHtml(dateStr)}</div>
          </div>
        </div>
        <span class="muted" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:18px;height:18px;display:block;">
            <path d="M9 6L15 12L9 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>
        </span>
      `;
      landingSessionList.appendChild(card);
    });
  } catch (e) {
    if (thisGen !== _mySessionsGen) return;
    console.warn("Could not load sessions list:", e);
    if (landingSessionEmpty) {
      const hintEl = landingSessionEmpty.querySelector(".emptyState__hint");
      if (hintEl) hintEl.textContent = "Could not load sessions. Check your connection.";
      landingSessionEmpty.classList.remove("hidden");
    }
  }
}

// Delegated click handler for dynamically rendered session cards
if (landingSessionList) {
  const resumeSession = async (sessionId, role, joinTag = "") => {
    if (role === "dm") {
      const ok = await tryResumeDM(sessionId);
      if (ok) return;
    }
    const playerOk = await tryResumePlayer(sessionId);
    if (playerOk) return;
    // Fallback: open join screen with session tag prefilled
    if (plSessionId) plSessionId.value = joinTag || sessionId;
    const rememberedPin = getRememberedJoinedSessionPin(sessionId);
    if (plPin && rememberedPin) plPin.value = rememberedPin;
    state.role = "player";
    showOnly(SCREEN_KEYS.PL_JOIN);
  };

  landingSessionList.addEventListener("click", (e) => {
    const card = e.target.closest(".landingSessionItem");
    if (!card) return;
    const sessionId = card.dataset.sessionId;
    const joinTag = card.dataset.joinTag || "";
    const sessionRole = card.dataset.sessionRole || "dm";
    if (!sessionId) return;
    resumeSession(sessionId, sessionRole, joinTag).catch((err) => {
      console.error("Session resume failed:", err);
      showToast("Could not open session.", "error");
    });
  });

  landingSessionList.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target.closest(".landingSessionItem");
    if (!card) return;
    e.preventDefault();
    const sessionId = card.dataset.sessionId;
    const joinTag = card.dataset.joinTag || "";
    const sessionRole = card.dataset.sessionRole || "dm";
    if (!sessionId) return;
    resumeSession(sessionId, sessionRole, joinTag).catch((err) => {
      console.error("Session resume failed:", err);
      showToast("Could not open session.", "error");
    });
  });
}

btnDMBack && (btnDMBack.onclick = () => { showOnly(SCREEN_KEYS.LANDING); loadMySessions(); });

btnPlayerBack && (btnPlayerBack.onclick = async () => {
  // If scanner is active, stop it before leaving screen.
  await stopScan();
  showOnly(SCREEN_KEYS.LANDING);
});

btnInventoryBack && (btnInventoryBack.onclick = () => {
  const backScreen = state.role === "dm" ? "dmDash" : "plView";
  showOnly(backScreen);
});

btnOpenSettings && (btnOpenSettings.onclick = async () => {
  // Open the slide-in settings drawer (not a full screen navigation)
  openSettingsDrawer();

  // Refresh trial status
  const trialStatus = $("trialStatus");
  const trialText = $("trialText");
  if (trialStatus && trialText && state.isSignedIn && !state.isGuest) {
    await checkTrialStatus();
    const text = getTrialText();
    if (text) {
      trialText.textContent = text;
      trialStatus.classList.remove("hidden");
    } else {
      trialStatus.classList.add("hidden");
    }
  } else if (trialStatus) {
    trialStatus.classList.add("hidden");
  }
});

btnOpenProfileSettings && (btnOpenProfileSettings.onclick = () => {
  openProfileEditor(state.uid, "settings").catch((e) => {
    console.error("Open profile settings failed:", e);
    showToast("Could not open Settings.", "error");
  });
});

btnReplayTutorial && (btnReplayTutorial.onclick = async () => {
  if (!state.sessionId) {
    showToast("Join a session first to replay the tutorial.", "info");
    return;
  }
  const roleKey = normalizeProfileRole(state.role || "player");
  localStorage.removeItem(`tv_onboarded:${roleKey}`);
  localStorage.setItem(`tv_onboardingReplay:${roleKey}`, "1");
  showOnly(getDefaultRoleScreen());
  await delayMs(200);
  startOnboarding({ force: true });
});

btnThemeSystem?.addEventListener("click", () => setThemePreference("system"));
btnThemeDark?.addEventListener("click", () => setThemePreference("dark"));
btnThemeLight?.addEventListener("click", () => setThemePreference("light"));

// ---- Nickname prompt (blocking modal) ----
async function syncNicknameToProfile(nickname) {
  const nick = String(nickname || "").trim();
  if (!nick || !state.uid) return;

  try {
    await setDoc(getUserProfileRef(state.uid), {
      displayName: nick,
      roleProfiles: {
        player: {
          displayName: nick,
        },
        dm: {
          displayName: nick,
        },
      },
      updatedAt: serverTimestamp(),
    }, { merge: true });

    const cachedPlayer = getCachedProfile(state.uid, "player") || {};
    const cachedDm = getCachedProfile(state.uid, "dm") || {};
    setCachedProfile(state.uid, "player", { ...cachedPlayer, displayName: nick });
    setCachedProfile(state.uid, "dm", { ...cachedDm, displayName: nick });

    if (auth.currentUser && auth.currentUser.uid === state.uid && auth.currentUser.displayName !== nick) {
      try {
        await updateProfile(auth.currentUser, { displayName: nick });
      } catch (profileErr) {
        console.warn("Auth displayName sync failed:", profileErr);
      }
    }
  } catch (err) {
    if (!isPermissionDenied(err)) {
      console.warn("Nickname profile sync failed:", err);
    }
  }

  if (!state.sessionId) return;
  try {
    await setDoc(doc(db, "sessions", state.sessionId, "players", state.uid), {
      nickname: nick,
      lastSeenAt: serverTimestamp(),
      isNpc: false,
      isRevealed: true,
      initiative: null,
    }, { merge: true });
  } catch (err) {
    console.warn("Nickname session sync failed:", err);
  }
}

function requireNickname(options = {}) {
  return new Promise((resolve) => {
    const forcePrompt = options?.forcePrompt === true;
    // Check existing sources first (in priority order)
    const existing = state.displayName
      || state.nickname
      || state.playerNick
      || localStorage.getItem("tv_nickname")
      || localStorage.getItem("tv_nick");
    if (!forcePrompt && existing && existing.trim()) {
      const normalized = existing.trim();
      state.displayName = normalized;
      state.nickname = normalized;
      state.playerNick = normalized;
      syncNicknameToProfile(normalized).catch(() => {});
      resolve(normalized);
      return;
    }
    if (!nicknameModal || !nicknameInput || !btnNicknameConfirm) {
      resolve("");
      return;
    }
    nicknameInput.value = "";
    animateModalIn(nicknameModal);
    nicknameInput.focus();
    function confirm() {
      const val = nicknameInput.value.trim();
      if (!val) {
        nicknameInput.focus();
        return;
      }
      btnNicknameConfirm.removeEventListener("click", confirm);
      nicknameInput.removeEventListener("keydown", onKey);
      animateModalOut(nicknameModal);
      // Persist
      state.nickname = val;
      state.playerNick = val;
      state.displayName = val;
      if (plNick) plNick.value = val;
      localStorage.setItem("tv_nickname", val);
      localStorage.setItem("tv_nick", val);
      syncNicknameToProfile(val).catch(() => {});
      resolve(val);
    }
    function onKey(e) {
      if (e.key === "Enter") confirm();
    }
    btnNicknameConfirm.addEventListener("click", confirm);
    nicknameInput.addEventListener("keydown", onKey);
  });
}

// ---- Role switching in Settings ----
btnSwitchToPlayer && (btnSwitchToPlayer.onclick = async () => {
  // GM instant-switches to player view of the same session.
  // Prompt for character name if first time
  await requireNickname();
  state.role = "player";
  persistLocal();
  settingsReturnScreenKey = SCREEN_KEYS.PLAYER_VIEW;
  await openPlayerView(state.sessionName || "Session");
  showToast("Switched to Player view.");
});

btnSwitchToDM && (btnSwitchToDM.onclick = async () => {
  // Check if user is the session owner (dmUid match) � skip PIN entirely.
  try {
    const sessionRef = doc(db, "sessions", state.sessionId);
    const snap = await getDoc(sessionRef);
    if (snap.exists() && snap.data().dmUid === state.uid) {
      // Also restore cached PIN if available.
      const cachedPin = state.dmPinPlain || localStorage.getItem("tv_dmPin");
      if (cachedPin) state.dmPinPlain = cachedPin;
      state.role = "dm";
      persistLocal();
      if (dmPinPrompt) dmPinPrompt.classList.add("hidden");
      settingsReturnScreenKey = SCREEN_KEYS.DM_DASH;
      await openDMDashboard(snap.data().name || state.sessionName || "Session");
      showToast("Switched to DM mode.");
      return;
    }
    // Not the owner � check if a DM transfer PIN has been set.
    if (!snap.exists() || !snap.data().dmTransferPinHash) {
      showToast("The DM has not set a transfer PIN. Ask the DM to set one first.", "error");
      return;
    }
  } catch (e) { console.warn("Ownership check failed, falling back to PIN:", e); }
  // Show DM Transfer PIN prompt.
  if (dmPinPrompt) {
    dmPinPrompt.classList.remove("hidden");
    btnSwitchToDM.classList.add("hidden");
    if (switchDMPinInput) { switchDMPinInput.value = ""; switchDMPinInput.focus(); }
  }
});

btnCancelSwitchDM && (btnCancelSwitchDM.onclick = () => {
  if (dmPinPrompt) dmPinPrompt.classList.add("hidden");
  if (btnSwitchToDM) btnSwitchToDM.classList.remove("hidden");
});

btnConfirmSwitchDM && (btnConfirmSwitchDM.onclick = async () => {
  const pin = switchDMPinInput?.value?.trim() || "";
  if (!pin) { showToast("Please enter the DM Transfer PIN.", "error"); return; }
  try {
    const pinHash = await sha256(pin);
    const sessionRef = doc(db, "sessions", state.sessionId);
    const snap = await getDoc(sessionRef);
    if (!snap.exists()) { showToast("Session not found.", "error"); return; }
    const sessionData = snap.data();
    // Verify against the DM transfer PIN, NOT the session join PIN.
    if (!sessionData.dmTransferPinHash) {
      showToast("No DM transfer PIN has been set.", "error");
      return;
    }
    if (pinHash !== sessionData.dmTransferPinHash) {
      showToast("Incorrect DM Transfer PIN.", "error");
      return;
    }
    // Transfer PIN matches � update dmUid in Firestore to take over.
    await updateDoc(sessionRef, { dmUid: state.uid, updatedAt: serverTimestamp() });
    // Promote to GM locally.
    state.role = "dm";
    state.dmPinPlain = null; // New DM does not inherit the session join PIN
    state.joinTag = sessionData.joinTag || state.sessionId;
    state.joinLink = `${location.origin}${location.pathname}?join=${encodeURIComponent(state.joinTag)}`;
    persistLocal();
    if (dmPinPrompt) dmPinPrompt.classList.add("hidden");
    settingsReturnScreenKey = "dmDash";
    await openDMDashboard(sessionData.name || state.sessionName || "Session");
    showToast("You are now the DM!");
  } catch (e) {
    console.error("Switch to DM failed:", e);
    showToast("Could not verify PIN.", "error");
  }
});

btnLeaveSession && (btnLeaveSession.onclick = () => {
  rememberCurrentPlayerSessionForList();
  cleanupListeners();
  stopHeartbeat();
  state.role = null;
  state.sessionId = null;
  state.joinTag = null;
  state.sessionName = "";
  state.dmPinPlain = null;
  state.joinLink = null;
  state.dmHandoutsRaw = [];
  state.playerInventoryRaw = [];
  state.activePlayers = [];
  state.partyRoster = [];
  state.battleActive = false;
  state.dmUid = null;
  state.currentTurnUid = null;
  state.turnRound = 1;
  state.inventoryItems = [];
  state.wallets = {};
  localStorage.removeItem("tv_role");
  localStorage.removeItem("tv_sessionId");
  localStorage.removeItem("tv_joinTag");
  localStorage.removeItem("tv_dmPin");
  showOnly(SCREEN_KEYS.LANDING);
  loadMySessions();
  showToast("Left session.");
});

// -- Delete Session (GM) --
// Helper: cascade-delete all docs in a subcollection.
async function deleteSubcollection(sessionId, subName) {
  const snap = await getDocs(collection(db, "sessions", sessionId, subName));
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
}

// Helper: notify every player + GM in the session.
async function broadcastNotification(type, message, payload = {}) {
  if (!state.sessionId) return;
  const playersSnap = await getDocs(collection(db, "sessions", state.sessionId, "players"));
  const uids = playersSnap.docs.map(d => d.id);
  // Also notify the GM (session owner).
  const sessionSnap = await getDoc(doc(db, "sessions", state.sessionId));
  if (sessionSnap.exists()) {
    const dmUid = sessionSnap.data().dmUid;
    if (dmUid && !uids.includes(dmUid)) uids.push(dmUid);
  }
  await Promise.all(uids.map(uid => createNotification(uid, type, message, payload)));
}

let dmSeenHumanPlayerIdsForJoinNotifs = null;

async function notifySessionOnNewPlayers(players) {
  if (state.role !== "dm" || !state.sessionId) return;

  const humanPlayers = (players || []).filter((entry) => entry?.isNpc !== true && entry?.id);
  const currentIds = new Set(humanPlayers.map((entry) => String(entry.id)));

  // Prime baseline from the first snapshot so we only notify true new joins.
  if (!dmSeenHumanPlayerIdsForJoinNotifs) {
    dmSeenHumanPlayerIdsForJoinNotifs = currentIds;
    return;
  }

  const newlyJoined = humanPlayers.filter((entry) => !dmSeenHumanPlayerIdsForJoinNotifs.has(String(entry.id)));
  dmSeenHumanPlayerIdsForJoinNotifs = currentIds;
  if (newlyJoined.length === 0) return;

  for (const joined of newlyJoined) {
    const joinedUid = String(joined.id || "").trim();
    if (!joinedUid) continue;

    const joinedNick = String(joined.nickname || "A new player").trim() || "A new player";
    const targetUids = humanPlayers
      .map((entry) => String(entry.id || "").trim())
      .filter((uid) => uid && uid !== joinedUid);

    if (state.uid && state.uid !== joinedUid && !targetUids.includes(state.uid)) {
      targetUids.push(state.uid);
    }
    if (targetUids.length === 0) continue;

    await Promise.all(targetUids.map((uid) => addDoc(collection(db, "sessions", state.sessionId, "notifications"), {
      targetUid: uid,
      type: "playerJoined",
      message: `${joinedNick} has joined the session.`,
      payload: { joinedUid },
      read: false,
      createdAt: serverTimestamp(),
    })));
  }
}

function buildTemplateFromPlayerSnapshot(playerData = {}, profileData = {}) {
  const quickStats = {};
  PROFILE_STAT_KEYS.forEach((key) => {
    const value = playerData?.quickStats?.[key]
      ?? profileData?.quickStats?.[key]
      ?? playerData?.[key]
      ?? profileData?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      quickStats[key] = value;
    }
  });

  const name = String(profileData?.displayName || playerData?.nickname || playerData?.displayName || "Unknown").trim() || "Unknown";
  return {
    name,
    bio: String(profileData?.bio || playerData?.bio || "").trim(),
    imageUrl: String(profileData?.avatarUrl || playerData?.avatarUrl || "").trim() || null,
    quickStats,
    assignedToUid: null,
    assignmentStatus: "unassigned",
    sourceUid: String(playerData?.id || playerData?.uid || "").trim() || null,
    sourceType: "kickedPlayer",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

async function kickPartyMember(targetUid) {
  if (state.role !== "dm" || !state.sessionId || !targetUid) return;
  const target = (state.partyRoster || []).find((entry) => (entry.id || entry.uid) === targetUid);
  if (!target || target?.isNpc === true || targetUid === state.uid) return;

  const targetName = String(target?.nickname || getOwnerNick(targetUid) || "Player").trim() || "Player";
  const shouldKick = window.confirm(`Kick ${targetName} from this session? They can rejoin later with the session PIN.`);
  if (!shouldKick) return;

  const sid = state.sessionId;
  try {
    closePlayerCard();

    let profileData = {};
    try {
      profileData = await loadUserProfile(targetUid, { role: "player" });
    } catch (_) {
      profileData = {};
    }

    const playerRef = doc(db, "sessions", sid, "players", targetUid);
    const playerSnap = await getDoc(playerRef);
    const playerData = playerSnap.exists() ? { id: targetUid, ...playerSnap.data() } : { id: targetUid, ...target };

    try {
      await addDoc(collection(db, "sessions", sid, "characterTemplates"), buildTemplateFromPlayerSnapshot(playerData, profileData));
    } catch (templateErr) {
      console.warn("Kick profile transfer failed:", templateErr);
    }

    try {
      await createNotification(targetUid, "playerKicked", "The DM removed you from this session. You can rejoin at any time with the session code and PIN.");
    } catch (kickNotifErr) {
      console.warn("Kick notification failed:", kickNotifErr);
    }

    if (state.currentTurnUid === targetUid) {
      state.currentTurnUid = null;
      state.turnRound = Math.max(1, state.turnRound);
    }

    try { await deleteDoc(doc(db, "sessions", sid, "wallets", targetUid)); } catch {}
    const invSnap = await getDocs(collection(db, "sessions", sid, "inventory"));
    await Promise.all(invSnap.docs.filter((d) => d.data().ownerUid === targetUid).map((d) => deleteDoc(d.ref)));
    await deleteDoc(playerRef);

    await broadcastNotification("playerLeft", `${targetName} was removed from the party.`);
    showToast(`${targetName} was kicked. Their profile is now in Premade Profiles.`, "success");
  } catch (err) {
    console.error("kickPartyMember:", err);
    showToast("Failed to kick player.", "error");
  }
}

async function removeNpcPartyMember(targetUid) {
  if (state.role !== "dm" || !state.sessionId || !targetUid) return;
  const target = (state.partyRoster || []).find((entry) => (entry.id || entry.uid) === targetUid);
  if (!target || target?.isNpc !== true) return;

  const targetName = String(target?.nickname || "NPC").trim() || "NPC";
  const shouldRemove = window.confirm(`Remove ${targetName} from the party?`);
  if (!shouldRemove) return;

  try {
    closePlayerCard();
    if (state.currentTurnUid === targetUid) {
      state.currentTurnUid = null;
      state.turnRound = Math.max(1, state.turnRound);
    }
    await deleteDoc(doc(db, "sessions", state.sessionId, "players", targetUid));
    showToast(`${targetName} removed from party.`, "success");
  } catch (err) {
    console.error("removeNpcPartyMember:", err);
    showToast("Failed to remove NPC.", "error");
  }
}

let dmTemplateStatusSnapshot = null;

async function notifyDMOnTemplateResponses(templates) {
  if (state.role !== "dm" || !state.sessionId || !state.uid) return;
  const nextSnapshot = new Map();

  (templates || []).forEach((template) => {
    const templateId = String(template?.id || "").trim();
    if (!templateId) return;
    nextSnapshot.set(templateId, {
      status: String(template?.assignmentStatus || "").trim().toLowerCase(),
      assignedToUid: String(template?.assignedToUid || "").trim(),
      name: String(template?.name || "Character").trim() || "Character",
    });
  });

  // Prime on first snapshot to avoid notifying for historical records.
  if (!dmTemplateStatusSnapshot) {
    dmTemplateStatusSnapshot = nextSnapshot;
    return;
  }

  for (const [templateId, current] of nextSnapshot.entries()) {
    const previous = dmTemplateStatusSnapshot.get(templateId);
    if (!previous) continue;
    if (previous.status === current.status) continue;
    if (current.status !== "accepted" && current.status !== "rejected") continue;

    const responderUid = current.assignedToUid;
    const responderName = responderUid ? getOwnerNick(responderUid) : "A player";
    const verb = current.status === "accepted" ? "accepted" : "rejected";

    await createNotification(state.uid, "profileOfferResponse", `${responderName} ${verb} "${current.name}".`, {
      templateId,
      responderUid,
      status: current.status,
    });
  }

  dmTemplateStatusSnapshot = nextSnapshot;
}

btnDeleteSession && (btnDeleteSession.onclick = () => {
  if (state.role !== "dm" || !state.sessionId) return;
  if (deleteSessionConfirmInput) deleteSessionConfirmInput.value = "";
  if (btnConfirmDeleteSession) btnConfirmDeleteSession.disabled = true;
  animateModalIn(deleteSessionModal);
  deleteSessionConfirmInput?.focus();
});

deleteSessionConfirmInput && (deleteSessionConfirmInput.oninput = () => {
  const match = deleteSessionConfirmInput.value.trim() === "DELETE";
  if (btnConfirmDeleteSession) btnConfirmDeleteSession.disabled = !match;
});

btnCancelDeleteSession && (btnCancelDeleteSession.onclick = () => {
  animateModalOut(deleteSessionModal);
});

btnConfirmDeleteSession && (btnConfirmDeleteSession.onclick = async () => {
  if (deleteSessionConfirmInput?.value.trim() !== "DELETE") return;
  if (state.role !== "dm" || !state.sessionId) return;
  btnConfirmDeleteSession.disabled = true;
  btnConfirmDeleteSession.textContent = "Deleting�";
  try {
    const sid = state.sessionId;
    // Notify all players before deleting (so the notification listener fires the blocking overlay).
    await broadcastNotification("sessionDeleted", "The Game Master has deleted this session.");
    // Cascade-delete subcollections.
    const subs = ["players", "wallets", "inventory", "handouts", "notifications", "characterTemplates", "pendingTransfer"];
    await Promise.all(subs.map(s => deleteSubcollection(sid, s)));
    // Delete session document itself.
    await deleteDoc(doc(db, "sessions", sid));
    // Clean up locally.
    cleanupListeners();
    stopHeartbeat();
    state.role = null;
    state.sessionId = null;
    state.joinTag = null;
    state.sessionName = "";
    state.dmPinPlain = null;
    state.joinLink = null;
    state.dmHandoutsRaw = [];
    state.playerInventoryRaw = [];
    state.activePlayers = [];
    state.partyRoster = [];
    state.battleActive = false;
    state.dmUid = null;
    state.currentTurnUid = null;
    state.turnRound = 1;
    state.inventoryItems = [];
    state.wallets = {};
    localStorage.removeItem("tv_role");
    localStorage.removeItem("tv_sessionId");
    localStorage.removeItem("tv_joinTag");
    localStorage.removeItem("tv_dmPin");
    animateModalOut(deleteSessionModal);
    showOnly(SCREEN_KEYS.LANDING);
    loadMySessions();
    showToast("Session deleted permanently.");
  } catch (e) {
    console.error("Delete session failed:", e);
    showToast("Failed to delete session.", "error");
    btnConfirmDeleteSession.disabled = false;
    btnConfirmDeleteSession.textContent = "Delete Forever";
  }
});

// -- Discard Session (Player) --
btnDiscardSession && (btnDiscardSession.onclick = () => {
  if (state.role !== "player" || !state.sessionId) return;
  if (discardSessionConfirmInput) discardSessionConfirmInput.value = "";
  if (btnConfirmDiscardSession) btnConfirmDiscardSession.disabled = true;
  animateModalIn(discardSessionModal);
  discardSessionConfirmInput?.focus();
});

discardSessionConfirmInput && (discardSessionConfirmInput.oninput = () => {
  const match = discardSessionConfirmInput.value.trim() === "DISCARD";
  if (btnConfirmDiscardSession) btnConfirmDiscardSession.disabled = !match;
});

btnCancelDiscardSession && (btnCancelDiscardSession.onclick = () => {
  animateModalOut(discardSessionModal);
});

btnConfirmDiscardSession && (btnConfirmDiscardSession.onclick = async () => {
  if (discardSessionConfirmInput?.value.trim() !== "DISCARD") return;
  if (state.role !== "player" || !state.sessionId || !state.uid) return;
  btnConfirmDiscardSession.disabled = true;
  btnConfirmDiscardSession.textContent = "Leaving�";
  try {
    const sid = state.sessionId;
    const uid = state.uid;
    // Try to transfer character profile to GM's premade templates.
    try {
      const playerRef = doc(db, "sessions", sid, "players", uid);
      const playerSnap = await getDoc(playerRef);
      if (playerSnap.exists()) {
        const pd = playerSnap.data();
        if (pd.displayName || pd.nickname) {
          await addDoc(collection(db, "sessions", sid, "characterTemplates"), {
            name: pd.displayName || pd.nickname || "Unknown",
            bio: pd.bio || "",
            avatarUrl: pd.avatarUrl || "",
            level: pd.level ?? null,
            armorRating: pd.armorRating ?? null,
            hitPoints: pd.hitPoints ?? null,
            initiative: pd.initiative ?? null,
            strength: pd.strength ?? null,
            dexterity: pd.dexterity ?? null,
            constitution: pd.constitution ?? null,
            intelligence: pd.intelligence ?? null,
            wisdom: pd.wisdom ?? null,
            charisma: pd.charisma ?? null,
            assignedTo: null,
            createdAt: serverTimestamp(),
          });
        }
      }
    } catch (profileErr) {
      console.warn("Profile transfer to templates failed:", profileErr);
    }
    // Broadcast leave notification before removing data.
    const nick = state.playerNick || state.displayName || "A player";
    await broadcastNotification("playerLeft", `${nick} has left the session permanently.`);
    // Delete player's own wallet and inventory.
    try { await deleteDoc(doc(db, "sessions", sid, "wallets", uid)); } catch {}
    const invSnap = await getDocs(collection(db, "sessions", sid, "inventory"));
    await Promise.all(invSnap.docs.filter(d => d.data().ownerUid === uid).map(d => deleteDoc(d.ref)));
    // Delete player doc.
    await deleteDoc(doc(db, "sessions", sid, "players", uid));
    forgetJoinedSession(sid);
    // Clean up locally.
    cleanupListeners();
    stopHeartbeat();
    state.role = null;
    state.sessionId = null;
    state.joinTag = null;
    state.sessionName = "";
    state.dmPinPlain = null;
    state.joinLink = null;
    state.dmHandoutsRaw = [];
    state.playerInventoryRaw = [];
    state.activePlayers = [];
    state.partyRoster = [];
    state.battleActive = false;
    state.dmUid = null;
    state.currentTurnUid = null;
    state.turnRound = 1;
    state.inventoryItems = [];
    state.wallets = {};
    localStorage.removeItem("tv_role");
    localStorage.removeItem("tv_sessionId");
    localStorage.removeItem("tv_joinTag");
    localStorage.removeItem("tv_dmPin");
    animateModalOut(discardSessionModal);
    showOnly(SCREEN_KEYS.LANDING);
    loadMySessions();
    showToast("You have left the session permanently.");
  } catch (e) {
    console.error("Discard session failed:", e);
    showToast("Failed to leave session.", "error");
    btnConfirmDiscardSession.disabled = false;
    btnConfirmDiscardSession.textContent = "Discard & Leave";
  }
});

// -- Session Deleted overlay (for notified players) --
btnSessionDeletedOk && (btnSessionDeletedOk.onclick = () => {
  cleanupListeners();
  stopHeartbeat();
  state.role = null;
  state.sessionId = null;
  state.joinTag = null;
  state.sessionName = "";
  state.dmPinPlain = null;
  state.joinLink = null;
  state.dmHandoutsRaw = [];
  state.playerInventoryRaw = [];
  state.activePlayers = [];
  state.partyRoster = [];
  state.battleActive = false;
  state.dmUid = null;
  state.currentTurnUid = null;
  state.turnRound = 1;
  state.inventoryItems = [];
  state.wallets = {};
  localStorage.removeItem("tv_role");
  localStorage.removeItem("tv_sessionId");
  localStorage.removeItem("tv_joinTag");
  localStorage.removeItem("tv_dmPin");
  animateModalOut(sessionDeletedModal);
  showOnly(SCREEN_KEYS.LANDING);
  loadMySessions();
});

btnSettingsBack && (btnSettingsBack.onclick = () => {
  const fallback = getDefaultRoleScreen();
  const target = resolveScreenKey(settingsReturnScreenKey || fallback);
  showOnly(target);
});

btnProfileBack && (btnProfileBack.onclick = () => {
  const fallback = "settings";
  const target = resolveScreenKey(settingsProfileReturnScreenKey || fallback);
  showOnly(target);
});

btnSaveProfile && (btnSaveProfile.onclick = () => {
  saveCurrentProfile().catch((e) => {
    console.error("Save profile failed:", e);
    profileSaveMsg && (profileSaveMsg.textContent = "Could not save profile.");
    showToast("Could not save profile.", "error");
  });
});

profileAvatarFile?.addEventListener("click", (event) => {
  const confirmed = confirmNuggetCost("Uploading or changing your profile picture");
  if (!confirmed) {
    event.preventDefault();
    profileAvatarUploadConfirmed = false;
    profileAvatarStatus && (profileAvatarStatus.textContent = "Profile picture upload canceled.");
    return;
  }
  profileAvatarUploadConfirmed = true;
});

profileAvatarFile?.addEventListener("change", () => {
  if (!profileAvatarUploadConfirmed) {
    const confirmed = confirmNuggetCost("Uploading or changing your profile picture");
    if (!confirmed) {
      profileAvatarStatus && (profileAvatarStatus.textContent = "Profile picture upload canceled.");
      profileAvatarFile.value = "";
      return;
    }
    profileAvatarUploadConfirmed = true;
  }
  const file = profileAvatarFile.files?.[0];
  if (!file) return;
  uploadOwnAvatar(file).catch((e) => {
    console.error("Picture upload failed:", e);
    profileAvatarStatus && (profileAvatarStatus.textContent = "Upload failed.");
    showToast("Picture upload failed.", "error");
  }).finally(() => {
    profileAvatarUploadConfirmed = false;
    profileAvatarFile.value = "";
  });
});

btnScanCharacterSheet?.addEventListener("click", () => {
  if (btnScanCharacterSheet.disabled) return;
  openCharacterSheetCamera().catch((err) => {
    console.error("Scan camera open failed:", err);
    profileScanStatus && (profileScanStatus.textContent = "Could not open camera.");
  });
});

btnCaptureCharacterSheet?.addEventListener("click", () => {
  if (btnCaptureCharacterSheet.disabled) return;
  captureCharacterSheetFromCamera().catch((err) => {
    console.error("Capture failed:", err);
    profileScanStatus && (profileScanStatus.textContent = "Capture failed.");
  });
});

btnCloseCharacterSheetCamera?.addEventListener("click", () => {
  stopCharacterSheetCamera();
  profileScanStatus && (profileScanStatus.textContent = "Camera closed.");
});

characterSheetPhoto?.addEventListener("change", () => {
  const file = characterSheetPhoto.files?.[0];
  if (!file) return;
  scanCharacterSheetAndFill(file).finally(() => {
    characterSheetPhoto.value = "";
  });
});

// Start/stop camera scanning manually.
btnScanInApp && (btnScanInApp.onclick = () => startScan());
btnStopScan && (btnStopScan.onclick = () => stopScan());

// ---- QR invite modal (GM) ----
const qrInviteModal = $("qrInviteModal");
const btnShowQRInvite = $("btnShowQRInvite");
const btnCloseQRModal = $("btnCloseQRModal");
const btnShareFromQRModal = $("btnShareFromQRModal");

function openQRInviteModal() {
  if (!state.joinLink) return;
  const qrUrl = state.dmPinPlain
    ? `${state.joinLink}&pin=${encodeURIComponent(state.dmPinPlain)}`
    : state.joinLink;
  // Pre-render before opening so it appears on first frame.
  renderQR(qrUrl);
  animateModalIn(qrInviteModal);
}

btnShowQRInvite && (btnShowQRInvite.onclick = openQRInviteModal);

btnCloseQRModal && (btnCloseQRModal.onclick = () => animateModalOut(qrInviteModal));
qrInviteModal && (qrInviteModal.onclick = (e) => {
  if (e.target === qrInviteModal) animateModalOut(qrInviteModal);
});

const handleCopyJoinLink = async (buttonEl = null) => {
  if (!state.joinLink) return;
  const qrUrl = state.dmPinPlain
    ? `${state.joinLink}&pin=${encodeURIComponent(state.dmPinPlain)}`
    : state.joinLink;
  await copyToClipboard(qrUrl);
  showToast("Join link copied!", "success");
  if (!buttonEl) return;
  // Micro-feedback: swap button text for 1.8 s.
  if (buttonEl.dataset.originalText === undefined) {
    buttonEl.dataset.originalText = buttonEl.textContent.trim();
  }
  const prev = buttonEl.textContent;
  buttonEl.textContent = "Copied!";
  setTimeout(() => { buttonEl.textContent = prev; }, 1800);
};

// Copy join link — primary CTA in QR modal and secondary quick action in social panel.
btnCopyJoinLinkSocial && (btnCopyJoinLinkSocial.onclick = async () => {
  await handleCopyJoinLink(btnCopyJoinLinkSocial);
});

btnCopyJoinLinkModal && (btnCopyJoinLinkModal.onclick = async () => {
  await handleCopyJoinLink(btnCopyJoinLinkModal);
});

btnShareFromQRModal && (btnShareFromQRModal.onclick = () => shareSessionInvite());

// ---- 12) GM: create session ----
// BEGINNER NOTE � Session creation flow:
// 1. Validate inputs (name length, PIN format)
// 2. Hash the PIN with SHA-256 so Firestore never stores the raw digits
// 3. Generate a human-readable joinTag ("cool-dragon-42") for easy sharing
// 4. Write a Firestore document to `sessions/{auto-id}`
// 5. Save state locally (localStorage) for page-reload persistence
// 6. Open the GM dashboard and start realtime listeners
btnCreateSession && (btnCreateSession.onclick = async () => {
  // User feedback first so UI does not feel frozen during async work.
  dmCreateMsg.textContent = "Creating session...";
  btnCreateSession.disabled = true;

  // Safety: ensure we have auth before trying to write
  if (!auth.currentUser) {
    console.warn("[Create] No auth.currentUser � attempting anonymous sign-in...");
    try {
      await signInAnonymously(auth);
      state.uid = auth.currentUser.uid;
      state.isGuest = true;
      state.isSignedIn = true;
    } catch (authErr) {
      console.error("[Create] Auto-auth failed:", authErr);
      dmCreateMsg.textContent = "Not authenticated. Please sign in first.";
      return;
    }
  }
  if (!state.uid) {
    state.uid = auth.currentUser.uid;
  }

  // Trial check: signed-in users get 30 days of free campaign access.
  // One-shot (guest) sessions are always free.
  if (!state.isGuest) {
    const trialOk = await checkTrialStatus();
    if (!trialOk) {
      dmCreateMsg.textContent = "Your free trial has expired. One-shot sessions remain free forever.";
      btnCreateSession.disabled = false;
      return;
    }
  }

  const rawName = String(dmSessionName.value || "").trim();
  if (rawName.length > LIMITS.SESSION_NAME_MAX) {
    dmCreateMsg.textContent = `Session name must be ${LIMITS.SESSION_NAME_MAX} characters or fewer.`;
    btnCreateSession.disabled = false;
    return;
  }
  const name = (rawName || "Untitled Session").slice(0, LIMITS.SESSION_NAME_MAX);
  const pinPlain = dmPin.value.trim();

  if (!/^\d{4,8}$/.test(pinPlain)) {
    dmCreateMsg.textContent = "PIN must be 4�8 digits.";
    btnCreateSession.disabled = false;
    return;
  }

  // Convert PIN to hash before storing/comparing.
  const pinHash = await sha256(pinPlain);
  const joinTag = await generateUniqueJoinTag(name);

  try {
    // Create a new Firestore session document.
    const sessionData = {
      name,
      joinTag,
      pinHash,
      dmUid: state.uid,
      battleActive: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ambience: { track: "tavern", volume: 0.6, isPlaying: false },
      isOneShot: !!state.isGuest,
    };
    // Guest sessions expire after 24 hours
    if (state.isGuest) {
      sessionData.expiresAt = new Date(Date.now() + ONE_SHOT_TTL_MS);
    }
    const ref = await addDoc(collection(db, "sessions"), sessionData);

    state.role = "dm";
    state.sessionId = ref.id;
  state.joinTag = joinTag;
    state.dmPinPlain = pinPlain;
  // Join link includes joinTag in URL query so QR scan can auto-fill join form.
  state.joinLink = buildSessionJoinLink(joinTag);

    persistLocal();
    await openDMDashboard(name);
  } catch (e) {
    console.error("Session creation error:", e);
    let msg = "Could not create session.";
    if (e.code === "permission-denied" || e.message?.includes("permission")) {
      msg += " Firestore rules denied the write. Make sure your security rules allow authenticated users to create sessions.";
    } else if (e.code === "unauthenticated" || e.message?.includes("unauthenticated")) {
      msg += " You are not authenticated. Please sign in or start a one-shot session first.";
    } else if (!navigator.onLine) {
      msg += " You appear to be offline.";
    } else {
      msg += " " + (e.message || "Check Firebase config + rules.");
    }
    if (IS_LOCALHOST) {
      msg += " (localhost � check browser console for details)";
    }
    dmCreateMsg.textContent = msg;
    btnCreateSession.disabled = false;
  }
});

async function openDMDashboard(sessionName) {
  requestWakeLock();
  // Entering GM dashboard performs three responsibilities:
  // 1) Paint UI metadata (title, session id, pin, QR code)
  // 2) Wire copy/share actions for the invite link
  // 3) Subscribe to realtime data (session doc, handouts, players)
  //
  // BEGINNER NOTE � onSnapshot (realtime listeners):
  // Unlike getDocs() which fetches data once, onSnapshot() creates a
  // persistent connection. Firestore pushes updates the instant any client
  // writes a change. This is what makes TomeVault "multiplayer" � the GM
  // adds a handout and every player sees it appear immediately.
  // Each listener returns an unsubscribe function stored in state.unsub*
  // so we can disconnect when leaving the session.
  cleanupListeners();

  // Session name is now shown in Settings; dashboard uses a static wordmark.
  state.sessionName = sessionName || "Session";
  dmSessionIdText.textContent = state.joinTag || state.sessionId;
  dmSessionIdText.title = state.joinTag && state.sessionId
    ? `${state.joinTag} � ${state.sessionId}`
    : (state.joinTag || state.sessionId || "Session");
  dmPinShown.textContent = state.dmPinPlain ?? "(PIN not saved)";
  if (btnChangePin) btnChangePin.textContent = state.dmPinPlain ? "Change" : "Set PIN";
  state.joinLink = buildSessionJoinLink(state.joinTag || state.sessionId);
  const qrUrl = state.dmPinPlain
    ? `${state.joinLink}&pin=${encodeURIComponent(state.dmPinPlain)}`
    : state.joinLink;
  renderQR(qrUrl);

  // Show DM Transfer PIN status from Firestore.
  try {
    const snapForTransfer = await getDoc(doc(db, "sessions", state.sessionId));
    if (snapForTransfer.exists()) {
      const hasTransferPin = !!snapForTransfer.data().dmTransferPinHash;
      if (dmTransferPinShown) dmTransferPinShown.textContent = hasTransferPin ? "Set" : "Not set";
      if (btnChangeTransferPin) btnChangeTransferPin.textContent = hasTransferPin ? "Change" : "Set";
    }
  } catch (_) {}

  // Ambience panel should be hidden by default (opened manually via toolbar).
  if (ambienceBar) {
    ambienceBar.classList.add("hidden");
    ambienceBar.setAttribute("aria-hidden", "true");
    btnOpenAmbienceBar?.classList.remove("is-active");
  }

  // GM sound defaults on for new sessions.
  soundEnabled = true;
  localStorage.setItem("tv_soundEnabled", "1");
  syncAmbienceButtonState(false);
  try { syncSoundToggleUI(); } catch (_) {}

  // Copy helper actions: these reduce friction during live session setup.

  const sessionRef = doc(db, "sessions", state.sessionId);

  // Show skeleton placeholders while first Firestore snapshot loads.
  showSkeletonCards(dmHandoutList, 3);
  

  // Session listener (single document): keeps ambience controls in sync.
  // Also detects DM role changes (demotion when another player takes over).
  state.unsubSession = onSnapshot(sessionRef, async (snap) => {
    if (!snap.exists()) return;
    setLiveTick();
    const s = snap.data();
    state.dmUid = String(s?.dmUid || "").trim() || null;
    state.battleActive = s?.battleActive === true;
    syncPartyBattleUi();
    dmAmbience.value = s.ambience?.track ?? "tavern";
    dmVolume.value = s.ambience?.volume ?? 0.6;
    syncAmbienceButtonState(!!s.ambience?.isPlaying);
    renderAtmospherePanel(s.ambience);
    // Apply ambience locally for GM as well so they hear play/stop immediately
    try { applyAmbience(s.ambience); } catch (e) {}
    // If dmUid changed and we are no longer the DM, auto-demote to player.
    if (s.dmUid && s.dmUid !== state.uid && state.role === "dm") {
      state.role = "player";
      state.dmPinPlain = null;
      localStorage.removeItem("tv_dmPin");
      persistLocal();
      cleanupListeners();
      await requireNickname();
      showToast("Another player has taken over the DM role. You are now a player.", "info");
      await openPlayerView(state.sessionName || "Session");
    }
  });

  // Handouts listener (collection): re-renders GM list whenever handouts change.
  const handoutsRef = collection(db, "sessions", state.sessionId, "handouts");
  state.unsubHandouts = onSnapshot(query(handoutsRef, orderBy("updatedAt", "desc")), (snap) => {
    setLiveTick();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    state.dmHandoutsRaw = items;
    renderDMHandouts(items);
  });

  // Players listener: powers active player list + top player count pill.
  const playersRef = collection(db, "sessions", state.sessionId, "players");
  state.unsubPlayers = onSnapshot(query(playersRef, orderBy("lastSeenAt", "desc")), (snap) => {
    const players = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    notifySessionOnNewPlayers(players).catch((err) => {
      console.warn("playerJoined notification failed:", err);
    });
    renderDMPlayers(players);
  }, (err) => {
    console.error("DM players listener error:", err);
  });

  // Template listener: emits DM notifications when a player accepts/rejects an offer.
  const templatesRef = collection(db, "sessions", state.sessionId, "characterTemplates");
  state.unsubTemplateAssignments = onSnapshot(templatesRef, (snap) => {
    const templates = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    notifyDMOnTemplateResponses(templates).catch((err) => {
      console.warn("profileOfferResponse notification failed:", err);
    });
  }, (err) => {
    console.error("DM templates listener error:", err);
  });

  // reflect initial social panel state in layout
  try {
    syncDMDashboardLayout();
    setDMSocialMode(false);
  } catch (e) {}

  // Subscribe to inventory & wallet data for the inventory screen.
  subscribeInventory();

  // Show bell and subscribe to notifications.
  btnNotifBell?.classList.remove("hidden");
  subscribeNotifications();

  // Subscribe to nugget balance.
  subscribeNuggets();

  showOnly(SCREEN_KEYS.DM_DASH);
  ensureOwnProfileLoaded().catch(() => {});

  // Initialize drag-and-drop for handout list
  setTimeout(initDragDrop, 500);

  // First-time onboarding tour
  setTimeout(startOnboarding, 1000);
}

// ---- 13) GM: handouts CRUD ----
// BEGINNER NOTE � CRUD stands for Create, Read, Update, Delete.
// These are the four basic operations on any piece of data.
// In TomeVault, each handout is a Firestore document inside
// `sessions/{sessionId}/handouts/{handoutId}`.
// Creating it here triggers every player's onSnapshot listener,
// which auto-renders the new card on their screen in realtime.
btnAddHandout && (btnAddHandout.onclick = async () => {
  // Build handout payload from form fields.
  const title = dmTitle.value.trim();
  const pub = dmPublic.value.trim();
  const sec = dmSecret.value.trim();
  const type = dmType.value;
  const isMap = isMapHandoutType(type);
  const iconKey = getActiveIcon();
  const accentColor = getActiveColor();
  const npcDisposition = type === "npc" ? getNpcDisposition() : "";
  let imageUrl = pendingHandoutImageUrl || String(dmImagePreview?.getAttribute("src") || "").trim() || null;

  const validationError = validateHandoutCoreFields({ title, publicContent: pub, type });
  if (validationError) {
    showToast(validationError, "error");
    return;
  }

  if (!isMap && pendingHandoutNugget) {
    const ok = await spendNuggetWithFeedback("handout image");
    if (!ok) return;
    pendingHandoutNugget = false;
  }

  if (isMap && !imageUrl) {
    showToast("Upload a map image first (cost: 1 nugget).", "error");
    return;
  }

  if (!isMap && !imageUrl) {
    const selected = selectBestPlaceholderImage({
      title,
      publicContent: pub,
      type,
      npcDisposition,
    });
    imageUrl = selected?.url || null;
  }

  const imageFrame = imageUrl ? getCreateImageFrameData() : null;

  const handoutsRef = collection(db, "sessions", state.sessionId, "handouts");

// Persist handout under the active session subcollection.
await addDoc(handoutsRef, {
  type,
  title,
  publicContent: pub,
  secretContent: sec,
  iconEmoji: iconKey,
  iconKey,
  accentColor,
  npcDisposition,
  imageUrl: isMap ? null : imageUrl,
  mapImageUrl: isMap ? imageUrl : null,
  mapVisibleToUid: null,
  imageFrame,

  revealed: !!createRevealDraft,
  secretRevealed: false,

  // Claim (alleen relevant voor loot)
  claimable: (String(type).toLowerCase() === "loot") ? !!createClaimableDraft : false,
  claimedByUid: null,
  claimedByNick: null,
  claimedAt: null,

  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

  // Reset form for rapid entry of the next handout.
  dmTitle.value = "";
  dmPublic.value = "";
  dmSecret.value = "";
  clearCreateDraft();
  createRevealDraft = false;
  syncCreateRevealButton();
  setImagePreview("");
  pendingHandoutImageUrl = null;
  pendingHandoutNugget = false;
  if (handoutImageStatus) handoutImageStatus.textContent = "";
  if (handoutImageUpload) handoutImageUpload.value = "";
  createImageHistoryBySeed.clear();
  setImagePickerOpen(false);
  createClaimableDraft = false;
  syncCreateClaimableButton();
  animateModalOut(createHandoutModal);
  showToast("Handout created!", "success");
});

// -- Create-handout draft auto-save (localStorage) --
const CREATE_DRAFT_KEY = "tv_createHandoutDraft";
function saveCreateDraft() {
  try {
    const d = { type: dmType?.value || "", title: dmTitle?.value || "", pub: dmPublic?.value || "", sec: dmSecret?.value || "" };
    if (!d.title && !d.pub && !d.sec) { localStorage.removeItem(CREATE_DRAFT_KEY); return; }
    localStorage.setItem(CREATE_DRAFT_KEY, JSON.stringify(d));
  } catch (_) {}
}
function restoreCreateDraft() {
  try {
    const raw = localStorage.getItem(CREATE_DRAFT_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (dmType && d.type) dmType.value = d.type;
    if (dmTitle && d.title) dmTitle.value = d.title;
    if (dmPublic && d.pub) dmPublic.value = d.pub;
    if (dmSecret && d.sec) dmSecret.value = d.sec;
  } catch (_) {}
}
function clearCreateDraft() { try { localStorage.removeItem(CREATE_DRAFT_KEY); } catch (_) {} }
const _debouncedSaveCreateDraft = debounce(saveCreateDraft, UI_TIMERS.CREATE_DRAFT_DEBOUNCE_MS);
dmTitle?.addEventListener("input", _debouncedSaveCreateDraft);
dmPublic?.addEventListener("input", _debouncedSaveCreateDraft);
dmSecret?.addEventListener("input", _debouncedSaveCreateDraft);
dmType?.addEventListener("change", _debouncedSaveCreateDraft);

if (btnOpenCreateModal) {
  btnOpenCreateModal.onclick = () => {
    if (state.role !== "dm") return;
    openCreateHandoutModal({
      restoreDraftValues: true,
      resetImageFrameState: true,
      renderSuggestions: true,
    });
  };
}

if (btnCloseCreateModal) {
  btnCloseCreateModal.onclick = () => {
    setAccordionState(btnCreateAppearanceToggle, createAppearanceBody, false);
    setImagePickerOpen(false);
    animateModalOut(createHandoutModal);
  };
}

btnHandoutUploadImage?.addEventListener("click", () => handoutImageUpload?.click());
handoutImageUpload?.addEventListener("change", async () => {
  const file = handoutImageUpload.files?.[0];
  if (!file) {
    createHandoutImageUploadConfirmed = false;
    return;
  }
  if (!state.uid) {
    if (handoutImageStatus) handoutImageStatus.textContent = "Sign in is required before uploading images.";
    createHandoutImageUploadConfirmed = false;
    return;
  }
  if (!file.type.startsWith("image/")) {
    if (handoutImageStatus) handoutImageStatus.textContent = "Please select an image file.";
    createHandoutImageUploadConfirmed = false;
    return;
  }
  const isMap = isMapHandoutType(dmType?.value);
  if (!isMap && !createHandoutImageUploadConfirmed) {
    const confirmed = confirmNuggetCost("Uploading or changing this handout portrait");
    if (!confirmed) {
      if (handoutImageStatus) handoutImageStatus.textContent = "Handout portrait upload canceled.";
      handoutImageUpload.value = "";
      return;
    }
    createHandoutImageUploadConfirmed = true;
  }
  if (handoutImageStatus) handoutImageStatus.textContent = isMap ? "Uploading map..." : "Uploading image...";
  const uploaded = isMap
    ? await uploadMapImageToStorage(file, { handoutId: "create" })
    : await uploadHandoutImageToStorage(file, { handoutId: "create" });
  if (!uploaded.ok || !uploaded.url) {
    if (handoutImageStatus) handoutImageStatus.textContent = uploaded.message || "Upload failed.";
    createHandoutImageUploadConfirmed = false;
    handoutImageUpload.value = "";
    return;
  }
  pendingHandoutImageUrl = uploaded.url;
  setImagePreview(pendingHandoutImageUrl);
  pendingHandoutNugget = !isMap;
  if (handoutImageStatus) {
    handoutImageStatus.textContent = isMap
      ? "Map uploaded (1 nugget spent)."
      : "Image uploaded. 1 nugget will be spent when you create this handout.";
  }
  setImagePickerOpen(false);
  createHandoutImageUploadConfirmed = false;
  handoutImageUpload.value = "";
});

if (createHandoutModal) {
  createHandoutModal.onclick = (e) => {
    if (e.target === createHandoutModal) {
      setAccordionState(btnCreateAppearanceToggle, createAppearanceBody, false);
      animateModalOut(createHandoutModal);
    }
  };
}

setupCreateBuilderUI();
// setupInventoryAvatarNav() moved after inventory variable declarations (see below)

function renderDMHandouts(items) {
  // Render pipeline:
  // filter list -> build row HTML -> wire row click -> append to DOM.
  // Render functions follow a simple pattern:
  // clear container -> toggle empty state -> append rows from current data.
  // This is easy to reason about for beginners and avoids stale list entries.
  const queryText = String(state.dmSearchQuery || "").trim().toLowerCase();
  const typeFilter = String(state.dmFilter || "all").toLowerCase();
  const filtered = items.filter((handout) => {
    const handoutType = String(handout.type || "").toLowerCase();
    const matchesType = typeFilter === "all" || handoutType === typeFilter;
    if (!matchesType) return false;

    if (!queryText) return true;
    const title = String(handout.title || "").toLowerCase();
    const publicContent = String(handout.publicContent || "").toLowerCase();
    const secretContent = String(handout.secretContent || "").toLowerCase();
    return title.includes(queryText) || publicContent.includes(queryText) || secretContent.includes(queryText);
  });

  dmHandoutList.innerHTML = "";
  dmHandoutEmpty.classList.toggle("hidden", filtered.length > 0);
  if (filtered.length === 0) {
    const hintEl = dmHandoutEmpty.querySelector(".emptyState__hint");
    if (hintEl) hintEl.textContent = items.length === 0 ? "Tap the + button to create your first handout." : "No handouts match the current filters.";
  }

  const visibilityMetaIcon = (isVisible) => {
    if (isVisible) {
      return `<span class="handoutMetaIcon handoutMetaIcon--visible" title="Visible" aria-label="Visible"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 12s3.8-6 10.5-6 10.5 6 10.5 6-3.8 6-10.5 6S1.5 12 1.5 12z"></path><circle cx="12" cy="12" r="3.2"></circle></svg></span>`;
    }
    return `<span class="handoutMetaIcon handoutMetaIcon--hidden" title="Hidden" aria-label="Hidden"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 12s3.8-6 10.5-6 10.5 6 10.5 6-3.8 6-10.5 6S1.5 12 1.5 12z"></path><circle cx="12" cy="12" r="3.2"></circle><path d="M4 20 20 4"></path></svg></span>`;
  };

  const secretMetaIcon = (isRevealed) => {
    if (isRevealed) {
      return `<span class="handoutMetaIcon handoutMetaIcon--secret" title="Secret revealed" aria-label="Secret revealed"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8.5" cy="15.5" r="3.5"></circle><path d="M12 15.5h8"></path><path d="M17 12.5v6"></path><path d="M20 13.5v4"></path></svg></span>`;
    }
    return `<span class="handoutMetaIcon handoutMetaIcon--secretOff" title="Secret hidden" aria-label="Secret hidden"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8.5" cy="15.5" r="3.5"></circle><path d="M12 15.5h8"></path><path d="M17 12.5v6"></path><path d="M20 13.5v4"></path><path d="M4 20 20 4"></path></svg></span>`;
  };

  const npcDispositionClass = (disposition) => {
    const normalized = String(disposition || "").toLowerCase();
    if (normalized === "friendly") return "tag--npcFriendly";
    if (normalized === "enemy") return "tag--npcEnemy";
    if (normalized === "neutral") return "tag--npcNeutral";
    return "tag--npcUnknown";
  };

  filtered.forEach((h, index) => {
    const row = document.createElement("div");
    row.className = `item list-stagger-item ${h.revealed ? "item--revealed" : ""}`.trim();
    row.dataset.id = h.id;
    row.style.setProperty("--stagger-index", String(index));
    row.style.borderLeft = `4px solid ${h.accentColor || "#f5c82f"}`;
    const visibleImageUrl = getVisibleHandoutImageUrl(h, "dm", state.uid);
    const frameStyle = buildImageFrameInlineStyle(h.imageFrame);
    const displayTitle = getSafeHandoutTitle(h);
    const thumbHtml = visibleImageUrl
      ? `<div class="item__thumb"><img src="${escapeHtml(visibleImageUrl)}" alt="${escapeHtml(displayTitle)} portrait"${frameStyle} /></div>`
      : `<div class="item__thumb">${getHeroIconSvg("photo", "itemThumbIcon")}</div>`;
    // Supports both new (iconKey) and legacy (iconEmoji) stored data.
    const iconMarkup = getHeroIconSvg(normalizeIconKey(h.iconKey || h.iconEmoji), "itemIconSvg");
    const isNpc = String(h.type || "").toLowerCase() === "npc";
    const typeTag = isNpc
      ? `<span class="tag tag--npc ${npcDispositionClass(h.npcDisposition)}">NPC</span>`
      : `<span class="tag">${escapeHtml((h.type ?? "handout").toUpperCase())}</span>`;
    row.innerHTML = `
      <div class="item__meta">
        <span class="itemEmoji">${iconMarkup}</span>
        <div>
          <div class="handoutMetaRow">
            ${typeTag}
            ${visibilityMetaIcon(h.revealed === true)}
            ${secretMetaIcon(h.secretRevealed === true)}
          </div>
          <div><strong>${escapeHtml(displayTitle)}</strong></div>
        </div>
      </div>
      ${thumbHtml}
    `;
    row.onclick = () => openModal({ ...h, id: h.id }, "dm");
    dmHandoutList.appendChild(row);
  });
  initVirtualScroll(dmHandoutList);
}

if (dmSearch) {
  dmSearch.addEventListener("input", debounce(() => {
    state.dmSearchQuery = dmSearch.value || "";
    renderDMHandouts(state.dmHandoutsRaw);
  }, UI_TIMERS.DM_SEARCH_DEBOUNCE_MS));
}

if (dmFilterRow) {
  dmFilterRow.addEventListener("click", (event) => {
    if (event.defaultPrevented) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const chip = target.closest(".chip");
    if (!(chip instanceof HTMLElement)) return;
    applyDMFilterSelection(chip, state.dmHandoutsRaw);
  });
}

// Online status from heartbeat timestamp.
// Thresholds: 90s = online, 5min = away, else offline, null = unavailable.
function getOnlineStatus(lastSeenAt) {
  if (!lastSeenAt) return { cls: "dead", label: "Unavailable" };
  const ts = lastSeenAt.toDate ? lastSeenAt.toDate() : lastSeenAt;
  const diffMs = Date.now() - ts.getTime();
  if (diffMs < UI_TIMERS.ONLINE_THRESHOLD_MS) return { cls: "online", label: "Online" };
  if (diffMs < UI_TIMERS.AWAY_THRESHOLD_MS) return { cls: "away", label: "Away" };
  return { cls: "offline", label: "Offline" };
}

function formatLastSeenDate(lastSeenAt) {
  if (!lastSeenAt) return "-";
  const ts = lastSeenAt.toDate ? lastSeenAt.toDate() : lastSeenAt;
  if (!(ts instanceof Date) || Number.isNaN(ts.getTime())) return "-";
  const pad = (value) => String(value).padStart(2, "0");
  const hours = pad(ts.getHours());
  const mins = pad(ts.getMinutes());
  const day = pad(ts.getDate());
  const month = pad(ts.getMonth() + 1);
  const year = String(ts.getFullYear()).slice(-2);
  return `${hours}:${mins} ${day}-${month}-${year}`;
}

function parseNumericStat(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d+\-]/g, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function rollD20() {
  try {
    if (globalThis.crypto?.getRandomValues) {
      const bytes = new Uint32Array(1);
      globalThis.crypto.getRandomValues(bytes);
      return (bytes[0] % 20) + 1;
    }
  } catch {}
  return Math.floor(Math.random() * 20) + 1;
}

function getDexterityModifier(entry) {
  const explicitMod = [
    entry?.dexterityMod,
    entry?.quickStats?.dexterityMod,
    entry?.quickStats?.dexMod,
    entry?.dexMod,
  ].map(parseNumericStat).find((n) => n !== null);
  if (explicitMod !== undefined) return explicitMod ?? 0;

  const dexRaw = [entry?.quickStats?.dexterity, entry?.dexterity]
    .map(parseNumericStat)
    .find((n) => n !== null);
  if (dexRaw !== undefined) {
    const dexValue = dexRaw ?? 0;
    return dexValue > 10 ? Math.floor((dexValue - 10) / 2) : dexValue;
  }

  const fallbackInitMod = [entry?.quickStats?.initiative, entry?.initiativeMod]
    .map(parseNumericStat)
    .find((n) => n !== null);
  return fallbackInitMod ?? 0;
}

function getInitiativeValue(entry) {
  const parsed = parseNumericStat(entry?.initiative);
  return parsed === null ? null : parsed;
}

function sortCombatantsByInitiative(entries) {
  const statusOrder = { online: 0, away: 1, offline: 2, dead: 3 };
  return [...entries].sort((a, b) => {
    const ai = getInitiativeValue(a);
    const bi = getInitiativeValue(b);
    if (ai !== null && bi !== null && ai !== bi) return bi - ai;
    if (ai !== null && bi === null) return -1;
    if (ai === null && bi !== null) return 1;

    const sa = a?.isNpc ? 0 : (statusOrder[getOnlineStatus(a?.lastSeenAt).cls] ?? 9);
    const sb = b?.isNpc ? 0 : (statusOrder[getOnlineStatus(b?.lastSeenAt).cls] ?? 9);
    if (sa !== sb) return sa - sb;

    const an = String(a?.nickname || "Adventurer").toLowerCase();
    const bn = String(b?.nickname || "Adventurer").toLowerCase();
    return an.localeCompare(bn);
  });
}

function unknownEnemyAvatarMarkup() {
  return `
    <svg class="dmPartyPanel__avatarIcon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.8"></circle>
      <path d="M5 20C5 16.6863 8.13401 14 12 14C15.866 14 19 16.6863 19 20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
    </svg>
  `;
}

function initiativeDiceIconMarkup() {
  return `<svg class="dmPartyPanel__initiativeIcon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"></rect><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"></circle><circle cx="15.5" cy="8.5" r="1.2" fill="currentColor"></circle><circle cx="8.5" cy="15.5" r="1.2" fill="currentColor"></circle><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"></circle><circle cx="12" cy="12" r="1.2" fill="currentColor"></circle></svg>`;
}

function battleIconMarkup(isActive = state.battleActive === true) {
  return `<span class="dmPartyPanel__battleEmoji" aria-hidden="true">${isActive ? "⚔️" : "💤"}</span>`;
}

function setPartyRollLoading(isLoading) {
  if (dmPartyRollOverlay) {
    dmPartyRollOverlay.classList.toggle("hidden", !isLoading);
    dmPartyRollOverlay.setAttribute("aria-hidden", isLoading ? "false" : "true");
  }
  if (btnRollInitiative) btnRollInitiative.disabled = isLoading;
  if (btnPartyBattle) btnPartyBattle.disabled = isLoading;
  if (btnAddNpc) btnAddNpc.disabled = isLoading;
  if (dmPartyPanel) dmPartyPanel.setAttribute("aria-busy", isLoading ? "true" : "false");
}

function isPlayerInitiativeLocked() {
  return state.role === "player" && state.battleActive === true;
}

function getSelfCombatant() {
  return (state.partyRoster || []).find((entry) => (entry?.id || entry?.uid) === state.uid) || null;
}

function syncPartyBattleUi() {
  const active = state.battleActive === true;
  if (btnPartyBattle) {
    btnPartyBattle.classList.toggle("is-active", active);
    btnPartyBattle.setAttribute("aria-pressed", active ? "true" : "false");
    btnPartyBattle.innerHTML = `${battleIconMarkup(active)}<span>${active ? "Battle: ON" : "Battle: OFF"}</span>`;
  }
  if (btnPlayerInitiativeEdit) {
    btnPlayerInitiativeEdit.disabled = active;
    btnPlayerInitiativeEdit.title = active ? "Battle mode active - DM controls initiative" : "Edit your initiative";
  }
  if (btnPlayerInitiativeRoll) {
    btnPlayerInitiativeRoll.disabled = active;
    btnPlayerInitiativeRoll.title = active ? "Battle mode active - DM controls initiative" : "Roll and set your initiative";
  }
}

function renderDMPlayers(players) {
  const previousRoster = state.partyRoster || [];
  state.partyRoster = players;
  state.activePlayers = players.filter((entry) => entry?.isNpc !== true);

  const nextIds = new Set(players.map((entry) => String(entry?.id || entry?.uid || "")).filter(Boolean));
  const prevIds = new Set(previousRoster.map((entry) => String(entry?.id || entry?.uid || "")).filter(Boolean));
  const rosterChanged = nextIds.size !== prevIds.size || [...prevIds].some((id) => !nextIds.has(id));
  if (rosterChanged && state.currentTurnUid && !nextIds.has(state.currentTurnUid)) {
    const sorted = sortCombatantsByInitiative(players.filter((entry) => entry?.id));
    state.currentTurnUid = sorted[0]?.id || null;
    if (!state.currentTurnUid) state.turnRound = 1;
  }

  hydrateActivePlayerProfiles(state.activePlayers).catch(() => {});

  // Keep assignment dropdown in sync with latest active players.
  try { populateAssignablePlayers(); } catch (e) {}

  renderDMPartyPanel(players);
  renderPlayerPartyPanel(players);
  syncNpcCombatantsWithNpcHandouts().catch(() => {});
}

let npcHandoutSyncInFlight = false;

function normalizeNpcSyncKey(value) {
  return String(value || "").trim().toLowerCase();
}

function isUnknownNpcLabel(value) {
  const normalized = normalizeNpcSyncKey(value);
  return normalized === "unknown enemy" || normalized === "enemy" || normalized === "unknown";
}

async function syncNpcCombatantsWithNpcHandouts() {
  if (state.role !== "dm" || !state.sessionId || npcHandoutSyncInFlight) return;

  const npcEntries = (state.partyRoster || []).filter((entry) => entry?.isNpc === true && entry?.id);
  const npcHandouts = (state.dmHandoutsRaw || []).filter((handout) => String(handout?.type || "").toLowerCase() === "npc");
  if (npcEntries.length === 0 || npcHandouts.length === 0) return;

  const handoutByName = new Map();
  npcHandouts.forEach((handout) => {
    const key = normalizeNpcSyncKey(handout?.title);
    if (!key || handoutByName.has(key)) return;
    handoutByName.set(key, handout);
  });

  const linkedHandoutIds = new Set(
    npcEntries
      .map((entry) => String(entry?.npcHandoutId || "").trim())
      .filter(Boolean)
  );

  const updates = [];
  npcEntries.forEach((npc) => {
    const matchedById = npc?.npcHandoutId
      ? npcHandouts.find((handout) => handout?.id === npc.npcHandoutId)
      : null;
    const matchedByName = handoutByName.get(normalizeNpcSyncKey(npc?.nickname));
    const matchedByAvatar = !matchedById
      ? npcHandouts.find((handout) => {
          const handoutAvatar = String(handout?.imageUrl || "").trim();
          const npcAvatar = String(npc?.avatarUrl || "").trim();
          return !!handoutAvatar && handoutAvatar === npcAvatar;
        })
      : null;

    let matched = matchedById || matchedByName || matchedByAvatar;

    if (!matched && !npc?.npcHandoutId && isUnknownNpcLabel(npc?.nickname)) {
      const remainingCandidates = npcHandouts.filter((handout) => !linkedHandoutIds.has(String(handout?.id || "").trim()));
      if (remainingCandidates.length === 1) {
        matched = remainingCandidates[0];
      }
    }

    if (!matched) return;

    const nextReveal = matched?.revealed === true;
    const nextAvatar = String(matched?.imageUrl || "").trim();
    const nextName = String(matched?.title || "").trim() || String(npc?.nickname || "").trim() || "Unknown Enemy";
    const nextHandoutId = String(matched?.id || "").trim() || null;
    const currentAvatar = String(npc?.avatarUrl || "").trim();
    const currentName = String(npc?.nickname || "").trim();
    const currentReveal = npc?.isRevealed === true;
    const currentHandoutId = String(npc?.npcHandoutId || "").trim() || null;

    if (currentReveal === nextReveal && currentAvatar === nextAvatar && currentName === nextName && currentHandoutId === nextHandoutId) return;

    updates.push({
      id: npc.id,
      patch: {
        nickname: nextName,
        avatarUrl: nextAvatar,
        isRevealed: nextReveal,
        npcHandoutId: nextHandoutId,
        updatedAt: serverTimestamp(),
      },
    });

    if (nextHandoutId) linkedHandoutIds.add(nextHandoutId);
  });

  if (updates.length === 0) return;
  npcHandoutSyncInFlight = true;
  try {
    const batch = writeBatch(db);
    updates.forEach(({ id, patch }) => {
      batch.set(doc(db, "sessions", state.sessionId, "players", id), patch, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    console.warn("NPC handout sync skipped:", err);
  } finally {
    npcHandoutSyncInFlight = false;
  }
}

function renderPartyPanel(players, listEl, emptyEl) {
  if (!listEl || !emptyEl) return;

  listEl.innerHTML = "";
  emptyEl.classList.toggle("hidden", players.length > 0);
  if (players.length === 0) return;

  const isGMList = listEl === dmPartyInlineList;
  const sorted = sortCombatantsByInitiative(players);

  sorted.forEach((p, index) => {
    const isNpc = p?.isNpc === true;
    const isHiddenNpc = isNpc && p?.isRevealed === false;
    const profile = !isNpc ? getCachedProfile(p.id, "player") : null;
    const displayName = String(profile?.displayName || p?.displayName || p?.nickname || "").trim();
    const nick = String(
      isHiddenNpc
        ? "Unknown Enemy"
        : (displayName || (isNpc ? "Enemy" : "Adventurer"))
    ).trim();
    const status = isNpc
      ? { cls: p?.isRevealed === false ? "offline" : "away", label: p?.isRevealed === false ? "Hidden" : "NPC" }
      : getOnlineStatus(p.lastSeenAt);
    const avatarUrl = String((isNpc ? p?.avatarUrl : (profile?.avatarUrl || p?.avatarUrl)) || "").trim();
    const initial = escapeHtml((nick.charAt(0) || "?").toUpperCase());
    const initiativeValue = getInitiativeValue(p);
    const initiativeLabel = initiativeValue === null ? "-" : String(initiativeValue);
    const npcAvatarNeedsCrop = isNpc && avatarUrl && /placeholders\//i.test(avatarUrl);
    const avatarMarkup = isHiddenNpc
      ? unknownEnemyAvatarMarkup()
      : avatarUrl
      ? `<img class="${npcAvatarNeedsCrop ? "dmPartyPanel__avatarImg--npc" : ""}" src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(nick)} avatar" />`
      : `<span>${initial}</span>`;

    const row = document.createElement("div");
    row.className = `dmPartyPanel__row list-stagger-item${isNpc ? " dmPartyPanel__row--npc" : ""}${isGMList && p.id === state.currentTurnUid ? " is-active-turn" : ""}`;
    row.dataset.uid = p.id;
    row.style.setProperty("--stagger-index", String(index));
    if (isNpc) {
      const _npcHandoutId = String(p?.npcHandoutId || "").trim();
      const _linked = _npcHandoutId
        ? (state.dmHandoutsRaw || []).find((e) => e?.id === _npcHandoutId)
        : (state.dmHandoutsRaw || []).find((e) =>
            String(e?.type || "").toLowerCase() === "npc" &&
            normalizeNpcSyncKey(e?.title) === normalizeNpcSyncKey(p?.nickname)
          );
      const _accent = String(_linked?.accentColor || "").trim();
      if (_accent) row.style.borderLeft = `4px solid ${_accent}`;
    }

    let metaText = isNpc ? (p?.isRevealed === false ? "Hidden enemy" : "Revealed enemy") : formatLastSeenDate(p.lastSeenAt);
    if (isNpc && !isGMList && p?.isRevealed === false) {
      metaText = "Unknown threat";
    }

    const gmNpcButton = isGMList && isNpc
      ? `<button class="dmPartyPanel__npcBtn" type="button" data-toggle-npc="${escapeHtml(p.id)}">${p?.isRevealed === false ? "Reveal" : "Hide"}</button>`
      : `<span class="dmPartyPanel__status dmPartyPanel__status--${escapeHtml(status.cls)}">${escapeHtml(status.label)}</span>`;

    row.innerHTML = `
      <span class="dmPartyPanel__identity">
        <span class="dmPartyPanel__avatar">${avatarMarkup}</span>
        <span style="min-width:0">
          <span class="dmPartyPanel__name">${escapeHtml(nick)}</span>
          <span class="dmPartyPanel__meta">${escapeHtml(metaText)}</span>
        </span>
      </span>
      <span class="dmPartyPanel__statusWrap">
        <span class="dmPartyPanel__initiative">${initiativeDiceIconMarkup()}<span>${escapeHtml(initiativeLabel)}</span></span>
        ${gmNpcButton}
      </span>
    `;

    row.setAttribute("role", "button");
    row.setAttribute("tabindex", "0");
    row.addEventListener("click", () => openPlayerCard(p.id, { member: p, viewerRole: isGMList ? "dm" : "player" }));
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openPlayerCard(p.id, { member: p, viewerRole: isGMList ? "dm" : "player" });
      }
    });

    if (isGMList && isNpc) {
      const toggleBtn = row.querySelector("[data-toggle-npc]");
      toggleBtn?.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const nextReveal = !(p?.isRevealed === true);
        const matchedNpcHandout = (state.dmHandoutsRaw || []).find((handout) => {
          if (String(handout?.type || "").toLowerCase() !== "npc") return false;
          if (p?.npcHandoutId && handout?.id === p.npcHandoutId) return true;
          return normalizeNpcSyncKey(handout?.title) === normalizeNpcSyncKey(p?.nickname);
        });
        try {
          const batch = writeBatch(db);
          batch.set(doc(db, "sessions", state.sessionId, "players", p.id), {
            isRevealed: nextReveal,
            ...(matchedNpcHandout?.id ? { npcHandoutId: matchedNpcHandout.id } : {}),
            updatedAt: serverTimestamp(),
          }, { merge: true });
          if (matchedNpcHandout?.id) {
            batch.set(doc(db, "sessions", state.sessionId, "handouts", matchedNpcHandout.id), {
              revealed: nextReveal,
              updatedAt: serverTimestamp(),
            }, { merge: true });
          }
          await batch.commit();
        } catch (err) {
          console.error("Toggle NPC reveal failed:", err);
          showToast("Could not update NPC reveal state.", "error");
        }
      });
    }

    listEl.appendChild(row);
  });
}

function getSortedInitiativeCombatants() {
  const combatants = (state.partyRoster || []).filter((p) => p?.id);
  return sortCombatantsByInitiative(combatants);
}

function normalizeCurrentTurn(sortedCombatants) {
  const sorted = Array.isArray(sortedCombatants) ? sortedCombatants : getSortedInitiativeCombatants();
  if (sorted.length === 0) {
    state.currentTurnUid = null;
    state.turnRound = 1;
    return sorted;
  }
  const currentIdx = sorted.findIndex((p) => p.id === state.currentTurnUid);
  if (currentIdx < 0) {
    state.currentTurnUid = sorted[0].id;
  }
  return sorted;
}

function updateTurnNav() {
  if (!dmTurnNav) return;
  const sorted = normalizeCurrentTurn(getSortedInitiativeCombatants());
  const hasInit = sorted.length > 0;
  dmTurnNav.classList.toggle("hidden", !hasInit);
  if (!hasInit) return;
  const idx = sorted.findIndex(p => p.id === state.currentTurnUid);
  const current = idx >= 0 ? sorted[idx] : sorted[0];
  const currentProfile = current?.isNpc ? null : getCachedProfile(current?.id, "player");
  const nick = current
    ? String(currentProfile?.displayName || current.displayName || current.nickname || (current.isNpc ? "Enemy" : "Adventurer")).trim()
    : "—";
  const pos = idx >= 0 ? `${idx + 1} / ${sorted.length}` : "?";
  if (dmTurnLabel) dmTurnLabel.textContent = `Round ${state.turnRound} · ${nick} (${pos})`;
}

async function resetInitiative() {
  if (state.role !== "dm" || !state.sessionId) return;
  const roster = state.partyRoster || [];
  if (roster.length === 0) return;
  state.currentTurnUid = null;
  state.turnRound = 1;
  try {
    const batch = writeBatch(db);
    roster.forEach(p => {
      if (!p?.id) return;
      const ref = doc(db, "sessions", state.sessionId, "players", p.id);
      batch.update(ref, { initiative: null, updatedAt: serverTimestamp() });
    });
    await batch.commit();
    // Firestore listener will update partyRoster via renderDMPlayers
  } catch (err) {
    console.error("Reset initiative failed:", err);
    showToast("Could not reset initiative.", "error");
    return;
  }
  updateTurnNav();
}

function advanceTurn(dir) {
  const sorted = normalizeCurrentTurn(getSortedInitiativeCombatants());
  if (sorted.length === 0) return;

  const direction = dir === -1 ? -1 : 1;
  const currentIdx = sorted.findIndex((p) => p.id === state.currentTurnUid);
  let nextIdx = currentIdx;

  if (currentIdx < 0) {
    nextIdx = direction === 1 ? 0 : sorted.length - 1;
  } else {
    nextIdx = (currentIdx + direction + sorted.length) % sorted.length;
    if (direction === 1 && nextIdx === 0 && sorted.length > 1) {
      state.turnRound = Math.max(1, state.turnRound + 1);
    }
    if (direction === -1 && currentIdx === 0 && sorted.length > 1) {
      state.turnRound = Math.max(1, state.turnRound - 1);
    }
  }

  state.currentTurnUid = sorted[nextIdx].id;
  
  // Create a visual sweep effect when the turn changes
  requestAnimationFrame(() => {
    document.documentElement.style.setProperty("--turn-sweep-active", "1");
    setTimeout(() => {
      document.documentElement.style.removeProperty("--turn-sweep-active");
    }, 400);
  });

  renderDMPartyPanel(state.partyRoster);
  updateTurnNav();
}

function renderDMPartyPanel(players) {
  normalizeCurrentTurn(getSortedInitiativeCombatants());
  // GM should not see themselves in their own party list
  const visiblePlayers = players.filter(p => (p?.id || p?.uid) !== state.uid || p?.isNpc === true);
  renderPartyPanel(visiblePlayers, dmPartyInlineList, dmPartyInlineEmpty);
  updateTurnNav();
}

function renderPlayerPartyPanel(players) {
  renderPartyPanel(players, playerPartyInlineList, playerPartyInlineEmpty);
}

async function createNpcCombatant() {
  if (state.role !== "dm" || !state.sessionId) return;

  const nameInput = window.prompt("NPC name", "Unknown Enemy");
  if (nameInput === null) return;
  const name = String(nameInput || "").trim() || "Unknown Enemy";

  const dexInput = window.prompt("DEX modifier (e.g. +2)", "0");
  if (dexInput === null) return;
  const dexMod = parseNumericStat(dexInput);
  if (dexMod === null) {
    showToast("Enter a valid numeric DEX modifier.", "error");
    return;
  }

  try {
    await addDoc(collection(db, "sessions", state.sessionId, "players"), {
      nickname: name,
      isNpc: true,
      isRevealed: false,
      initiative: null,
      dexterityMod: dexMod,
      quickStats: {
        dexterityMod: dexMod,
      },
      joinedAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    showToast(`${name} added to initiative tracker.`, "success");
  } catch (err) {
    console.error("Add NPC failed:", err);
    showToast("Could not add NPC.", "error");
  }
}

async function rollInitiativeForAll() {
  if (state.role !== "dm" || !state.sessionId) return;
  const combatants = (state.partyRoster || []).filter((entry) => entry?.id);
  if (combatants.length === 0) {
    showToast("No combatants in party yet.", "error");
    return;
  }

  const enemies = combatants.filter(e => e.isNpc);
  const players = combatants.filter(e => !e.isNpc);
  state.turnRound = 1;
  state.currentTurnUid = null;

  // Auto-roll for all enemies (NPCs)
  if (enemies.length > 0) {
    setPartyRollLoading(true);
    try {
      const batch = writeBatch(db);
      enemies.forEach((entry) => {
        const roll = rollD20();
        const dexMod = getDexterityModifier(entry);
        const initiative = roll + dexMod;
        const ref = doc(db, "sessions", state.sessionId, "players", entry.id);
        batch.set(ref, {
          initiative,
          initiativeRoll: roll,
          initiativeModUsed: dexMod,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      });
      await batch.commit();
      showToast(`Initiative rolled for ${enemies.length} enemy${enemies.length !== 1 ? "s" : ""}.`, "success");
    } catch (err) {
      console.error("Roll enemy initiative failed:", err);
      showToast("Failed to roll enemy initiative.", "error");
    } finally {
      setPartyRollLoading(false);
    }
  }

  // Prompt GM to enter player initiative rolls via modal
  openPlayerInitiativeModal(players);
}

// ---- Player initiative input modal ----
const playerInitiativeModal = $("playerInitiativeModal");
const playerInitList = $("playerInitList");
const playerInitModalTitle = $("playerInitModalTitle");
const playerInitModalHint = $("playerInitModalHint");
const btnConfirmInitiatives = $("btnConfirmInitiatives");
const btnCancelInitModal = $("btnCancelInitModal");
const btnCloseInitModal = $("btnCloseInitModal");

// Holds pending player entries while modal is open
let _pendingInitPlayers = [];
let _initiativeModalMode = "dm-batch";
let _pendingInitRoll = null;
let _pendingInitDexMod = null;

function openPlayerInitiativeModal(players, options = {}) {
  if (!playerInitiativeModal || !playerInitList) return;
  _pendingInitPlayers = players || [];
  _initiativeModalMode = options?.mode === "player-self" ? "player-self" : "dm-batch";
  _pendingInitRoll = Number.isFinite(options?.roll) ? Number(options.roll) : null;
  _pendingInitDexMod = Number.isFinite(options?.dexMod) ? Number(options.dexMod) : null;

  if (playerInitModalTitle) {
    playerInitModalTitle.textContent = _initiativeModalMode === "player-self" ? "Your Initiative" : "Player Initiative";
  }
  if (playerInitModalHint) {
    if (_initiativeModalMode === "player-self") {
      if (options?.fromRoll && _pendingInitRoll !== null) {
        const signedMod = _pendingInitDexMod === null
          ? ""
          : (_pendingInitDexMod >= 0 ? ` + ${_pendingInitDexMod}` : ` - ${Math.abs(_pendingInitDexMod)}`);
        playerInitModalHint.textContent = `Rolled ${_pendingInitRoll}${signedMod}. Adjust if needed, then save.`;
      } else {
        playerInitModalHint.textContent = "Set or update your initiative value.";
      }
    } else {
      playerInitModalHint.textContent = "Enemies rolled automatically. Enter each player's initiative result below.";
    }
  }
  if (btnConfirmInitiatives) {
    btnConfirmInitiatives.textContent = _initiativeModalMode === "player-self" ? "Save Initiative" : "Set Initiatives";
  }
  if (btnCancelInitModal) {
    btnCancelInitModal.textContent = _initiativeModalMode === "player-self" ? "Cancel" : "Skip";
  }

  // Build a row per player: name label + number input
  playerInitList.innerHTML = _pendingInitPlayers.length === 0
    ? `<p class="muted small" style="text-align:center;padding:8px 0">No players joined yet.</p>`
    : _pendingInitPlayers.map((p) => {
        const name = p.nickname || p.displayName || "Player";
        const current = Number.isFinite(options?.prefillInitiative)
          ? Number(options.prefillInitiative)
          : ((p.initiative != null && !isNaN(Number(p.initiative))) ? p.initiative : "");
        return `<div class="playerInitRow">
          <span class="playerInitRow__name">${escapeHtml(name)}</span>
          <input class="input playerInitRow__input" type="number" inputmode="numeric"
            placeholder="—" value="${escapeHtml(String(current))}"
            data-player-id="${escapeHtml(p.id)}" aria-label="Initiative for ${escapeHtml(name)}">
        </div>`;
      }).join("");

  animateModalIn(playerInitiativeModal);
}

function closePlayerInitiativeModal() {
  animateModalOut(playerInitiativeModal);
  _pendingInitPlayers = [];
  _initiativeModalMode = "dm-batch";
  _pendingInitRoll = null;
  _pendingInitDexMod = null;
}

async function confirmPlayerInitiatives() {
  if (!playerInitList || !state.sessionId) return;
  const inputs = playerInitList.querySelectorAll(".playerInitRow__input");
  if (inputs.length === 0) { closePlayerInitiativeModal(); return; }

  if (_initiativeModalMode === "player-self") {
    if (isPlayerInitiativeLocked()) {
      showToast("Battle mode is active. Only the DM can change initiative now.", "error");
      closePlayerInitiativeModal();
      return;
    }
    const input = inputs[0];
    if (!input) { closePlayerInitiativeModal(); return; }
    const playerId = String(input.dataset.playerId || state.uid || "").trim();
    const val = input.value.trim();
    const num = Number(val);
    if (!playerId || val === "" || isNaN(num)) {
      showToast("Enter a valid initiative value.", "error");
      return;
    }
    try {
      await setDoc(doc(db, "sessions", state.sessionId, "players", playerId), {
        initiative: num,
        ...(_pendingInitRoll !== null ? { initiativeRoll: _pendingInitRoll } : {}),
        ...(_pendingInitDexMod !== null ? { initiativeModUsed: _pendingInitDexMod } : {}),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      showToast("Initiative saved.", "success");
      closePlayerInitiativeModal();
    } catch (err) {
      console.error("Save player initiative failed:", err);
      showToast("Failed to save initiative.", "error");
    }
    return;
  }

  const batch = writeBatch(db);
  let count = 0;
  inputs.forEach((input) => {
    const playerId = input.dataset.playerId;
    const val = input.value.trim();
    if (!playerId || val === "") return;
    const num = Number(val);
    if (isNaN(num)) return;
    const ref = doc(db, "sessions", state.sessionId, "players", playerId);
    batch.set(ref, { initiative: num, updatedAt: serverTimestamp() }, { merge: true });
    count++;
  });

  if (count === 0) { closePlayerInitiativeModal(); return; }

  try {
    await batch.commit();
    state.turnRound = 1;
    state.currentTurnUid = null;
    showToast(`Initiative set for ${count} player${count !== 1 ? "s" : ""}.`, "success");
  } catch (err) {
    console.error("Set player initiative failed:", err);
    showToast("Failed to save player initiatives.", "error");
  }
  closePlayerInitiativeModal();
}

function openSelfInitiativeModal({ fromRoll = false, prefillInitiative = null, roll = null, dexMod = null } = {}) {
  const selfEntry = getSelfCombatant();
  if (!selfEntry) {
    showToast("You are not in the party roster yet.", "error");
    return;
  }
  const fallbackCurrent = getInitiativeValue(selfEntry);
  openPlayerInitiativeModal([selfEntry], {
    mode: "player-self",
    fromRoll,
    prefillInitiative: Number.isFinite(prefillInitiative) ? prefillInitiative : fallbackCurrent,
    roll,
    dexMod,
  });
}

btnCloseInitModal?.addEventListener("click", closePlayerInitiativeModal);
btnCancelInitModal?.addEventListener("click", closePlayerInitiativeModal);
btnConfirmInitiatives?.addEventListener("click", () => {
  confirmPlayerInitiatives().catch((err) => {
    console.error("Confirm initiatives error:", err);
    showToast("Failed to save initiatives.", "error");
  });
});

btnAddNpc?.addEventListener("click", () => {
  createNpcCombatant().catch((err) => {
    console.error("Add NPC action failed:", err);
    showToast("Could not add NPC.", "error");
  });
});

btnRollInitiative?.addEventListener("click", () => {
  btnRollInitiative.classList.add("is-rolling");
  window.setTimeout(() => btnRollInitiative.classList.remove("is-rolling"), 500);
  rollInitiativeForAll().catch((err) => {
    console.error("Roll initiative action failed:", err);
    showToast("Failed to roll initiative.", "error");
    setPartyRollLoading(false);
  });
});

btnResetInitiative?.addEventListener("click", () => {
  resetInitiative().catch((err) => {
    console.error("Reset initiative failed:", err);
    showToast("Failed to reset initiative.", "error");
  });
});

btnPartyBattle?.addEventListener("click", async () => {
  if (state.role !== "dm" || !state.sessionId) return;
  const nextValue = !(state.battleActive === true);
  const previousValue = state.battleActive === true;
  state.battleActive = nextValue;
  syncPartyBattleUi();
  btnPartyBattle.disabled = true;
  try {
    await updateDoc(doc(db, "sessions", state.sessionId), {
      battleActive: nextValue,
      updatedAt: serverTimestamp(),
    });
    showToast(nextValue ? "Battle mode enabled." : "Battle mode disabled.", "success");
  } catch (err) {
    state.battleActive = previousValue;
    syncPartyBattleUi();
    console.error("Toggle battle mode failed:", err);
    showToast("Could not update battle mode.", "error");
  } finally {
    btnPartyBattle.disabled = false;
  }
});

btnPlayerInitiativeEdit?.addEventListener("click", () => {
  if (isPlayerInitiativeLocked()) {
    showToast("Battle mode is active. Only the DM can change initiative now.", "error");
    return;
  }
  openSelfInitiativeModal();
});

btnPlayerInitiativeRoll?.addEventListener("click", () => {
  if (isPlayerInitiativeLocked()) {
    showToast("Battle mode is active. Only the DM can change initiative now.", "error");
    return;
  }
  const selfEntry = getSelfCombatant();
  if (!selfEntry) {
    showToast("You are not in the party roster yet.", "error");
    return;
  }
  const roll = rollD20();
  const dexMod = getDexterityModifier(selfEntry);
  const initiative = roll + dexMod;
  const selfUid = String(selfEntry?.id || state.uid || "").trim();
  if (!selfUid || !state.sessionId) {
    showToast("Could not resolve your player record.", "error");
    return;
  }
  setDoc(doc(db, "sessions", state.sessionId, "players", selfUid), {
    initiative,
    initiativeRoll: roll,
    initiativeModUsed: dexMod,
    updatedAt: serverTimestamp(),
  }, { merge: true }).then(() => {
    const signedMod = dexMod >= 0 ? `+${dexMod}` : String(dexMod);
    showToast(`Initiative set to ${initiative} (d20 ${roll} ${signedMod}).`, "success");
  }).catch((err) => {
    console.error("Player roll initiative failed:", err);
    showToast("Failed to set initiative.", "error");
  });
});

syncPartyBattleUi();

btnTurnNext?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  advanceTurn(1);
});

btnTurnPrev?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  advanceTurn(-1);
});

// Discord-style player profile card popup
const playerCardOverlay = $("playerCardOverlay");
const pcAvatar = $("pcAvatar");
const pcName = $("pcName");
const pcRole = $("pcRole");
const pcStatus = $("pcStatus");
const pcStatusDot = $("pcStatusDot");
const pcItems = $("pcItems");
const pcCoins = $("pcCoins");
const pcItemsLabel = $("pcItemsLabel");
const pcCoinsLabel = $("pcCoinsLabel");
const pcClose = $("pcClose");
const btnRemoveNpcProfile = $("btnRemoveNpcProfile");

function openPlayerCard(uid, options = {}) {
  if (!playerCardOverlay) return;
  const explicitMember = options?.member || null;
  const rosterMember = (state.partyRoster || []).find((entry) => (entry.id || entry.uid) === uid) || null;
  const player = explicitMember || rosterMember || (state.activePlayers || []).find(p => (p.id || p.uid) === uid) || null;
  const viewerRole = options?.viewerRole || state.role || "player";
  const viewerIsGM = viewerRole === "dm";
  const isNpc = player?.isNpc === true;
  const isRevealedNpc = player?.isRevealed === true;
  const isDM = uid === state.dmUid;
  const profile = !isNpc
    ? (
      getCachedProfile(uid, isDM ? "dm" : "player")
      || getCachedProfile(uid, isDM ? "player" : "dm")
    )
    : null;

  const nick = (() => {
    if (isNpc) {
      if (viewerIsGM || isRevealedNpc) {
        return String(player?.nickname || "Unknown Enemy").trim() || "Unknown Enemy";
      }
      return "Unknown";
    }
    return String(profile?.displayName || player?.nickname || player?.displayName || "Unknown").trim() || "Unknown";
  })();

  const avatarUrl = (() => {
    if (isNpc) {
      return viewerIsGM || isRevealedNpc ? String(player?.avatarUrl || "").trim() : "";
    }
    return String(profile?.avatarUrl || player?.avatarUrl || "").trim();
  })();

  // If profile data is not cached yet, fetch it once and refresh the open card.
  if (!isNpc && (!profile || !String(profile?.avatarUrl || "").trim())) {
    const preferredRole = isDM ? "dm" : "player";
    const alternateRole = preferredRole === "dm" ? "player" : "dm";
    Promise.all([
      loadUserProfile(uid, { role: preferredRole, force: true }),
      loadUserProfile(uid, { role: alternateRole, force: true }),
    ])
      .then(() => {
        if (playerCardOverlay && !playerCardOverlay.classList.contains("hidden") && playerCardOverlay._viewingUid === uid) {
          openPlayerCard(uid, options);
        }
      })
      .catch(() => {});
  }

  const status = (() => {
    if (isNpc) {
      if (!viewerIsGM && !isRevealedNpc) return { cls: "offline", label: "Unknown" };
      return { cls: "dead", label: isRevealedNpc ? "NPC" : "Hidden NPC" };
    }
    return getOnlineStatus(player?.lastSeenAt);
  })();

  // Banner color: use handout accentColor for NPCs
  const pcBanner = playerCardOverlay?.querySelector(".playerCard__banner");
  if (pcBanner) {
    if (isNpc) {
      const npcHandoutId = String(player?.npcHandoutId || "").trim();
      const linkedHandout = npcHandoutId
        ? (state.dmHandoutsRaw || []).find((e) => e?.id === npcHandoutId)
        : findLinkedNpcHandoutByName(nick);
      const accent = String(linkedHandout?.accentColor || "").trim() || "#5b4d8a";
      pcBanner.style.background = `linear-gradient(135deg, ${accent}cc 0%, ${accent} 100%)`;
    } else {
      pcBanner.style.background = "";
    }
  }

  // Avatar: show image or initial
  if (pcAvatar) {
    const resolvedAvatarUrl = resolveDisplayAvatar(avatarUrl, uid);
    pcAvatar.innerHTML = resolvedAvatarUrl
      ? `<img src="${escapeHtml(resolvedAvatarUrl)}" alt="${escapeHtml(nick)}" />`
      : escapeHtml((nick.charAt(0) || "?").toUpperCase());
  }

  if (pcName) pcName.textContent = nick;
  if (pcRole) {
    if (isNpc) pcRole.textContent = "NPC";
    else pcRole.textContent = uid === state.dmUid ? "DM" : "PLAYER";
  }
  if (pcStatus) {
    if (isNpc) {
      pcStatus.textContent = (!viewerIsGM && !isRevealedNpc)
        ? "Identity hidden"
        : (isRevealedNpc ? "Revealed NPC" : "Hidden NPC");
    } else {
      pcStatus.textContent = status.label === "Online" ? "Online" : `Last seen: ${formatLastSeenDate(player?.lastSeenAt)}`;
    }
  }
  if (pcStatusDot) pcStatusDot.className = `status-dot status-dot--${status.cls}`;

  if (pcItemsLabel) pcItemsLabel.textContent = isNpc ? "Initiative" : "Items";
  if (pcCoinsLabel) pcCoinsLabel.textContent = isNpc ? "Intel" : "Coins";

  if (isNpc) {
    const initiativeValue = getInitiativeValue(player);
    if (pcItems) pcItems.textContent = initiativeValue === null ? "-" : String(initiativeValue);
    if (pcCoins) pcCoins.textContent = (!viewerIsGM && !isRevealedNpc) ? "Unknown" : "Revealed";
  } else {
    const itemCount = (state.inventoryItems || []).filter((i) => i.ownerUid === uid).length;
    const wallet = state.wallets?.[uid] || {};
    const totalCoins = (wallet.platinum || 0) + (wallet.gold || 0) + (wallet.silver || 0) + (wallet.bronze || 0);
    if (pcItems) pcItems.textContent = itemCount;
    if (pcCoins) pcCoins.textContent = totalCoins;
  }

  // GM-only: show Edit Stats button and quick stat editor
  const btnEditPlayerStats = $("btnEditPlayerStats");
  const pcQuickStatsWrap = $("pcQuickStatsWrap");
  const pcQuickStatsGrid = $("pcQuickStatsGrid");
  const btnSavePcStats = $("btnSavePcStats");
  const isGM = state.role === "dm";
  const canEditStats = isGM && !isNpc;
  if (btnEditPlayerStats) btnEditPlayerStats.classList.toggle("hidden", !canEditStats);
  if (pcQuickStatsWrap) pcQuickStatsWrap.classList.add("hidden");

  // Store currently viewed player uid for stat saving
  playerCardOverlay._viewingUid = uid;

  if (canEditStats && pcQuickStatsGrid) {
    const qs = player?.quickStats || {};
    pcQuickStatsGrid.innerHTML = PROFILE_STAT_KEYS.map(k =>
      `<div class="profileStatRow"><label class="label small">${k}</label><input class="input input--small pcStat" data-key="${k}" type="number" min="0" value="${qs[k] ?? ""}"></div>`
    ).join("");
  }

  if (btnEditPlayerStats) {
    btnEditPlayerStats.onclick = () => {
      pcQuickStatsWrap?.classList.toggle("hidden");
    };
  }

  if (btnSavePcStats) {
    btnSavePcStats.onclick = async () => {
      const stats = {};
      pcQuickStatsGrid?.querySelectorAll(".pcStat").forEach(inp => {
        const val = inp.value.trim();
        if (val) stats[inp.dataset.key] = Number(val);
      });
      await savePlayerQuickStats(playerCardOverlay._viewingUid, stats);
    };
  }

  // GM-only: show Message button for players (not for the GM themselves)
  const showMsg = isGM && !isNpc && uid !== state.uid;
  const showKick = isGM && !isNpc && uid !== state.uid;
  const showRemoveNpc = isGM && isNpc;
  if (btnMessagePlayer) btnMessagePlayer.classList.toggle("hidden", !showMsg);
  if (btnKickPlayer) btnKickPlayer.classList.toggle("hidden", !showKick);
  if (btnRemoveNpcProfile) btnRemoveNpcProfile.classList.toggle("hidden", !showRemoveNpc);
  if (pcMessageWrap) pcMessageWrap.classList.add("hidden");
  if (pcMessageInput) pcMessageInput.value = "";

  if (showKick && btnKickPlayer) {
    btnKickPlayer.onclick = () => {
      kickPartyMember(uid);
    };
  } else if (btnKickPlayer) {
    btnKickPlayer.onclick = null;
  }

  if (showRemoveNpc && btnRemoveNpcProfile) {
    btnRemoveNpcProfile.onclick = () => {
      removeNpcPartyMember(uid);
    };
  } else if (btnRemoveNpcProfile) {
    btnRemoveNpcProfile.onclick = null;
  }

  if (showMsg && btnMessagePlayer) {
    btnMessagePlayer.onclick = () => {
      pcMessageWrap?.classList.toggle("hidden");
      if (!pcMessageWrap?.classList.contains("hidden")) pcMessageInput?.focus();
    };
  }
  if (showMsg && btnSendPlayerMessage) {
    btnSendPlayerMessage.onclick = async () => {
      const text = pcMessageInput?.value?.trim();
      if (!text) { pcMessageInput?.focus(); return; }
      try {
        const statusNow = getOnlineStatus(player?.lastSeenAt).label;
        await createNotification(uid, "dmMessage", text);
        const statusHint = statusNow === "Online"
          ? "player is online now"
          : "player may receive it when they return";
        showToast(`Message sent to ${nick} (${statusHint}).`, "success", 2400);
        if (pcMessageInput) pcMessageInput.value = "";
        if (pcMessageWrap) pcMessageWrap.classList.add("hidden");
      } catch (err) {
        console.error("DM message failed:", err);
        showToast("Failed to send message.", "error");
      }
    };
  }

  playerCardOverlay.classList.remove("hidden");
  playerCardOverlay.setAttribute("aria-hidden", "false");
}

function closePlayerCard() {
  if (!playerCardOverlay) return;
  playerCardOverlay.classList.add("hidden");
  playerCardOverlay.setAttribute("aria-hidden", "true");
}

pcClose?.addEventListener("click", closePlayerCard);
playerCardOverlay?.addEventListener("click", (e) => {
  if (e.target === playerCardOverlay) closePlayerCard();
});

if (playerListContent) {
  playerListContent.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const trigger = target.closest(".playerCard-mini");
    if (!(trigger instanceof HTMLElement)) return;

    const uid = String(trigger.dataset.uid || "").trim();
    if (!uid) return;
    openPlayerCard(uid);
    playerListDropdown?.classList.add("hidden");
  });
}

// ---- 14) GM: ambience controls ----
// TODO: SOUND REMINDER � User will provide additional sound files for the
// sound/ambience system later. Currently only Forest.mp3 exists in audio/.
// When new sounds are added, update the track selector options in index.html
// and add corresponding URL mappings in the ambience track resolution code.
//
// BEGINNER NOTE � How ambience syncs across devices:
// The GM writes ambience state {track, volume, isPlaying} to Firestore.
// Every player's onSnapshot listener picks up the change and calls
// applyAmbience() locally. The track name maps to an audio file URL.
// Play/pause and volume are applied to a shared <audio> element.

// GM play/pause controls (explicit)
if (btnDMPlay) {
  // Writes "isPlaying=true" so all listeners (GM + players) start audio.
  btnDMPlay.onclick = async () => {
    const desired = {
      track: dmAmbience.value,
      volume: Number(dmVolume.value),
      isPlaying: true,
    };

    // Prime source + volume inside this user gesture for stricter autoplay policies.
    try {
      ensureAmbienceAudioMounted();
      setAmbienceTrack(desired.track);
      const ok = await attemptAmbiencePlay(desired.volume);
      if (!ok) throw new Error("play-blocked");
    } catch {
      requestAmbienceResume();
      showToast("Audio blocked by browser. Tap anywhere and press Play again.", "info", 2200);
    }

    // Apply instantly for local responsiveness, then persist to Firestore.
    applyAmbience(desired);
    syncAmbienceButtonState(true);

    const sessionRef = doc(db, "sessions", state.sessionId);
    const snap = await getDoc(sessionRef);
    if (!snap.exists()) return;
    await updateDoc(sessionRef, {
      ambience: desired,
      updatedAt: serverTimestamp(),
    });
  };
}

if (btnDMPause) {
  // Writes "isPlaying=false" so all listeners pause audio.
  btnDMPause.onclick = async () => {
    const desired = {
      track: dmAmbience.value,
      volume: Number(dmVolume.value),
      isPlaying: false,
    };

    applyAmbience(desired);
    syncAmbienceButtonState(false);

    const sessionRef = doc(db, "sessions", state.sessionId);
    const snap = await getDoc(sessionRef);
    if (!snap.exists()) return;
    await updateDoc(sessionRef, {
      ambience: desired,
      updatedAt: serverTimestamp(),
    });
  };
}

dmAmbience && (dmAmbience.onchange = async () => {
  // Selecting a new ambience track immediately updates session ambience state.
  const sessionRef = doc(db, "sessions", state.sessionId);
  await updateDoc(sessionRef, {
    ambience: {
      track: dmAmbience.value,
      volume: Number(dmVolume.value),
      isPlaying: true,
    },
    updatedAt: serverTimestamp(),
  });
});

dmVolume && (dmVolume.oninput = async () => {
  // Slider updates volume while preserving current play/pause status.
  const sessionRef = doc(db, "sessions", state.sessionId);
  const snap = await getDoc(sessionRef);
  if (!snap.exists()) return;
  const cur = snap.data().ambience?.isPlaying ?? false;

  await updateDoc(sessionRef, {
    ambience: {
      track: dmAmbience.value,
      volume: Number(dmVolume.value),
      isPlaying: cur,
    },
    updatedAt: serverTimestamp(),
  });
});

// ---- 15) Player: join + live view ----
// The player joins by entering a joinTag (or session ID), nickname, and PIN.
// BEGINNER NOTE � PIN verification flow:
// 1. Player types the plaintext PIN
// 2. We hash it with SHA-256 (same algorithm used when creating the session)
// 3. We compare the hash against the one stored in Firestore
// 4. If they match, the player is allowed in
// This way, even if someone reads the Firestore database directly,
// they see a hash � not the actual PIN digits.
async function joinPlayerSession(joinTagRaw, nickRaw, pinRaw) {
  // Clear previous message for cleaner validation feedback.
  plJoinMsg.textContent = "";

  const joinTagVariants = getJoinTagLookupVariants(joinTagRaw);
  const joinTagInput = joinTagVariants[0] || "";
  const nick = String(nickRaw || "").trim();
  const pinPlain = String(pinRaw || "").trim();

  if (!joinTagInput) { plJoinMsg.textContent = "Session tag is required."; return false; }
  if (!nick) { plJoinMsg.textContent = "Nickname is required."; return false; }
  if (!/^\d{4,8}$/.test(pinPlain)) { plJoinMsg.textContent = "PIN must be 4�8 digits."; return false; }

  try {
    showAuthLoading("Joining session...");

    let sessionDoc = null;

    // Resolve by joinTag first (supports both legacy `#` and current `-`).
    for (const candidate of joinTagVariants) {
      const tagSnap = await getDocs(query(collection(db, "sessions"), where("joinTag", "==", candidate)));
      if (!tagSnap.empty) {
        sessionDoc = tagSnap.docs[0];
        break;
      }
    }

    if (!sessionDoc) {
      // Backward compatibility: allow raw session doc id if pasted.
      for (const candidate of joinTagVariants) {
        const legacyRef = doc(db, "sessions", candidate);
        const legacySnap = await getDoc(legacyRef);
        if (legacySnap.exists()) {
          sessionDoc = legacySnap;
          break;
        }
      }
    }

    if (!sessionDoc) { plJoinMsg.textContent = "Session not found."; return false; }

    // Compare hashes, not raw pin strings.
    const pinHash = await sha256(pinPlain);
    const s = sessionDoc.data();
    const sessionId = sessionDoc.id;

    if (isExpiredOneShotSession(s)) {
      await tryDeleteExpiredOneShotSession(sessionId, s);
      plJoinMsg.textContent = "This one-shot has expired.";
      return false;
    }

    if (s.pinHash !== pinHash) { plJoinMsg.textContent = "Incorrect PIN."; return false; }

    state.role = "player";
    state.sessionId = sessionId;
    state.joinTag = toLegacyHashJoinTag(s.joinTag || joinTagInput);
    state.joinLink = buildSessionJoinLink(state.joinTag);
    state.playerNick = nick;
    persistLocal();

    // Upsert player profile for this session.
    const playerRef = doc(db, "sessions", sessionId, "players", state.uid);
    await setDoc(playerRef, {
      nickname: nick,
      joinedAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
      isNpc: false,
      isRevealed: true,
      initiative: null,
    }, { merge: true });

    // Player clients cannot create notifications by rules; DM listener broadcasts join notices.

    if (s.isOneShot) {
      rememberRecentOneShotJoin({
        sessionId,
        joinTag: state.joinTag,
        nickname: nick,
        pin: pinPlain,
        sessionName: s.name || "",
        expiresAtMs: getOneShotExpiryMs(s),
      });
    }

    rememberJoinedSession({
      sessionId,
      joinTag: state.joinTag,
      sessionName: s.name || "",
      pin: pinPlain,
    });

    try {
      const ownProfile = await loadUserProfile(state.uid, { role: "player" });
      if (!ownProfile.displayName) {
        const merged = {
          ...ownProfile,
          displayName: nick,
        };
        await setDoc(getUserProfileRef(state.uid), {
          displayName: nick,
          roleProfiles: {
            player: {
              displayName: nick,
            },
          },
          updatedAt: serverTimestamp(),
        }, { merge: true });
        setCachedProfile(state.uid, "player", merged);
      }
    } catch (profileErr) {
      if (!isPermissionDenied(profileErr)) throw profileErr;
      console.warn("Profile seed skipped due to permissions.");
    }

    await openPlayerView(s.name ?? "Session");
    showToast("Joined session!", "success");
    return true;
  } catch (e) {
    console.error(e);
    plJoinMsg.textContent = "Join failed. Check internet/Firebase/rules.";
    return false;
  } finally {
    hideAuthLoading();
  }
}

btnJoin && (btnJoin.onclick = async () => {
  const existingNick = String(plNick?.value || "").trim() || getPlayerNickname();
  const hadNickname = !!existingNick;
  const nick = existingNick || getGuestNicknameFallback();
  if (plNick && !String(plNick.value || "").trim()) {
    plNick.value = nick;
  }

  const joined = await joinPlayerSession(plSessionId?.value || "", nick, plPin?.value || "");
  if (joined && !hadNickname) {
    await requireNickname({ forcePrompt: true });
  }
});

plRecentList?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const button = target.closest(".joinRecentItem");
  if (!(button instanceof HTMLElement)) return;
  const sessionId = String(button.dataset.recentSession || "").trim();
  if (!sessionId) return;

  const entry = getRecentOneShotEntries().find((item) => item.sessionId === sessionId);
  if (!entry) return;

  plSessionId && (plSessionId.value = entry.joinTag || sessionId);
  plNick && (plNick.value = entry.nickname || "");
  plPin && (plPin.value = entry.pin || "");
  joinPlayerSession(plSessionId?.value || "", plNick?.value || "", plPin?.value || "");
});

async function openPlayerView(sessionName) {
  requestWakeLock();
  // Player view subscribes to:
  // - handouts collection (then filters revealed items client-side)
  // - session doc (for ambience changes)
  // This gives instant updates when GM reveals content or changes audio.
  cleanupListeners();

  // Player can hear audio immediately after joining.
  soundEnabled = true;
  localStorage.setItem("tv_soundEnabled", "1");
  try { syncSoundToggleUI(); } catch (_) {}

  // Session name stored for Settings display; dashboard uses static wordmark.
  state.sessionName = sessionName || "Session";

// Handouts listener:
// we receive all docs then filter locally to revealed items for player UI.
// (Server-side rules should still enforce security for truly sensitive data.)
const handoutsRef = collection(db, "sessions", state.sessionId, "handouts");
showSkeletonCards(plHandoutList, 3);
state.unsubHandouts = onSnapshot(handoutsRef, (snap) => {
  setLiveTick();

  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  state.dmHandoutsRaw = all;

  const revealedOnly = all
    .filter((h) => h.revealed === true)
    .sort((a, b) => {
      const ams = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
      const bms = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
      return bms - ams; // nieuwste eerst
    });

  renderPlayerHandouts(revealedOnly);
}, (err) => {
  console.error("Player handouts listener error:", err);
});


  // Session listener provides ambience changes in realtime.
  // Also detects session deletion (when the doc disappears).
  const sessionRef = doc(db, "sessions", state.sessionId);
  state.unsubSession = onSnapshot(sessionRef, (snap) => {
    if (!snap.exists()) {
      // Session was deleted by GM � show blocking overlay.
      if (sessionDeletedModal) animateModalIn(sessionDeletedModal);
      return;
    }
    setLiveTick();
    const s = snap.data();
    state.dmUid = String(s?.dmUid || "").trim() || null;
    state.battleActive = s?.battleActive === true;
    syncPartyBattleUi();
    renderAtmospherePanel(s.ambience);
    applyAmbience(s.ambience);
  });

  // Players listener so player-side can show online count and profiles.
  const plPlayersRef = collection(db, "sessions", state.sessionId, "players");
  let hasSeenOwnPlayerRow = false;
  state.unsubPlayers = onSnapshot(query(plPlayersRef, orderBy("lastSeenAt", "desc")), (snap) => {
    const roster = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const selfPresent = roster.some((entry) => (entry.id || entry.uid) === state.uid);
    if (selfPresent) {
      hasSeenOwnPlayerRow = true;
    } else if (hasSeenOwnPlayerRow) {
      leaveCurrentSessionLocally("You were removed from this session by the DM.", "error");
      return;
    }

    state.partyRoster = roster;
    state.activePlayers = roster.filter((entry) => entry?.isNpc !== true);
    hydrateActivePlayerProfiles(state.activePlayers).catch(() => {});
    renderPlayerPartyPanel(roster);
  });

  // Subscribe to inventory & wallet data for the inventory screen.
  subscribeInventory();

  // Show bell and subscribe to notifications.
  btnNotifBell?.classList.remove("hidden");
  subscribeNotifications();

  // Subscribe to nugget balance.
  subscribeNuggets();

  showOnly(SCREEN_KEYS.PLAYER_VIEW);
  ensureOwnProfileLoaded().catch(() => {});
  startHeartbeat();

  // "Enter the Tavern" overlay � optional cinematic step after successful join.
  // This is not authentication; it is shown in player flow and can be skipped per-session.
  const _tavernOverlay = $("enterTavernOverlay");
  const _enterBtn = $("btnEnterTavern");
  const _skipCheckbox = $("tavernSkipSession");
  const _skipKey = `tv:tavern-skip:${state.sessionId || "unknown"}`;
  const _skipForThisSession = sessionStorage.getItem(_skipKey) === "1";

  if (_tavernOverlay && !_tavernOverlay._hasEntered && !_skipForThisSession) {
    _tavernOverlay.classList.remove("hidden");
    if (_skipCheckbox) _skipCheckbox.checked = false;
    if (_enterBtn) {
      _enterBtn.onclick = () => {
        if (_skipCheckbox?.checked) {
          sessionStorage.setItem(_skipKey, "1");
        }
        _tavernOverlay.classList.add("tavern-overlay--leaving");
        const _onEnd = () => {
          _tavernOverlay.classList.add("hidden");
          _tavernOverlay.classList.remove("tavern-overlay--leaving");
        };
        _tavernOverlay.addEventListener("animationend", _onEnd, { once: true });
        setTimeout(_onEnd, 500); // fallback if animationend doesn't fire
        _tavernOverlay._hasEntered = true;
      };
    }
  }

  // First-time onboarding tour
  setTimeout(startOnboarding, 1000);

  // Auto-apply character template from QR scan
  if (state._pendingTemplateId && state.sessionId && state.uid) {
    const tid = state._pendingTemplateId;
    state._pendingTemplateId = null;
    try {
      const tSnap = await getDoc(doc(db, "sessions", state.sessionId, "characterTemplates", tid));
      if (tSnap.exists()) {
        const t = tSnap.data();
        const profileData = {};
        if (t.name) profileData.displayName = t.name;
        if (t.bio) profileData.bio = t.bio;
        if (t.quickStats) {
          PROFILE_STAT_KEYS.forEach(k => { if (t.quickStats[k] != null) profileData[k] = t.quickStats[k]; });
        }
        if (Object.keys(profileData).length > 0) {
          await setDoc(doc(db, "users", state.uid), profileData, { merge: true });
        }
        await updateDoc(doc(db, "sessions", state.sessionId, "characterTemplates", tid), {
          assignedToUid: state.uid,
          assignmentStatus: "accepted"
        });
        showToast(`Character "${t.name}" applied!`, "info");
      }
    } catch (e) { console.warn("autoApplyTemplate:", e); }
  }
}

// ---- 16) Player: render list ----
// BEGINNER NOTE � Rendering pattern:
// Every time data changes (via onSnapshot), we rebuild the entire list HTML.
// This is simpler than tracking individual DOM diffs. For small lists (<100
// items), full re-render is fast enough that users don't notice a flicker.
// Larger apps use virtual DOM libraries (React, Vue) for this, but plain
// innerHTML is perfectly fine at TomeVault's scale.
function renderPlayerHandouts(items) {
  // Player list intentionally mirrors GM rendering for a consistent visual model.
  // Player list renderer mirrors GM renderer style for consistency.
  plHandoutList.innerHTML = "";
  plHandoutEmpty.classList.toggle("hidden", items.length > 0);

  items.forEach((h, index) => {
    const row = document.createElement("div");
    row.className = "item list-stagger-item";
    row.style.setProperty("--stagger-index", String(index));
    row.style.borderLeft = `4px solid ${h.accentColor || "#f5c82f"}`;
    const visibleImageUrl = getVisibleHandoutImageUrl(h, "player", state.uid);
    const frameStyle = buildImageFrameInlineStyle(h.imageFrame);
    const displayTitle = getSafeHandoutTitle(h);
    const thumbHtml = visibleImageUrl
      ? `<div class="item__thumb"><img src="${escapeHtml(visibleImageUrl)}" alt="${escapeHtml(displayTitle)} portrait"${frameStyle} /></div>`
      : `<div class="item__thumb">${getHeroIconSvg("photo", "itemThumbIcon")}</div>`;
    // Same compatibility strategy as GM list.
    const iconMarkup = getHeroIconSvg(normalizeIconKey(h.iconKey || h.iconEmoji), "itemIconSvg");
    const visibilityMeta = `<span class="handoutMetaIcon handoutMetaIcon--visible" title="Visible" aria-label="Visible"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 12s3.8-6 10.5-6 10.5 6 10.5 6-3.8 6-10.5 6S1.5 12 1.5 12z"></path><circle cx="12" cy="12" r="3.2"></circle></svg></span>`;
    const secretMeta = h.secretRevealed
      ? `<span class="handoutMetaIcon handoutMetaIcon--secret" title="Secret revealed" aria-label="Secret revealed"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8.5" cy="15.5" r="3.5"></circle><path d="M12 15.5h8"></path><path d="M17 12.5v6"></path><path d="M20 13.5v4"></path></svg></span>`
      : `<span class="handoutMetaIcon handoutMetaIcon--secretOff" title="Secret hidden" aria-label="Secret hidden"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8.5" cy="15.5" r="3.5"></circle><path d="M12 15.5h8"></path><path d="M17 12.5v6"></path><path d="M20 13.5v4"></path><path d="M4 20 20 4"></path></svg></span>`;
    const typeTag = `<span class="tag">${escapeHtml((h.type ?? "handout").toUpperCase())}</span>`;
    row.innerHTML = `
      <div class="item__meta">
        <span class="itemEmoji">${iconMarkup}</span>
        <div>
          <div class="handoutMetaRow">
            ${typeTag}
            ${visibilityMeta}
            ${secretMeta}
          </div>
          <div><strong>${escapeHtml(displayTitle)}</strong></div>
        </div>
      </div>
      ${thumbHtml}
    `;
    row.onclick = () => openModal({ ...h, id: h.id }, "player");
    plHandoutList.appendChild(row);
  });
  initVirtualScroll(plHandoutList);
}

// Old renderPlayerInventory removed � replaced by the new inventory system below.

// ---- 16b) Inventory System ----
// Manages custom inventory items, wallets (per-player + party treasury),
// and claimed handout display in the unified inventory screen.

let inventoryAvatarIndex = 0;
let inventoryAvatarUrls = [];
let pendingInventoryImageUrl = null; // custom uploaded image URL

// Deferred from earlier � must run after these let declarations to avoid TDZ error
setupInventoryAvatarNav();

// -- Inventory custom image upload --
btnInvUploadImage?.addEventListener("click", () => inventoryImageUpload?.click());
inventoryImageUpload?.addEventListener("change", async () => {
  const file = inventoryImageUpload.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    if (inventoryImageStatus) inventoryImageStatus.textContent = "Please select an image file.";
    return;
  }
  if (inventoryImageStatus) inventoryImageStatus.textContent = "Uploading...";
  let uploadFile;
  try { uploadFile = await compressImageToMaxSize(file); } catch (_) { if (inventoryImageStatus) inventoryImageStatus.textContent = "Could not process image."; return; }
  const ext = (uploadFile.name.split(".").pop() || "png").toLowerCase();
  const path = `users/${state.uid}/inventory/${Date.now()}.${ext}`;
  const ref = storageRef(storage, path);
  try {
    await uploadBytes(ref, uploadFile, { contentType: uploadFile.type });
    pendingInventoryImageUrl = await getDownloadURL(ref);
    setInventoryAvatarPreview(pendingInventoryImageUrl);
    if (inventoryImageStatus) inventoryImageStatus.textContent = "Uploaded (1 ?? on save).";
    pendingInventoryNugget = true;
  } catch (e) {
    console.error("Inventory image upload:", e);
    if (inventoryImageStatus) inventoryImageStatus.textContent = "Upload failed.";
  }
});

function getItemPlaceholderImages() {
  // Collect all item-style placeholder images for the inventory avatar picker.
  // Only generates paths that exist on disk (81 total):
  //   Prompts 1-3: image1 & image2, variants 1-9 each (18 per prompt = 54)
  //   Prompt 4:    image1, image2 & image3, variants 1-9 each (27)
  if (inventoryAvatarUrls.length > 0) return inventoryAvatarUrls;
  const all = [];
  const imageCountPerPrompt = { 1: 2, 2: 2, 3: 2, 4: 3 };
  for (let p = 1; p <= 4; p++) {
    const maxImage = imageCountPerPrompt[p];
    for (let n = 1; n <= maxImage; n++) {
      for (let v = 1; v <= 9; v++) {
        all.push(`placeholders/itemsPrompt${p}image${n}_${v}.png`);
      }
    }
  }
  inventoryAvatarUrls = all;
  return all;
}

function setInventoryAvatarPreview(url) {
  if (!inventoryItemAvatarPreview || !inventoryItemAvatarPlaceholder) return;
  if (url) {
    inventoryItemAvatarPreview.src = url;
    inventoryItemAvatarPreview.classList.remove("hidden");
    inventoryItemAvatarPlaceholder.classList.add("hidden");
    inventoryItemAvatarPreview.onerror = () => {
      inventoryItemAvatarPreview.classList.add("hidden");
      inventoryItemAvatarPlaceholder.classList.remove("hidden");
    };
  } else {
    inventoryItemAvatarPreview.classList.add("hidden");
    inventoryItemAvatarPlaceholder.classList.remove("hidden");
  }
}

function setupInventoryAvatarNav() {
  const images = getItemPlaceholderImages();
  if (!images.length) return;
  inventoryAvatarIndex = Math.floor(Math.random() * images.length);
  setInventoryAvatarPreview(images[inventoryAvatarIndex]);

  btnInvAvatarPrev?.addEventListener("click", () => {
    inventoryAvatarIndex = (inventoryAvatarIndex - 1 + images.length) % images.length;
    setInventoryAvatarPreview(images[inventoryAvatarIndex]);
  });
  btnInvAvatarNext?.addEventListener("click", () => {
    inventoryAvatarIndex = (inventoryAvatarIndex + 1) % images.length;
    setInventoryAvatarPreview(images[inventoryAvatarIndex]);
  });
  btnInvAvatarRandom?.addEventListener("click", () => {
    inventoryAvatarIndex = Math.floor(Math.random() * images.length);
    setInventoryAvatarPreview(images[inventoryAvatarIndex]);
  });

  btnInvAvatarGallery?.addEventListener("click", () => {
    const opening = invGalleryPanel?.classList.contains("hidden");
    invGalleryPanel?.classList.toggle("hidden", !opening);
    btnInvAvatarGallery?.classList.toggle("is-active", !!opening);
    if (opening) renderInvGallery();
  });

  invGalleryGrid?.addEventListener("click", (e) => {
    const tile = e.target.closest(".invGalleryTile");
    if (!tile) return;
    const url = tile.dataset.url;
    if (!url) return;
    const idx = images.indexOf(url);
    if (idx >= 0) inventoryAvatarIndex = idx;
    setInventoryAvatarPreview(url);
    renderInvGallery();
  });
}

function renderInvGallery() {
  if (!invGalleryGrid) return;
  const images = getItemPlaceholderImages();
  const currentUrl = images[inventoryAvatarIndex] || "";
  invGalleryGrid.innerHTML = images.map((url) => {
    const active = url === currentUrl;
    return `<button class="invGalleryTile${active ? " is-active" : ""}" type="button" role="option" aria-selected="${active}" data-url="${url}"><img src="${url}" alt="Item image" loading="lazy" /></button>`;
  }).join("");
  const sel = invGalleryGrid.querySelector(".invGalleryTile.is-active");
  if (sel) sel.scrollIntoView({ block: "center", inline: "nearest" });
}

function openCreateInventoryModal(ownerUid) {
  if (!createInventoryModal) return;
  pendingInventoryImageUrl = null;
  inventoryItemId.value = "";
  inventoryItemOwner.value = ownerUid || state.uid;
  inventoryItemName.value = "";
  inventoryItemDesc.value = "";
  inventoryItemAmount.value = "1";
  inventoryModalTitle.textContent = "New Item";
  btnSaveInventoryItem.textContent = "Create Item";

  const images = getItemPlaceholderImages();
  inventoryAvatarIndex = Math.floor(Math.random() * images.length);
  setInventoryAvatarPreview(images[inventoryAvatarIndex]);

  invGalleryPanel?.classList.add("hidden");
  btnInvAvatarGallery?.classList.remove("is-active");
  if (inventoryImageStatus) inventoryImageStatus.textContent = "";
  if (inventoryImageUpload) inventoryImageUpload.value = "";
  animateModalIn(createInventoryModal);
}

function openEditInventoryModal(item) {
  if (!createInventoryModal) return;
  pendingInventoryImageUrl = null;
  inventoryItemId.value = item.id;
  inventoryItemOwner.value = item.ownerUid;
  inventoryItemName.value = item.name || "";
  inventoryItemDesc.value = item.description || "";
  inventoryItemAmount.value = String(item.amount || 1);
  inventoryModalTitle.textContent = "Edit Item";
  btnSaveInventoryItem.textContent = "Save Item";

  if (item.avatarUrl) {
    const images = getItemPlaceholderImages();
    const idx = images.indexOf(item.avatarUrl);
    if (idx >= 0) inventoryAvatarIndex = idx;
    setInventoryAvatarPreview(item.avatarUrl);
  } else {
    setInventoryAvatarPreview(null);
  }

  invGalleryPanel?.classList.add("hidden");
  btnInvAvatarGallery?.classList.remove("is-active");
  if (inventoryImageStatus) inventoryImageStatus.textContent = "";
  if (inventoryImageUpload) inventoryImageUpload.value = "";
  animateModalIn(createInventoryModal);
}

function closeInventoryModal() {
  invGalleryPanel?.classList.add("hidden");
  btnInvAvatarGallery?.classList.remove("is-active");
  animateModalOut(createInventoryModal);
}

btnCloseInventoryModal?.addEventListener("click", closeInventoryModal);

btnSaveInventoryItem?.addEventListener("click", async () => {
  const name = inventoryItemName?.value?.trim();
  if (!name) { showToast("Item name is required.", "error"); return; }

  if (pendingInventoryNugget) {
    const ok = await spendNuggetWithFeedback("item image");
    if (!ok) return;
    pendingInventoryNugget = false;
  }

  const description = inventoryItemDesc?.value?.trim() || "";
  const amount = Math.max(1, parseInt(inventoryItemAmount?.value, 10) || 1);
  const ownerUid = inventoryItemOwner?.value || state.uid;
  const images = getItemPlaceholderImages();
  const avatarUrl = pendingInventoryImageUrl || images[inventoryAvatarIndex] || "";
  const existingId = inventoryItemId?.value?.trim();

  try {
    const inventoryCol = collection(db, "sessions", state.sessionId, "inventory");
    if (existingId) {
      // Update existing item
      await updateDoc(doc(db, "sessions", state.sessionId, "inventory", existingId), {
        name, description, amount, avatarUrl,
        updatedAt: serverTimestamp(),
      });
      showToast("Item updated.", "success");
    } else {
      // Create new item
      const ownerNick = getOwnerNick(ownerUid);
      await addDoc(inventoryCol, {
        ownerUid,
        ownerNick,
        type: "custom",
        name, description, amount, avatarUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      showToast("Item created.", "success");
    }
    closeInventoryModal();
  } catch (e) {
    console.error("Save inventory item failed:", e);
    showToast("Could not save item.", "error");
  }
});

function getOwnerNick(uid) {
  // Try to find a display name from profileCache, activePlayers, or state.
  if (uid === state.uid && state.playerNick) return state.playerNick;
  const profile = getCachedProfile(uid, "player");
  if (profile?.displayName) return profile.displayName;
  const player = state.activePlayers.find(p => (p.id || p.uid) === uid);
  if (player?.nickname) return player.nickname;
  return "Unknown";
}

async function deleteInventoryItem(itemId) {
  showUndoToast("Item deleted.", async () => {
    try {
      await deleteDoc(doc(db, "sessions", state.sessionId, "inventory", itemId));
    } catch (e) {
      console.error("Delete inventory item failed:", e);
      showToast("Could not delete item.", "error");
    }
  });
}

async function updateWallet(walletId, denom, delta) {
  // Increment or decrement a coin denomination in a wallet document.
  // BEGINNER NOTE � Wallet architecture:
  // Each wallet is a Firestore document at `sessions/{id}/wallets/{walletId}`.
  //   walletId = "party" for the shared party treasury
  //   walletId = player UID for individual coin pouches
  // Each document has {platinum, gold, silver, bronze} integer fields.
  // We use Math.max(0, ...) to prevent negative coin counts.
  const walletRef = doc(db, "sessions", state.sessionId, "wallets", walletId);
  try {
    const snap = await getDoc(walletRef);
    if (!snap.exists()) {
      // Create wallet if it doesn't exist yet.
      await setDoc(walletRef, {
        platinum: 0, gold: 0, silver: 0, bronze: 0,
        [denom]: Math.max(0, delta),
        updatedAt: serverTimestamp(),
      });
    } else {
      const current = snap.data()[denom] || 0;
      const newVal = Math.max(0, current + delta);
      await updateDoc(walletRef, {
        [denom]: newVal,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (e) {
    console.error("Update wallet failed:", e);
    showToast("Could not update coins.", "error");
  }
}

function canEditInventoryFor(ownerUid) {
  return state.role === "dm" || ownerUid === state.uid;
}

function canEditWallet(walletId) {
  if (walletId === "party") return state.role === "dm";
  return state.role === "dm" || walletId === state.uid;
}

const COIN_VALUES_IN_BRONZE = {
  bronze: 1,
  silver: 10,
  gold: 100,
  platinum: 10000,
};

function normalizeCoinAmount(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.floor(num));
}

function walletToBronzeValue(wallet = {}) {
  return (Object.keys(COIN_VALUES_IN_BRONZE)).reduce((total, denom) => {
    return total + normalizeCoinAmount(wallet[denom]) * COIN_VALUES_IN_BRONZE[denom];
  }, 0);
}

function bronzeValueToWallet(totalBronze) {
  let remaining = normalizeCoinAmount(totalBronze);
  const wallet = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  ["platinum", "gold", "silver", "bronze"].forEach((denom) => {
    const value = COIN_VALUES_IN_BRONZE[denom];
    wallet[denom] = Math.floor(remaining / value);
    remaining %= value;
  });
  return wallet;
}

// ---- Distribute coins from party treasury to a player ----
// BEGINNER NOTE � Firestore transactions:
// A transaction reads data, computes new values, then writes them atomically.
// "Atomic" means ALL reads and writes succeed or NONE do � no partial updates.
// This prevents a race condition where two DMs could overdraw the treasury if
// they clicked "Send" at the same time. The transaction retries automatically
// if another write happens between our read and write.
async function distributeFromTreasury(targetUid, denom, amount) {
  if (state.role !== "dm") { showToast("Only the DM can distribute coins.", "error"); return; }
  if (!targetUid || !denom || !amount || amount <= 0) { showToast("Invalid transfer.", "error"); return; }
  if (!Object.prototype.hasOwnProperty.call(COIN_VALUES_IN_BRONZE, denom)) {
    showToast("Invalid coin type.", "error");
    return;
  }
  const partyRef = doc(db, "sessions", state.sessionId, "wallets", "party");
  const playerRef = doc(db, "sessions", state.sessionId, "wallets", targetUid);
  try {
    await runTransaction(db, async (transaction) => {
      const partySnap = await transaction.get(partyRef);
      const partyData = partySnap.exists() ? partySnap.data() : { platinum: 0, gold: 0, silver: 0, bronze: 0 };
      const transferAmount = normalizeCoinAmount(amount);
      const transferValue = transferAmount * COIN_VALUES_IN_BRONZE[denom];
      const availableValue = walletToBronzeValue(partyData);
      if (availableValue < transferValue) throw new Error("Not enough total coins in treasury.");
      const updatedPartyWallet = bronzeValueToWallet(availableValue - transferValue);

      const playerSnap = await transaction.get(playerRef);
      const playerData = playerSnap.exists() ? playerSnap.data() : { platinum: 0, gold: 0, silver: 0, bronze: 0 };
      transaction.set(partyRef, { ...partyData, ...updatedPartyWallet, updatedAt: serverTimestamp() });
      transaction.set(playerRef, { ...playerData, [denom]: normalizeCoinAmount(playerData[denom]) + transferAmount, updatedAt: serverTimestamp() });
    });
    const nick = getOwnerNick(targetUid);
    showToast(`Sent ${amount} ${denom} to ${nick}.`, "success");
    // Notify the receiving player.
    try {
      await createNotification(targetUid, "coinsReceived", `You received ${amount} ${denom} from the treasury.`);
    } catch (notifyErr) {
      console.warn("coinsReceived notification failed:", notifyErr);
      showToast("Coins sent, but player notification failed.", "error");
    }
  } catch (e) {
    console.error("Distribute from treasury failed:", e);
    showToast(e.message || "Could not transfer coins.", "error");
  }
}

// ---- Grant arbitrary coins to a player (no treasury deduction) ----
async function grantCoinsToPlayer(targetUid, denom, amount) {
  if (state.role !== "dm") { showToast("Only the DM can grant coins.", "error"); return; }
  if (!targetUid || !denom || !amount || amount <= 0) { showToast("Invalid grant.", "error"); return; }
  const walletRef = doc(db, "sessions", state.sessionId, "wallets", targetUid);
  try {
    const snap = await getDoc(walletRef);
    if (!snap.exists()) {
      await setDoc(walletRef, { platinum: 0, gold: 0, silver: 0, bronze: 0, [denom]: amount, updatedAt: serverTimestamp() });
    } else {
      const current = snap.data()[denom] || 0;
      await updateDoc(walletRef, { [denom]: current + amount, updatedAt: serverTimestamp() });
    }
    const nick = getOwnerNick(targetUid);
    showToast(`Granted ${amount} ${denom} to ${nick}.`, "success");
    // Notify the receiving player.
    try {
      await createNotification(targetUid, "coinsReceived", `The DM granted you ${amount} ${denom}.`);
    } catch (notifyErr) {
      console.warn("coinsReceived notification failed:", notifyErr);
      showToast("Coins granted, but player notification failed.", "error");
    }
  } catch (e) {
    console.error("Grant coins failed:", e);
    showToast("Could not grant coins.", "error");
  }
}

function subscribeInventory() {
  if (!state.sessionId) return;

  // Clean up any existing inventory/wallet subscriptions to prevent leaks.
  if (state.unsubInventory) { state.unsubInventory(); state.unsubInventory = null; }
  if (state.unsubWallets) { state.unsubWallets(); state.unsubWallets = null; }

  // Subscribe to inventory items
  const inventoryRef = collection(db, "sessions", state.sessionId, "inventory");
  const invQuery = query(inventoryRef, orderBy("createdAt", "asc"));
  state.unsubInventory = onSnapshot(invQuery, (snap) => {
    state.inventoryItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderInventoryScreen();
  }, (err) => {
    console.error("Inventory listener error:", err);
    showToast("Could not load inventory. Check connection.", "error");
    // Still render what we can so the screen is not blank.
    renderInventoryScreen();
  });

  // Subscribe to wallets
  const walletsRef = collection(db, "sessions", state.sessionId, "wallets");
  state.unsubWallets = onSnapshot(walletsRef, (snap) => {
    const w = {};
    snap.docs.forEach(d => { w[d.id] = d.data(); });
    state.wallets = w;
    renderInventoryScreen();
  }, (err) => {
    console.error("Wallets listener error:", err);
    // Still render what we can.
    renderInventoryScreen();
  });

  // Render immediately with current state so the screen is not blank
  // while waiting for the first onSnapshot callback.
  renderInventoryScreen();
}

function renderWalletCoins(containerEl, walletId, walletData) {
  if (!containerEl) return;
  const denoms = ["bronze", "silver", "gold", "platinum"];
  const editable = canEditWallet(walletId);

  denoms.forEach(denom => {
    const valueEl = containerEl.querySelector(`.coinValue[data-wallet="${walletId}"][data-denom="${denom}"]`);
    if (valueEl) {
      const newVal = String((walletData && walletData[denom]) || 0);
      if (valueEl.textContent !== newVal) {
        valueEl.textContent = newVal;
        // Pulse the coin badge so the player notices the change.
        valueEl.classList.remove("coin-pulse");
        void valueEl.offsetWidth;
        valueEl.classList.add("coin-pulse");
        // Haptic feedback on mobile devices.
        if (navigator.vibrate) try { navigator.vibrate(40); } catch {}
      }
    }

    const controlsEl = containerEl.querySelector(`.coinItem[data-coin="${denom}"] .coinControls`);
    if (controlsEl) controlsEl.classList.toggle("hidden", !editable);
  });
}

function renderInventoryScreen() {
  if (!inventoryPlayersContainer) return;
  const isDM = state.role === "dm";

  // Party treasury: GM-only. Players never see it.
  if (partyTreasurySection) {
    partyTreasurySection.classList.toggle("hidden", !isDM);
  }
  if (isDM) {
    renderWalletCoins(partyTreasuryCoins, "party", state.wallets.party);
    // Render or refresh the distribute UI inside the treasury section.
    let distWrap = partyTreasurySection?.querySelector(".treasuryDistributeWrap");
    if (!distWrap && partyTreasurySection) {
      distWrap = document.createElement("div");
      distWrap.className = "treasuryDistributeWrap";
      partyTreasurySection.appendChild(distWrap);
    }
    if (distWrap) {
      let players = (state.activePlayers || []).filter(p => (p.id || p.uid) !== state.uid || state.activePlayers.length === 1);
      // If activePlayers is empty (listener hasn't fired yet), try a one-time fetch
      // so the dropdown isn't blank the first time GM opens inventory.
      if (players.length === 0 && state.sessionId && !distWrap._fetchingPlayers) {
        distWrap._fetchingPlayers = true;
        getDocs(query(collection(db, "sessions", state.sessionId, "players"), orderBy("lastSeenAt", "desc")))
          .then(snap => {
            const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            if (!state.activePlayers || state.activePlayers.length === 0) {
              state.activePlayers = fetched;
            }
            renderInventoryScreen();
          })
          .catch(() => {})
          .finally(() => { distWrap._fetchingPlayers = false; });
      }
      distWrap.innerHTML = `
        <div class="treasuryDistribute">
          <span class="label small">Distribute to player</span>
          <select class="input input--small treasuryDistribute__player">
            ${players.map(p => `<option value="${p.id || p.uid}">${escapeHtml(p.nickname || getOwnerNick(p.id || p.uid))}</option>`).join("")}
          </select>
          <div class="treasuryDistribute__row">
            <select class="input input--small treasuryDistribute__denom">
              <option value="platinum">Platinum</option>
              <option value="gold" selected>Gold</option>
              <option value="silver">Silver</option>
              <option value="bronze">Bronze</option>
            </select>
            <input class="input input--small treasuryDistribute__amount" type="number" min="1" value="1" placeholder="1">
            <button class="btn btn--small treasuryDistribute__send" type="button">Send</button>
          </div>
        </div>
      `;
    }
  }

  // Collect all player UIDs who have items or wallets or are active
  const playerUids = new Set();
  const knownPlayerUids = new Set();
  state.activePlayers.forEach((p) => {
    const pid = String(p?.id || p?.uid || "").trim();
    if (pid) knownPlayerUids.add(pid);
  });
  (state.partyRoster || []).forEach((p) => {
    const pid = String(p?.id || p?.uid || "").trim();
    if (pid) knownPlayerUids.add(pid);
  });
  if (state.uid) knownPlayerUids.add(String(state.uid));
  if (state.dmUid) knownPlayerUids.add(String(state.dmUid));

  // Apply inventory search filter
  const filteredItems = inventorySearchQuery
    ? state.inventoryItems.filter(item => {
        const name = (item.name || "").toLowerCase();
        const desc = (item.description || "").toLowerCase();
        return name.includes(inventorySearchQuery) || desc.includes(inventorySearchQuery);
      })
    : state.inventoryItems;
  const ownersWithItems = new Set();
  filteredItems.forEach((item) => {
    const ownerUid = String(item?.ownerUid || "").trim();
    if (!ownerUid) return;
    ownersWithItems.add(ownerUid);
    playerUids.add(ownerUid);
  });
  Object.keys(state.wallets).forEach((k) => {
    if (k === "party") return;
    if (knownPlayerUids.has(k) || ownersWithItems.has(k)) playerUids.add(k);
  });
  state.activePlayers.forEach(p => playerUids.add(p.id || p.uid));
  if (state.uid) playerUids.add(state.uid);

  // Group items by owner
  const itemsByOwner = {};
  filteredItems.forEach(item => {
    if (!itemsByOwner[item.ownerUid]) itemsByOwner[item.ownerUid] = [];
    itemsByOwner[item.ownerUid].push(item);
  });

  // Also gather claimed handouts for each player
  const claimedByOwner = {};
  (state.dmHandoutsRaw || []).forEach(h => {
    if (h.claimedByUid) {
      if (!claimedByOwner[h.claimedByUid]) claimedByOwner[h.claimedByUid] = [];
      claimedByOwner[h.claimedByUid].push(h);
    }
  });

  inventoryPlayersContainer.innerHTML = "";

  const sortedUids = [...playerUids].sort((a, b) => {
    // Current user first, then alphabetical by name
    if (a === state.uid) return -1;
    if (b === state.uid) return 1;
    return (getOwnerNick(a) || "").localeCompare(getOwnerNick(b) || "");
  });

  let totalItems = 0;

  sortedUids.forEach((uid, ownerIndex) => {
    const items = itemsByOwner[uid] || [];
    const claimed = claimedByOwner[uid] || [];
    if (!knownPlayerUids.has(uid) && items.length === 0 && claimed.length === 0) return;
    const wallet = state.wallets[uid];
    const nick = getOwnerNick(uid);
    if (nick === "Unknown" && items.length === 0 && claimed.length === 0) return;
    const isMe = uid === state.uid;
    const canEdit = canEditInventoryFor(uid);

    // GM doesn't get a personal wallet section � they manage party treasury instead.
    const isDMSelf = isDM && isMe;
    const showWallet = !isDMSelf;

    // Skip rendering the GM's own section entirely if they have no items.
    // The GM manages gold via party treasury, so an empty personal section is clutter.
    if (isDMSelf && items.length === 0 && claimed.length === 0) return;

    totalItems += items.length + claimed.length;

    const section = document.createElement("div");
    section.className = "inventoryPlayerSection list-stagger-item";
    section.style.setProperty("--stagger-index", String(ownerIndex));

    // Header with collapse toggle
    // Keep only the viewer's own section expanded by default.
    const startCollapsed = !isMe;
    const header = document.createElement("div");
    header.className = "inventoryPlayerHeader";
    header.innerHTML = `
      <h3>${escapeHtml(nick)}${isMe ? ' <span class="muted small">(You)</span>' : ""}</h3>
      <svg class="inventoryPlayerHeader__chevron${startCollapsed ? "" : " is-open"}" viewBox="0 0 24 24" fill="none"><path d="M9 6L15 12L9 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
    `;

    const body = document.createElement("div");
    body.className = "inventoryPlayerBody";
    if (startCollapsed) body.style.display = "none";

    // Per-player wallet (Coin Pouch) � hidden for the GM's own section
    if (showWallet) {
    const walletSection = document.createElement("div");
    walletSection.className = "inventoryPlayerCoins coinSection";
    const walletEditable = canEditWallet(uid);
    const denoms = ["bronze", "silver", "gold", "platinum"];
    const denomLabels = { platinum: "P", gold: "G", silver: "S", bronze: "B" };
    const denomColors = { platinum: "coinIcon--platinum", gold: "coinIcon--gold", silver: "coinIcon--silver", bronze: "coinIcon--bronze" };

    walletSection.innerHTML = `
      <div class="coinSection__head"><span class="muted small">Coin Pouch</span></div>
      <div class="coinRow">
        ${denoms.map(d => `
          <div class="coinItem" data-coin="${d}">
            <div class="coinItem__center">
              <span class="coinIcon ${denomColors[d]}" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/><text x="12" y="16" text-anchor="middle" font-size="10" font-weight="700" fill="currentColor">${denomLabels[d]}</text></svg>
              </span>
              <span class="coinValue">${(wallet && wallet[d]) || 0}</span>
            </div>
            ${walletEditable ? `
              <div class="coinControls">
                <button class="coinBtn coinBtn--minus" data-wallet-id="${uid}" data-denom="${d}" type="button" aria-label="Remove ${d}" title="Click or hold to remove ${d}"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14"/></svg></button>
                <button class="coinBtn coinBtn--plus" data-wallet-id="${uid}" data-denom="${d}" type="button" aria-label="Add ${d}" title="Click or hold to add ${d}"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg></button>
              </div>
            ` : ""}
          </div>
        `).join("")}
      </div>
    `;
    body.appendChild(walletSection);
    }

    // GM-only: inline "Grant Coins" form for each player (not for own wallet)
    if (isDM && uid !== state.uid) {
      const grantDiv = document.createElement("div");
      grantDiv.className = "grantCoinsRow";
      grantDiv.innerHTML = `
        <select class="input input--small grantCoins__denom">
          <option value="gold" selected>Gold</option>
          <option value="platinum">Platinum</option>
          <option value="silver">Silver</option>
          <option value="bronze">Bronze</option>
        </select>
        <input class="input input--small grantCoins__amount" type="number" min="1" value="1" placeholder="Amt" style="width:70px">
        <button class="btn btn--small btn--ghost grantCoins__btn" data-target-uid="${uid}" type="button">Grant</button>
      `;
      body.appendChild(grantDiv);
    }

    // Custom inventory items
    const itemList = document.createElement("div");
    itemList.className = "inventoryItemList";

    items.forEach((item, itemIndex) => {
      const card = document.createElement("div");
      card.className = "inventoryCard list-stagger-item";
      card.style.setProperty("--stagger-index", String(itemIndex));
      const avatarHtml = item.avatarUrl
        ? `<img src="${escapeHtml(item.avatarUrl)}" alt="${escapeHtml(item.name)}">`
        : `<svg viewBox="0 0 24 24" fill="none"><path d="M7 8H17L18 20H6L7 8Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 8V7C9 5.343 10.343 4 12 4C13.657 4 15 5.343 15 7V8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;

      card.innerHTML = `
        <div class="inventoryCard__avatar">${avatarHtml}</div>
        <div class="inventoryCard__body">
          <div class="inventoryCard__name">${escapeHtml(item.name)}</div>
          ${item.description ? `<div class="inventoryCard__desc">${escapeHtml(item.description)}</div>` : ""}
        </div>
        <div class="inventoryCard__right">
          <span class="inventoryCard__amount">�${item.amount || 1}</span>
          ${canEdit ? `
            <div class="inventoryCard__actions">
              <button class="inventoryCard__actionBtn inventoryCard__actionBtn--edit" data-item-id="${item.id}" type="button" aria-label="Edit item" title="Edit">
                <svg viewBox="0 0 24 24" fill="none"><path d="M15.232 5.232l3.536 3.536M9 13l-2 6 6-2 9.5-9.5a2.121 2.121 0 00-3-3L10 14z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <button class="inventoryCard__actionBtn inventoryCard__actionBtn--delete" data-item-id="${item.id}" type="button" aria-label="Delete item" title="Delete">
                <svg viewBox="0 0 24 24" fill="none"><path d="M19 7L5 7M10 11V17M14 11V17M4 7H20L18.5 20.5H5.5L4 7ZM8 7V4H16V7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
            </div>
          ` : ""}
        </div>
      `;
      itemList.appendChild(card);
    });

    body.appendChild(itemList);

    // Claimed handouts section
    if (claimed.length > 0) {
      const claimedDiv = document.createElement("div");
      claimedDiv.className = "inventoryClaimedSection";
      claimedDiv.innerHTML = `<h4>Claimed Handouts</h4>`;
      claimed.forEach((h, claimedIndex) => {
        const row = document.createElement("div");
        row.className = "inventoryCard list-stagger-item";
        row.style.setProperty("--stagger-index", String(items.length + claimedIndex));
        const frameStyle = buildImageFrameInlineStyle(h.imageFrame);
        const thumbHtml = h.imageUrl
          ? `<img src="${escapeHtml(h.imageUrl)}" alt="${escapeHtml(h.title)}"${frameStyle}>`
          : getHeroIconSvg("document", "");
        row.innerHTML = `
          <div class="inventoryCard__avatar">${thumbHtml}</div>
          <div class="inventoryCard__body">
            <div class="inventoryCard__name">${escapeHtml(h.title)}</div>
            <div class="inventoryCard__desc">${escapeHtml((h.type ?? "handout").toUpperCase())}</div>
          </div>
        `;
        row.style.cursor = "pointer";
        row.onclick = () => openModal({ ...h, id: h.id }, state.role === "dm" ? "dm" : "player");
        claimedDiv.appendChild(row);
      });
      body.appendChild(claimedDiv);
    }

    // Add item button for editable users
    if (canEdit) {
      const addBtn = document.createElement("button");
      addBtn.className = "btn btn--ghost btn--small";
      addBtn.type = "button";
      addBtn.style.marginTop = "8px";
      addBtn.innerHTML = `<svg style="width:16px;height:16px;display:inline-block;vertical-align:middle;margin-right:4px" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"></path></svg> Add Item`;
      addBtn.addEventListener("click", () => openCreateInventoryModal(uid));
      body.appendChild(addBtn);
    }

    header.addEventListener("click", () => {
      const chevron = header.querySelector(".inventoryPlayerHeader__chevron");
      const isOpen = body.style.display !== "none";
      body.style.display = isOpen ? "none" : "";
      chevron?.classList.toggle("is-open", !isOpen);
    });

    section.appendChild(header);
    section.appendChild(body);
    inventoryPlayersContainer.appendChild(section);
  });

  // Show/hide empty state
  if (inventoryEmptyMsg) {
    inventoryEmptyMsg.classList.toggle("hidden", totalItems > 0 || sortedUids.length > 0);
  }
}

// Delegated click handler for inventory screen actions.
//
// BEGINNER NOTE � Event Delegation:
// Instead of attaching individual onclick handlers to every dynamically-created
// button (which would have to be re-attached every time the list re-renders),
// we attach ONE listener on `document` and inspect `e.target`. The `.closest()`
// method walks up the DOM tree to find the nearest ancestor matching a selector.
// This pattern is both faster (fewer listeners) and simpler (no re-wiring).
document.addEventListener("click", (e) => {
  const target = e.target instanceof Element ? e.target : null;
  if (!target) return;

  // Coin button clicks � hold-to-repeat supported via pointerdown/up
  // (single clicks still work; delegation just prevents default)
  const coinBtn = target.closest(".coinBtn");
  if (coinBtn) {
    e.preventDefault();
    return; // actual logic handled by pointerdown listener below
  }

  // Edit inventory item
  const editBtn = target.closest(".inventoryCard__actionBtn--edit");
  if (editBtn) {
    e.preventDefault();
    const itemId = editBtn.dataset.itemId;
    const item = state.inventoryItems.find(i => i.id === itemId);
    if (item) openEditInventoryModal(item);
    return;
  }

  // Delete inventory item
  const deleteBtn = target.closest(".inventoryCard__actionBtn--delete");
  if (deleteBtn) {
    e.preventDefault();
    const itemId = deleteBtn.dataset.itemId;
    if (itemId) deleteInventoryItem(itemId);
    return;
  }

  // Treasury distribute: GM sends coins from party treasury to a player
  const sendBtn = target.closest(".treasuryDistribute__send");
  if (sendBtn) {
    e.preventDefault();
    const row = sendBtn.closest(".treasuryDistribute__row");
    if (!row) return;
    const playerUid = row.closest(".treasuryDistribute")?.querySelector(".treasuryDistribute__player")?.value
        || row.querySelector(".treasuryDistribute__player")?.value;
    const denom = row.querySelector(".treasuryDistribute__denom")?.value;
    const amount = parseInt(row.querySelector(".treasuryDistribute__amount")?.value, 10);
    if (!playerUid) { showToast("Select a player to send coins to.", "error"); return; }
    if (denom && amount > 0) distributeFromTreasury(playerUid, denom, amount);
    return;
  }

  // GM grants coins to a player (no treasury deduction)
  const grantBtn = target.closest(".grantCoins__btn");
  if (grantBtn) {
    e.preventDefault();
    const targetUid = grantBtn.dataset.targetUid;
    const row = grantBtn.closest(".grantCoinsRow");
    if (!row) return;
    const denom = row.querySelector(".grantCoins__denom")?.value;
    const amount = parseInt(row.querySelector(".grantCoins__amount")?.value, 10);
    if (!targetUid) { showToast("No player selected � choose a player first.", "error"); return; }
    if (denom && amount > 0) grantCoinsToPlayer(targetUid, denom, amount);
    return;
  }
});

// -- Hold-to-repeat for coin buttons --
// First click fires immediately. After a 400ms delay, coins repeat at 100ms intervals
// until the pointer is released. Works with both mouse and touch.
(function setupCoinHoldToRepeat() {
  let repeatTimer = null;
  let repeatDelay = null;

  function fireCoin(btn) {
    const walletId = btn.dataset.walletId || btn.dataset.wallet;
    const denom = btn.dataset.denom;
    if (!walletId || !denom) return;
    if (!canEditWallet(walletId)) { showToast("You can't edit this wallet.", "error"); return; }
    const delta = btn.classList.contains("coinBtn--plus") ? 1 : -1;
    // TODO: play coin click sound here when sound files are provided
    updateWallet(walletId, denom, delta);
  }

  function stopRepeat() {
    clearTimeout(repeatDelay);
    clearInterval(repeatTimer);
    repeatDelay = null;
    repeatTimer = null;
  }

  document.addEventListener("pointerdown", (e) => {
    const btn = e.target.closest(".coinBtn");
    if (!btn) return;
    e.preventDefault();
    fireCoin(btn);
    repeatDelay = setTimeout(() => {
      repeatTimer = setInterval(() => fireCoin(btn), 50);
    }, 200);
  });

  document.addEventListener("pointerup", stopRepeat);
  document.addEventListener("pointercancel", stopRepeat);
  document.addEventListener("pointerleave", (e) => {
    if (e.target.closest && e.target.closest(".coinBtn")) stopRepeat();
  });
})();

// ---- 17) Modal (GM + player) ----
// The shared modal displays a single handout in detail.
// GM gets edit fields, reveal toggles, delete button, and claim management.
// Players get a read-only view plus a "Claim" button for loot-type handouts.
//
// BEGINNER NOTE � modalDraft pattern:
// When the GM opens a handout, we copy the current data into `modalDraft`.
// Edits modify the draft in memory. Only when the GM clicks "Save" do we
// write back to Firestore. This prevents accidental half-edits from being
// broadcast to players in realtime. The "Unsaved changes" indicator compares
// draft values against the originals to know if anything changed.
let modalCtx = { role: null, handoutId: null };
// `modalCtx` tracks which handout is currently being edited/viewed in the modal.
let modalDraft = null;

function isModalDraftDirty() {
  if (!modalDraft) return false;
  syncModalTextIntoDraft();
  return modalDraft.title !== modalDraft.original.title
    || modalDraft.publicContent !== modalDraft.original.publicContent
    || modalDraft.secretContent !== modalDraft.original.secretContent
    || !!modalDraft.revealed !== !!modalDraft.original.revealed
    || !!modalDraft.secretRevealed !== !!modalDraft.original.secretRevealed
    || !!modalDraft.claimable !== !!modalDraft.original.claimable
    || modalDraft.iconKey !== modalDraft.original.iconKey
    || String(modalDraft.imageUrl || "") !== String(modalDraft.original.imageUrl || "");
}

function refreshModalSaveState() {
  if (!modalSaveState || !btnSaveHandout || !modalDraft) return;
  const dirty = isModalDraftDirty();

  modalSaveState.textContent = dirty ? "Unsaved changes" : "All changes saved";
  modalSaveState.classList.toggle("is-dirty", dirty);
  btnSaveHandout.disabled = !dirty;
  btnSaveHandout.classList.toggle("btn--active", dirty);
}

function syncRevealButtons() {
  if (!modalDraft) return;

  if (btnToggleReveal) {
    btnToggleReveal.classList.toggle("revealStarBtn--active", !!modalDraft.revealed);
    btnToggleReveal.setAttribute("aria-pressed", modalDraft.revealed ? "true" : "false");
    const label = btnToggleReveal.querySelector(".revealStarBtn__text");
    if (label) label.textContent = modalDraft.revealed ? "Handout Revealed" : "Reveal Handout";
  }

  if (btnToggleRevealSecret) {
    btnToggleRevealSecret.classList.toggle("revealStarBtn--active", !!modalDraft.secretRevealed);
    btnToggleRevealSecret.setAttribute("aria-pressed", modalDraft.secretRevealed ? "true" : "false");
    const label = btnToggleRevealSecret.querySelector(".revealStarBtn__text");
    if (label) label.textContent = modalDraft.secretRevealed ? "Secret Revealed" : "Reveal Secret";
  }
}

function syncClaimableButton() {
  if (!modalDraft || !btnToggleClaimable) return;
  const enabled = !!modalDraft.claimable;
  btnToggleClaimable.classList.toggle("btn--active", enabled);
  btnToggleClaimable.setAttribute("aria-pressed", enabled ? "true" : "false");
  btnToggleClaimable.textContent = enabled ? "Claimable On" : "Claimable Off";
}

function setModalEditing(isEditing) {
  if (!modalDraft) return;
  modalDraft.isEditing = !!isEditing;

  modalTitle.contentEditable = modalDraft.isEditing ? "true" : "false";
  modalPublic.contentEditable = modalDraft.isEditing ? "true" : "false";
  modalSecret.contentEditable = modalDraft.isEditing ? "true" : "false";

  modalTitle.classList.toggle("modalTextEditable", modalDraft.isEditing);
  modalPublic.classList.toggle("modalTextEditable", modalDraft.isEditing);
  modalSecret.classList.toggle("modalTextEditable", modalDraft.isEditing);

  if (btnEditHandout) {
    btnEditHandout.textContent = modalDraft.isEditing ? "Done" : "Edit";
    btnEditHandout.classList.toggle("btn--active", modalDraft.isEditing);
  }

  refreshModalSaveState();
}


// BEGINNER NOTE: Manual Data Binding
// In modern frameworks like React/Vue, typing in an input automatically updates your JS variables.
// In Vanilla JS, we must construct "Two-Way Binding" manually. 
// When the user edits text, the DOM changes. We must call this sync function to scrape the 
// DOM's inner text back into our JavaScript 'modalDraft' object before saving to the database.
function syncModalTextIntoDraft() {
  if (!modalDraft) return;
  modalDraft.title = String(modalTitle.textContent || "").trim();
  modalDraft.publicContent = String(modalPublic.textContent || "").trim();
  modalDraft.secretContent = String(modalSecret.textContent || "").trim();
}

function closeModalDiscardChanges() {
  animateModalOut(modal);
  modalTitle.contentEditable = "false";
  modalPublic.contentEditable = "false";
  modalSecret.contentEditable = "false";
  modalTitle.classList.remove("modalTextEditable");
  modalPublic.classList.remove("modalTextEditable");
  modalSecret.classList.remove("modalTextEditable");
  if (modalSaveState) {
    modalSaveState.textContent = "All changes saved";
    modalSaveState.classList.remove("is-dirty");
  }
  if (btnSaveHandout) {
    btnSaveHandout.disabled = false;
    btnSaveHandout.classList.remove("btn--active");
  }
  if (modalMapUploadStatus) modalMapUploadStatus.textContent = "";
  if (modalMapImageUpload) modalMapImageUpload.value = "";
  modalCtx = { role: null, handoutId: null };
  modalDraft = null;
}


function renderModalContent(h, role) {
  modalCtx = { role, handoutId: h.id };
  if (modalCard) modalCard.scrollTop = 0;

  modalTag.textContent = (h.type ?? "handout").toUpperCase();
  modalTitle.textContent = h.title ?? "";
  modalTitle.classList.toggle("modalTitleEditablePrompt", role === "dm");
  const _curIcon = String(h.iconKey || h.iconEmoji || "").trim();
  const _isEmojiIcon = _curIcon && /\p{Extended_Pictographic}/u.test(_curIcon);
  if (modalIconPreview) modalIconPreview.textContent = _isEmojiIcon ? _curIcon : "🎭";
  if (modalIconInput) modalIconInput.value = _isEmojiIcon ? _curIcon : "";
  resolveModalImage(h);
  modalPublic.textContent = h.publicContent ?? "";

  const showSecret = role === "dm" || h.secretRevealed === true;
  const hasSecret = (h.secretContent ?? "").trim().length > 0;
  modalSecretWrap.classList.toggle("hidden", role === "dm" ? false : !showSecret || !hasSecret);
  modalSecret.textContent = h.secretContent ?? "";

  // Claim panel is shared, but only meaningful for loot.
  // We show status to everyone; action availability depends on role/state.
  modalClaimWrap.classList.toggle("hidden", String(h.type || "").toLowerCase() !== "loot");

  modalDMControls.classList.toggle("hidden", role !== "dm");
  modalMapUploadWrap?.classList.toggle("hidden", role !== "dm" || !isMapHandoutType(h.type));
  if (modalMapUploadStatus) modalMapUploadStatus.textContent = "";
  if (modalMapImageUpload) modalMapImageUpload.value = "";
  modalDMClaimControls.classList.toggle("hidden", role !== "dm" || String(h.type || "").toLowerCase() !== "loot");
  modalImageWrap?.classList.toggle("is-editable", role === "dm" && !isMapHandoutType(h.type));
  const isNpcType = String(h.type || "").toLowerCase() === "npc";
  if (btnAddHandoutToInitiativeModal) {
    btnAddHandoutToInitiativeModal.classList.toggle("hidden", role !== "dm" || !isNpcType);
    if (role === "dm" && isNpcType) {
      const linkedId = String(h.id || "").trim();
      const alreadyInInitiative = (state.partyRoster || []).some((entry) =>
        entry?.isNpc === true &&
        (linkedId && String(entry?.npcHandoutId || "").trim() === linkedId ||
         normalizeNpcSyncKey(entry?.nickname) === normalizeNpcSyncKey(h.title))
      );
      btnAddHandoutToInitiativeModal.textContent = alreadyInInitiative ? "Remove from Initiative" : "Add for Initiative";
      btnAddHandoutToInitiativeModal.dataset.inInitiative = alreadyInInitiative ? "1" : "";
    }
  }

  setupClaimUI(h, role);
}

function resolveModalImage(h) {
  if (!modalImage) return;
  const hardFallbackUrl = "placeholders/Prompt1image1_1.png";
  const isMap = isMapHandoutType(h?.type);
  const storedImageUrl = String(getVisibleHandoutImageUrl(h, modalCtx.role || state.role, state.uid) || "").trim();
  const semanticFallbackUrl = selectBestPlaceholderImage({
    title: String(h.title || ""),
    publicContent: String(h.publicContent || ""),
    type: String(h.type || "").toLowerCase(),
    npcDisposition: String(h.npcDisposition || "").toLowerCase(),
  })?.url || "";
  const chronologicalPool = getChronologicalPlaceholderImages();
  const seededFallbackUrl = chronologicalPool.length
    ? chronologicalPool[stableHash(`${String(h.id || "")}|${String(h.title || "")}`) % chronologicalPool.length].url
    : "";

  const fallbackImageUrl = isMap ? "" : String(semanticFallbackUrl || seededFallbackUrl || hardFallbackUrl).trim();
  const resolvedImageUrl = String(storedImageUrl || fallbackImageUrl).trim();
  const frame = h?.imageFrame || null;
  const showImage = !!resolvedImageUrl;
  modalImageWrap?.classList.toggle("hidden", !showImage);
  if (showImage) {
    modalImage.onerror = () => {
      if (modalImage.src.includes(hardFallbackUrl)) return;
      modalImage.src = hardFallbackUrl;
      modalImageWrap?.classList.remove("hidden");
    };
    modalImage.src = resolvedImageUrl;
    const frameScale = Number(frame?.scale);
    const frameOffsetX = Number(frame?.offsetX);
    const frameOffsetY = Number(frame?.offsetY);
    if (Number.isFinite(frameScale) || Number.isFinite(frameOffsetX) || Number.isFinite(frameOffsetY)) {
      const scale = Number.isFinite(frameScale) ? clampValue(frameScale, 1, 2.8) : 1;
      const offsetX = Number.isFinite(frameOffsetX) ? frameOffsetX : 0;
      const offsetY = Number.isFinite(frameOffsetY) ? frameOffsetY : 0;
      modalImage.style.transform = `translate(${offsetX.toFixed(1)}px, ${offsetY.toFixed(1)}px) scale(${scale.toFixed(3)})`;
      modalImage.style.transformOrigin = "center";
    } else {
      modalImage.style.removeProperty("transform");
      modalImage.style.removeProperty("transform-origin");
    }
    modalImageWrap?.classList.remove("hidden");
  } else {
    modalImage.removeAttribute("src");
  }
}

function initModalState(h, role) {
  if (role === "dm") {
    modalDraft = {
      revealed: !!h.revealed,
      secretRevealed: !!h.secretRevealed,
      claimable: !!h.claimable,
      title: String(h.title || "").trim(),
      publicContent: String(h.publicContent || "").trim(),
      secretContent: String(h.secretContent || "").trim(),
      iconKey: String(h.iconKey || h.iconEmoji || "").trim(),
      imageUrl: String(h.imageUrl || "").trim(),
      type: String(h.type || "").toLowerCase(),
      isEditing: false,
      original: {
        revealed: !!h.revealed,
        secretRevealed: !!h.secretRevealed,
        claimable: !!h.claimable,
        title: String(h.title || "").trim(),
        publicContent: String(h.publicContent || "").trim(),
        secretContent: String(h.secretContent || "").trim(),
        iconKey: String(h.iconKey || h.iconEmoji || "").trim(),
        imageUrl: String(h.imageUrl || "").trim(),
      },
    };

    syncRevealButtons();
    syncClaimableButton();
    setModalEditing(false);
    refreshModalSaveState();
  }
}


// ============================================================================
// GLOBAL EVENT LISTENERS (Initialized Once)
// ============================================================================
// ---- Lightbox logic ----
const lightboxModal = $("imageLightboxModal");
const lightboxImage = $("lightboxImage");
const btnCloseLightbox = $("btnCloseLightbox");
let lightboxScale = 1;

function openLightbox(src) {
  if (!src) return;
  lightboxImage.src = src;
  lightboxScale = 1;
  lightboxImage.style.transform = `scale(${lightboxScale})`;
  lightboxModal.classList.remove("hidden");
  lightboxModal.setAttribute("aria-hidden", "false");
}

function closeLightbox() {
  lightboxModal.classList.add("hidden");
  lightboxModal.setAttribute("aria-hidden", "true");
  lightboxImage.src = "";
}

lightboxImage?.addEventListener("click", () => {
  lightboxScale = lightboxScale === 1 ? 2 : 1;
  lightboxImage.style.transform = `scale(${lightboxScale})`;
  lightboxImage.style.cursor = lightboxScale === 1 ? "zoom-in" : "zoom-out";
});
btnCloseLightbox?.addEventListener("click", closeLightbox);
lightboxModal?.addEventListener("click", (e) => {
  if (e.target === lightboxModal || e.target.classList.contains("lightboxModal__zoomWrap")) closeLightbox();
});
if (modalImageWrap) {
  modalImageWrap.addEventListener("click", () => {
    if (modalCtx.role === "dm" && modalDraft && modalDraft.type !== "map") {
      const confirmed = confirmNuggetCost("Changing this handout portrait");
      if (!confirmed) {
        editHandoutImageUploadConfirmed = false;
        if (modalSaveState) modalSaveState.textContent = "Handout portrait update canceled.";
        return;
      }
      editHandoutImageUploadConfirmed = true;
      modalHandoutImageUpload?.click();
      return;
    }
    if (modalImage?.src) openLightbox(modalImage.src);
  });
}

modalHandoutImageUpload?.addEventListener("change", async () => {
  const file = modalHandoutImageUpload.files?.[0];
  if (!file || modalCtx.role !== "dm" || !modalCtx.handoutId || !modalDraft || modalDraft.type === "map") {
    editHandoutImageUploadConfirmed = false;
    return;
  }
  if (!editHandoutImageUploadConfirmed) {
    const confirmed = confirmNuggetCost("Changing this handout portrait");
    if (!confirmed) {
      if (modalSaveState) modalSaveState.textContent = "Handout portrait update canceled.";
      modalHandoutImageUpload.value = "";
      return;
    }
    editHandoutImageUploadConfirmed = true;
  }
  if (modalSaveState) modalSaveState.textContent = "Uploading image...";

  const uploaded = await uploadHandoutImageToStorage(file, { handoutId: modalCtx.handoutId });
  if (!uploaded.ok || !uploaded.url) {
    if (modalSaveState) modalSaveState.textContent = uploaded.message || "Upload failed.";
    editHandoutImageUploadConfirmed = false;
    modalHandoutImageUpload.value = "";
    return;
  }

  modalDraft.imageUrl = uploaded.url;
  const current = (state.dmHandoutsRaw || []).find((entry) => entry?.id === modalCtx.handoutId) || {};
  resolveModalImage({ ...current, imageUrl: uploaded.url, type: modalDraft.type });
  refreshModalSaveState();
  showToast("Image updated. Save to apply changes.", "info");
  editHandoutImageUploadConfirmed = false;
  modalHandoutImageUpload.value = "";
});

modalTitle?.addEventListener("click", () => {
  if (modalCtx.role !== "dm" || !modalDraft || modalDraft.isEditing) return;
  setModalEditing(true);
  modalTitle.focus();
});

modalPublic?.addEventListener("click", () => {
  if (modalCtx.role !== "dm" || !modalDraft || modalDraft.isEditing) return;
  setModalEditing(true);
  modalPublic.focus();
});

modalSecret?.addEventListener("click", () => {
  if (modalCtx.role !== "dm" || !modalDraft || modalDraft.isEditing) return;
  setModalEditing(true);
  modalSecret.focus();
});

modalIconInput?.addEventListener("input", () => {
  if (!modalDraft) return;
  const val = String(modalIconInput.value || "").trim();
  const segments = val ? [...new Intl.Segmenter().segment(val)] : [];
  const firstEmoji = segments.length ? segments[0].segment : "";
  const resolved = firstEmoji && /\p{Extended_Pictographic}/u.test(firstEmoji) ? firstEmoji : "";
  if (modalIconPreview) modalIconPreview.textContent = resolved || "🎭";
  modalDraft.iconKey = resolved || modalDraft.original.iconKey || "";
  refreshModalSaveState();
});

modalIconPreview?.addEventListener("click", () => modalIconInput?.focus());

modalTitle?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  syncModalTextIntoDraft();
  refreshModalSaveState();
});

btnModalMapUpload?.addEventListener("click", () => {
  if (modalCtx.role !== "dm" || !modalCtx.handoutId || !modalDraft || modalDraft.type !== "map") return;
  modalMapImageUpload?.click();
});

modalMapImageUpload?.addEventListener("change", async () => {
  const file = modalMapImageUpload.files?.[0];
  if (!file || modalCtx.role !== "dm" || !modalCtx.handoutId || !modalDraft || modalDraft.type !== "map") return;
  if (modalMapUploadStatus) modalMapUploadStatus.textContent = "Uploading map...";

  const uploaded = await uploadMapImageToStorage(file, { handoutId: modalCtx.handoutId });
  if (!uploaded.ok || !uploaded.url) {
    if (modalMapUploadStatus) modalMapUploadStatus.textContent = uploaded.message || "Upload failed.";
    modalMapImageUpload.value = "";
    return;
  }

  try {
    const handoutRef = doc(db, "sessions", state.sessionId, "handouts", modalCtx.handoutId);
    const current = (state.dmHandoutsRaw || []).find((entry) => entry?.id === modalCtx.handoutId) || {};
    const visibleUid = String(current?.claimedByUid || "").trim() || null;
    await updateDoc(handoutRef, {
      mapImageUrl: uploaded.url,
      mapVisibleToUid: visibleUid,
      imageUrl: null,
      updatedAt: serverTimestamp(),
    });
    if (modalMapUploadStatus) modalMapUploadStatus.textContent = "Map replaced (1 nugget spent).";
    resolveModalImage({ ...current, type: "map", mapImageUrl: uploaded.url, imageUrl: null, mapVisibleToUid: visibleUid });
    openLightbox(uploaded.url);
  } catch (err) {
    console.error("Modal map update failed:", err);
    if (modalMapUploadStatus) modalMapUploadStatus.textContent = "Upload succeeded but update failed.";
  } finally {
    modalMapImageUpload.value = "";
  }
});

if (modalClose) {
  modalClose.onclick = () => closeModalDiscardChanges();
}
if (modal) {
  modal.onclick = (e) => {
    if (e.target === modal) closeModalDiscardChanges();
  };
}

if (btnToggleReveal) {
  btnToggleReveal.onclick = () => {
    if (!modalDraft) return;
    modalDraft.revealed = !modalDraft.revealed;
    syncRevealButtons();
    refreshModalSaveState();
  };
}

if (btnToggleRevealSecret) {
  btnToggleRevealSecret.onclick = () => {
    if (!modalDraft) return;
    modalDraft.secretRevealed = !modalDraft.secretRevealed;
    syncRevealButtons();
    refreshModalSaveState();
  };
}

if (btnEditHandout) {
  btnEditHandout.onclick = () => {
    if (!modalDraft) return;
    if (modalDraft.isEditing) syncModalTextIntoDraft();
    setModalEditing(!modalDraft.isEditing);
    refreshModalSaveState();
  };
}

if (btnSaveHandout) {
  btnSaveHandout.onclick = () => saveCurrentHandout();
}

if (btnDeleteHandout) {
  btnDeleteHandout.onclick = () => deleteCurrentHandout();
}

if (btnAddHandoutToInitiativeModal) {
  btnAddHandoutToInitiativeModal.onclick = async () => {
    if (state.role !== "dm") return;
    if (!modalDraft || String(modalDraft.type || "").toLowerCase() !== "npc") return;
    const npcName = String(modalDraft.title || modalTitle?.textContent || "").trim();
    if (!npcName) {
      showToast("NPC name is required before adding to initiative.", "error");
      return;
    }
    const linkedById = (state.dmHandoutsRaw || []).find((entry) => entry?.id === modalCtx.handoutId) || null;
    const linkedId = String(modalCtx.handoutId || "").trim();
    if (btnAddHandoutToInitiativeModal.dataset.inInitiative === "1") {
      // Remove the NPC from initiative
      const entry = (state.partyRoster || []).find((e) =>
        e?.isNpc === true &&
        (linkedId && String(e?.npcHandoutId || "").trim() === linkedId ||
         normalizeNpcSyncKey(e?.nickname) === normalizeNpcSyncKey(npcName))
      );
      if (entry?.id) {
        try {
          await deleteDoc(doc(db, "sessions", state.sessionId, "players", entry.id));
          showToast(`${npcName} removed from initiative.`, "info");
          btnAddHandoutToInitiativeModal.textContent = "Add for Initiative";
          btnAddHandoutToInitiativeModal.dataset.inInitiative = "";
        } catch (err) {
          console.error("Remove from initiative failed:", err);
          showToast("Could not remove from initiative.", "error");
        }
      }
    } else {
      await addNpcToInitiativeFromHandoutName(npcName, linkedById);
      btnAddHandoutToInitiativeModal.textContent = "Remove from Initiative";
      btnAddHandoutToInitiativeModal.dataset.inInitiative = "1";
    }
  };
}

if (btnToggleClaimable) {
  btnToggleClaimable.onclick = () => {
    if (!modalDraft) return;
    modalDraft.claimable = !modalDraft.claimable;
    syncClaimableButton();
    refreshModalSaveState();
  };
}

if (btnResetClaim) {
  btnResetClaim.onclick = () => resetClaim();
}

function openModal(h, role) {
  // BEGINNER NOTE:
  // Instead of one massive function, we split into "Render DOM" and "Init State".
  renderModalContent(h, role);
  initModalState(h, role);
  animateModalIn(modal);
  if (isMapHandoutType(h?.type)) {
    const mapUrl = String(getVisibleHandoutImageUrl(h, role, state.uid) || "").trim();
    if (mapUrl) {
      setTimeout(() => openLightbox(mapUrl), 120);
    }
  }
}

async function saveCurrentHandout() {
  if (modalCtx.role !== "dm" || !modalCtx.handoutId || !modalDraft) return;
  if (btnSaveHandout) btnSaveHandout.disabled = true;
  let spentForEdit = false;
  try {
    syncModalTextIntoDraft();
    const validationError = validateHandoutCoreFields({
      title: modalDraft.title,
      publicContent: modalDraft.publicContent,
      type: modalDraft.type,
    });
    if (validationError) {
      showToast(validationError, "error");
      return;
    }

    if (!isModalDraftDirty()) {
      closeModalDiscardChanges();
      return;
    }

    const spent = await spendNuggetWithFeedback("handout edit");
    if (!spent) return;
    spentForEdit = true;

    const ref = doc(db, "sessions", state.sessionId, "handouts", modalCtx.handoutId);
    const payload = {
      title: modalDraft.title,
      publicContent: modalDraft.publicContent,
      secretContent: modalDraft.secretContent,
      revealed: !!modalDraft.revealed,
      secretRevealed: !!modalDraft.secretRevealed,
      updatedAt: serverTimestamp(),
    };
    if (modalDraft.iconKey && modalDraft.iconKey !== modalDraft.original.iconKey) {
      payload.iconKey = modalDraft.iconKey;
      payload.iconEmoji = modalDraft.iconKey;
    }

    if (String(modalDraft.imageUrl || "") !== String(modalDraft.original.imageUrl || "")) {
      payload.imageUrl = modalDraft.imageUrl || null;
      payload.imageFrame = null;
    }

    if (modalDraft.type === "loot") {
      payload.claimable = !!modalDraft.claimable;
    }

    await updateDoc(ref, payload);
    showToast("Handout saved.", "success");
    closeModalDiscardChanges();
  } catch (e) {
    console.error(e);
    if (spentForEdit && state.sessionId && state.uid) {
      const walletId = state.role === "dm" ? "dm" : state.uid;
      const walletRef = doc(db, "sessions", state.sessionId, "wallets", walletId);
      try { await updateDoc(walletRef, { nuggets: increment(1) }); } catch (_) {}
    }
    showToast("Saving handout failed. Check Console (F12).", "error");
  } finally {
    if (btnSaveHandout) btnSaveHandout.disabled = false;
  }
}

async function deleteCurrentHandout() {
  const handoutId = modalCtx.handoutId;
  if (!handoutId) return;
  closeModalDiscardChanges();
  showUndoToast("Handout deleted.", async () => {
    try {
      const ref = doc(db, "sessions", state.sessionId, "handouts", handoutId);
      await deleteDoc(ref);
    } catch (e) {
      console.error(e);
      showToast("Delete handout failed.", "error");
    }
  });
}

function setupClaimUI(handout, role) {
  // -------------------------------------------------------------------------
  // CLAIM UI EXPLANATION (important for fairness + UX)
  // -------------------------------------------------------------------------
  // "Fairness" is enforced at write-time with Firestore transactions.
  // This setup function only decides what the user can SEE/CLICK right now.
  // -------------------------------------------------------------------------
  const isLoot = String(handout.type || "").toLowerCase() === "loot";
  if (!isLoot || !modalClaimWrap || !btnClaim || !claimStatus) return;

  const claimable = !!handout.claimable;
  const claimedByNick = String(handout.claimedByNick || "").trim();
  const claimedByUid = String(handout.claimedByUid || "").trim();
  const isClaimed = Boolean(claimedByUid);
  const isMine = isClaimed && claimedByUid === state.uid;

  // Populate GM assignment dropdown with current active players.
  populateAssignablePlayers(claimedByUid);

  if (btnAssignClaim) {
    btnAssignClaim.disabled = role !== "dm" || state.activePlayers.length === 0;
    btnAssignClaim.onclick = () => assignClaimToSelectedPlayer();
  }

  btnClaim.classList.add("hidden");
  btnClaim.disabled = false;
  btnClaim.textContent = "Claim loot";
  if (btnPlayerClaim) btnPlayerClaim.classList.add("hidden");

  if (!claimable) {
    claimStatus.textContent = role === "dm"
      ? "Claiming is disabled for this loot."
      : "This loot cannot be claimed right now.";
    return;
  }

  if (isClaimed) {
    claimStatus.textContent = isMine
      ? "You already claimed this loot."
      : `Claimed by ${claimedByNick || "another player"}.`;
    return;
  }

  claimStatus.textContent = role === "dm"
    ? "Unclaimed. Players can claim this loot."
    : "Unclaimed. First successful claim gets the loot.";

  if (role === "player") {
    btnClaim.classList.remove("hidden");
    if (btnPlayerClaim) btnPlayerClaim.classList.remove("hidden");

    // Offline rule for fairness:
    // We intentionally disable claiming while offline.
    // Reason: offline queued writes cannot guarantee true first-come-first-serve.
    if (!navigator.onLine) {
      btnClaim.disabled = true;
      if (btnPlayerClaim) btnPlayerClaim.disabled = true;
      claimStatus.textContent = "Reconnect to claim fairly (claiming is disabled while offline).";
      return;
    }

    btnClaim.onclick = () => claimCurrentHandout();
    if (btnPlayerClaim) btnPlayerClaim.onclick = () => claimCurrentHandout();
  }
}

async function resetClaim() {
  // GM moderation action: clear existing claim lock and reopen claim race.
  if (!modalCtx.handoutId || !state.sessionId) return;
  if (!confirm("Reset current claim?")) return;
  try {
    const ref = doc(db, "sessions", state.sessionId, "handouts", modalCtx.handoutId);
    await updateDoc(ref, {
      claimedByUid: null,
      claimedByNick: null,
      mapVisibleToUid: null,
      claimedAt: null,
      updatedAt: serverTimestamp(),
    });
    // Refresh modal claim UI immediately so GM sees the change
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const updated = { id: snap.id, ...snap.data() };
      setupClaimUI(updated, "dm");
    }
    showToast("Claim reset.", "success");
  } catch (e) {
    console.error(e);
    showToast("Reset claim failed.", "error");
  }
}

function populateAssignablePlayers(selectedUid = "") {
  // Fill select box for GM assignment action.
  if (!dmAssignPlayer) return;
  dmAssignPlayer.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = state.activePlayers.length > 0 ? "Select player..." : "No players available";
  dmAssignPlayer.appendChild(defaultOption);

  state.activePlayers.forEach((player) => {
    const option = document.createElement("option");
    option.value = player.id;
    option.textContent = player.nickname || "Adventurer";
    dmAssignPlayer.appendChild(option);
  });

  if (selectedUid && state.activePlayers.some((p) => p.id === selectedUid)) {
    dmAssignPlayer.value = selectedUid;
  }
}

async function assignClaimToSelectedPlayer() {
  // -------------------------------------------------------------------------
  // GM MANUAL ASSIGNMENT (supports online and offline play)
  // -------------------------------------------------------------------------
  // Why this method uses updateDoc instead of transaction:
  // - Transactions are best for online race arbitration.
  // - GM assignment must also work offline.
  // - updateDoc writes locally and syncs to cloud once online.
  // -------------------------------------------------------------------------
  if (!dmAssignPlayer) return;

  const targetUid = dmAssignPlayer.value;
  if (!targetUid) {
    showToast("Select a player first.", "error");
    return;
  }

  const targetPlayer = state.activePlayers.find((p) => p.id === targetUid);
  if (!targetPlayer) {
    showToast("Selected player is not available.", "error");
    return;
  }

  try {
    const handoutCurrent = (state.dmHandoutsRaw || []).find((entry) => entry?.id === modalCtx.handoutId) || null;
    const isMap = isMapHandoutType(handoutCurrent?.type);
    const handoutRef = doc(db, "sessions", state.sessionId, "handouts", modalCtx.handoutId);
    await updateDoc(handoutRef, {
      claimable: true,
      revealed: true,
      claimedByUid: targetUid,
      claimedByNick: targetPlayer.nickname || "Adventurer",
      mapVisibleToUid: isMap ? targetUid : null,
      claimedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const assignedName = targetPlayer.nickname || "Adventurer";
    claimStatus.textContent = navigator.onLine
      ? `Assigned to ${assignedName}.`
      : `Assigned locally to ${assignedName}. Will sync when online.`;
    btnClaim?.classList.add("hidden");
    showToast(`Assigned and revealed to ${assignedName}!`, "success");
  } catch (e) {
    console.error("Assign claim failed:", e);
    showToast("Could not assign this handout right now.", "error");
  }
}

async function claimCurrentHandout() {
  // -------------------------------------------------------------------------
  // FAIR CLAIM TRANSACTION (server-authoritative first-wins)
  // -------------------------------------------------------------------------
  // Why transaction?
  // - Multiple players can click at nearly the same time.
  // - Transaction re-reads latest server state and retries safely.
  // - Exactly one successful commit gets to set claimedByUid first.
  // -------------------------------------------------------------------------
  // Preconditions:
  // - user identity must exist
  // - session + handout context must exist
  // - browser must be online for fairness guarantee
  if (!state.uid || !state.sessionId || !modalCtx.handoutId) {
    showToast("Missing claim context. Re-open the handout and try again.", "error");
    return;
  }

  if (!navigator.onLine) {
    showToast("You are offline. Reconnect to claim fairly.", "error");
    return;
  }

  const handoutRef = doc(db, "sessions", state.sessionId, "handouts", modalCtx.handoutId);
  const nickname = getPlayerNickname();

  try {
    const result = await runTransaction(db, async (tx) => {
      const snap = await tx.get(handoutRef);
      if (!snap.exists()) return { ok: false, reason: "missing" };

      const data = snap.data();
      const isLoot = String(data.type || "").toLowerCase() === "loot";
      if (!isLoot) return { ok: false, reason: "not-loot" };
      if (!data.claimable) return { ok: false, reason: "not-claimable" };

      const claimedByUid = String(data.claimedByUid || "").trim();
      if (claimedByUid) {
        if (claimedByUid === state.uid) return { ok: false, reason: "already-mine" };
        return { ok: false, reason: "taken", by: data.claimedByNick || "another player" };
      }

      tx.update(handoutRef, {
        claimedByUid: state.uid,
        claimedByNick: nickname,
        mapVisibleToUid: String(data.type || "").toLowerCase() === "map" ? state.uid : null,
        claimedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return { ok: true };
    });

    if (result?.ok) {
      claimStatus.textContent = "Claim successful. This loot is now yours.";
      btnClaim?.classList.add("hidden");
      btnPlayerClaim?.classList.add("hidden");
      return;
    }

    if (result?.reason === "taken") {
      claimStatus.textContent = `Too late � claimed by ${result.by}.`;
      btnClaim?.classList.add("hidden");
      btnPlayerClaim?.classList.add("hidden");
      return;
    }
    if (result?.reason === "already-mine") {
      claimStatus.textContent = "You already claimed this loot.";
      btnClaim?.classList.add("hidden");
      btnPlayerClaim?.classList.add("hidden");
      return;
    }
    if (result?.reason === "not-claimable") {
      claimStatus.textContent = "Claiming is disabled for this loot.";
      btnClaim?.classList.add("hidden");
      return;
    }

    claimStatus.textContent = "Could not claim loot. Please try again.";
  } catch (e) {
    console.error("Claim transaction failed:", e);
    claimStatus.textContent = "Claim failed due to connection/state conflict. Try again.";
  }
}

// ---- 18) Leave / end session ----
// BEGINNER NOTE � Cleanup pattern:
// Leaving a session is the reverse of joining: stop background timers,
// unsubscribe Firestore listeners, wipe in-memory state, update
// localStorage, and navigate to the landing screen.
// If you forget any step, you get ghosts: stale data, phantom timers,
// or listeners burning bandwidth for a session you're no longer in.
function leavePlayerSession() {
  rememberCurrentPlayerSessionForList();
  // Player local logout: stop timers/listeners and return to landing UI.
  stopHeartbeat();
  cleanupListeners();
  state.role = null;
  state.sessionId = null;
  state.joinTag = null;
  state.joinLink = null;
  state.inventoryItems = [];
  state.wallets = {};
  persistLocal();
  showOnly(SCREEN_KEYS.LANDING);
  loadMySessions();
}

btnLeave && (btnLeave.onclick = () => {
  leavePlayerSession();
});

// btnLeaveInventory removed � inventory back button now navigates to dashboard.

btnEndSession && (btnEndSession.onclick = () => {
  // GM local logout: clear local role/session context.
  stopHeartbeat();
  cleanupListeners();
  state.role = null;
  state.sessionId = null;
  state.joinTag = null;
  state.joinLink = null;
  state.dmPinPlain = null;
  state.inventoryItems = [];
  state.wallets = {};
  persistLocal();
  showOnly(SCREEN_KEYS.LANDING);
  loadMySessions();
});

// ---- 19) Ambience playback (player-side) ----
// BEGINNER NOTE � Browser autoplay policy:
// Modern browsers block audio from playing automatically until the user
// has interacted with the page (click, tap, keypress). This is why we
// have a dedicated "Enable Sound" button � clicking it counts as a user
// gesture and unlocks the Audio API. We persist the preference in
// localStorage so the button state survives page reloads.
//
// Single shared audio element used by both GM and players.
const ambienceAudio = new Audio();
ambienceAudio.loop = true;
ambienceAudio.preload = "auto";
ambienceAudio.playsInline = true;
try {
  ambienceAudio.setAttribute("playsinline", "");
  ambienceAudio.setAttribute("webkit-playsinline", "");
} catch {}
ambienceAudio.addEventListener("error", () => {
  const src = ambienceAudio.currentSrc || ambienceAudio.src || "(unknown)";
  console.error("Ambience audio failed to load:", src, ambienceAudio.error);
  try {
    showToast("Audio file failed to load. Check connection or file path.", "error", 2600);
  } catch {}
});

// --- Audio playback strategy ---
// Browsers may reject HTMLMediaElement.play() with NotAllowedError when no
// local user gesture has happened yet. We handle that by setting a pending
// resume flag and retrying on the next gesture (or explicit Enable Audio tap).

function ensureAmbienceAudioMounted() {
  if (ambienceAudio.isConnected) return;
  try {
    ambienceAudio.style.display = "none";
    ambienceAudio.setAttribute("aria-hidden", "true");
    if (document.body) document.body.appendChild(ambienceAudio);
  } catch {}
}

ensureAmbienceAudioMounted();
async function attemptAmbiencePlay(targetVolume = ambienceAudio.volume || 0.6) {
  ensureAmbienceAudioMounted();
  if (!ambienceAudio.src) return false;

  const vol = Math.min(1, Math.max(0, Number(targetVolume ?? 0.6)));

  try {
    // Primary path: normal unmuted playback at target volume.
    ambienceAudio.muted = false;
    ambienceAudio.volume = vol;
    await ambienceAudio.play();
    return true;
  } catch (firstErr) {
    try {
      // Fallback used by some mobile browsers: prime play muted, then unmute.
      // Fallback reminder: backup strategy that runs only if primary path fails.
      // Tip: always await play(); rejected promises are the only reliable
      // signal that autoplay policy blocked audio.
      ambienceAudio.muted = true;
      ambienceAudio.volume = 0;
      await ambienceAudio.play();
      ambienceAudio.muted = false;
      ambienceAudio.volume = vol;
      // Verify audio is still actually playing after unmute.
      // Some browsers silently pause the element when unmuted without a gesture.
      await new Promise((r) => setTimeout(r, 50));
      if (ambienceAudio.paused) return false;
      return true;
    } catch (secondErr) {
      console.warn("Ambience play blocked:", secondErr || firstErr);
      return false;
    }
  }
}
// Browser autoplay restrictions require explicit user action for sound.
// soundEnabled is declared earlier near the state block, persisted in localStorage.

// Settings sound toggle (replaces old inline btnEnableSound)
const btnToggleSound = $("btnToggleSound");

function syncSoundToggleUI() {
  if (btnToggleSound) {
    btnToggleSound.textContent = soundEnabled ? "Sound Enabled" : "Enable Sound";
    btnToggleSound.classList.toggle("btn--active", soundEnabled);
  }
  // Sync mute toggle icon in ambience bar
  const muteIconOn = document.getElementById("muteIconOn");
  const muteIconOff = document.getElementById("muteIconOff");
  if (muteIconOn) muteIconOn.classList.toggle("hidden", !soundEnabled);
  if (muteIconOff) muteIconOff.classList.toggle("hidden", soundEnabled);
}

if (btnToggleSound) {
  syncSoundToggleUI();
  btnToggleSound.addEventListener("click", async () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem("tv_soundEnabled", soundEnabled ? "1" : "0");
    if (soundEnabled) {
      if (ambienceAudio.src) {
        const ok = await attemptAmbiencePlay();
        if (!ok) requestAmbienceResume();
      }
      showToast("Sound enabled", "success", 1500);
    } else {
      ambienceAudio.pause();
      showToast("Sound muted", "info", 1500);
    }
    syncSoundToggleUI();
  });
}

// Mute toggle button in ambience bar (uniform with play/pause)
const btnMuteToggle = $("btnMuteToggle");
if (btnMuteToggle) {
  syncSoundToggleUI();
  btnMuteToggle.addEventListener("click", async () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem("tv_soundEnabled", soundEnabled ? "1" : "0");
    if (soundEnabled) {
      if (ambienceAudio.src) {
        const ok = await attemptAmbiencePlay();
        if (!ok) requestAmbienceResume();
      }
      showToast("Sound enabled", "success", 1500);
    } else {
      ambienceAudio.pause();
      showToast("Sound muted", "info", 1500);
    }
    syncSoundToggleUI();
  });
}

// Bottom bar & social toggle handlers
if (btnOpenAmbienceBar) {
  // For GM: opens the full ambience control panel.
  // For players: toggles local audio mute/unmute as a quick listen toggle.
  btnOpenAmbienceBar.addEventListener("click", async (e) => {
    // Player mode: toggle mute/unmute instead of opening GM panel
    if (state.role === "player") {
      // If already enabled but currently paused, try to resume before muting.
      if (!soundEnabled) {
        soundEnabled = true;
      } else if (!ambienceAudio.paused) {
        soundEnabled = false;
      }
      localStorage.setItem("tv_soundEnabled", soundEnabled ? "1" : "0");
      if (soundEnabled) {
        if (ambienceAudio.src) {
          const ok = await attemptAmbiencePlay();
          if (!ok) requestAmbienceResume();
        }
        showToast("Sound enabled", "success", 1500);
      } else {
        ambienceAudio.pause();
        showToast("Sound muted", "info", 1500);
      }
      try { syncSoundToggleUI(); } catch (_) {}
      btnOpenAmbienceBar.classList.toggle("is-active", soundEnabled);
      return;
    }
    // GM mode: open/close ambience control panel on the current session screen.
    // Do not navigate to the handout dashboard; the music panel is an overlay.
    if (!state.sessionId) return;
    if (!ambienceBar) return;
    const isHidden = ambienceBar.classList.contains("hidden");
    if (isHidden) {
      if (currentScreenKey === SCREEN_KEYS.DM_DASH) setDMSocialMode(false);
      ambienceBar.classList.remove("hidden");
      ambienceBar.setAttribute("aria-hidden", "false");
      try { dmAmbience?.focus(); } catch {}
      try { btnOpenAmbienceBar.classList.add("is-active"); } catch (e) {}
    } else {
      ambienceBar.classList.add("hidden");
      ambienceBar.setAttribute("aria-hidden", "true");
      try { btnOpenAmbienceBar.classList.remove("is-active"); } catch (e) {}
    }
  });
}

if (btnCloseAmbienceBar) {
  // Explicit close action for ambience panel.
  btnCloseAmbienceBar.addEventListener("click", (e) => {
    if (!ambienceBar) return;
    ambienceBar.classList.add("hidden");
    ambienceBar.setAttribute("aria-hidden", "true");
  });
}

// ---- Credits modal (music attribution) ----
function openCreditsModal() {
  if (!creditsModal) return;
  animateModalIn(creditsModal);
}

function closeCreditsModal() {
  if (!creditsModal) return;
  animateModalOut(creditsModal);
}

let pendingExternalUrl = "";

function openExternalLinkModal(urlRaw) {
  if (!externalLinkModal) return;
  let parsed;
  try {
    parsed = new URL(String(urlRaw || ""), location.href);
  } catch {
    return;
  }

  pendingExternalUrl = parsed.href;
  if (externalLinkHost) externalLinkHost.textContent = parsed.host;
  animateModalIn(externalLinkModal);
}

function closeExternalLinkModal() {
  if (!externalLinkModal) return;
  animateModalOut(externalLinkModal);
  pendingExternalUrl = "";
}

// Info button in ambience bar
if (btnAmbienceInfo) {
  btnAmbienceInfo.addEventListener("click", (event) => {
    event.preventDefault();
    openCreditsModal();
  });
}

// Credits button in Settings
if (btnShowCredits) {
  btnShowCredits.addEventListener("click", (event) => {
    event.preventDefault();
    openCreditsModal();
  });
}

// Close button inside the modal
if (btnCloseCredits) {
  btnCloseCredits.addEventListener("click", closeCreditsModal);
}

// Clicking the backdrop also closes
creditsModal?.querySelector(".credits-modal__backdrop")?.addEventListener("click", closeCreditsModal);

// Credits links and cards route through the same external-link confirmation.
creditsModal?.addEventListener("click", (event) => {
  const anchor = event.target?.closest?.("a[href]");
  if (anchor && creditsModal.contains(anchor)) {
    event.preventDefault();
    openExternalLinkModal(anchor.href);
    return;
  }

  const card = event.target?.closest?.(".credit-item[data-primary-url]");
  if (card && creditsModal.contains(card)) {
    openExternalLinkModal(card.getAttribute("data-primary-url"));
  }
});

btnExternalLinkConfirm?.addEventListener("click", () => {
  if (pendingExternalUrl) window.open(pendingExternalUrl, "_blank", "noopener,noreferrer");
  closeExternalLinkModal();
});

btnExternalLinkCancel?.addEventListener("click", closeExternalLinkModal);
externalLinkModal?.addEventListener("click", (event) => {
  if (event.target === externalLinkModal) closeExternalLinkModal();
});

function syncAmbienceButtonState(isPlaying) {
  // Visual mode indicator: yellow highlight marks the active transport state.
  btnDMPlay?.classList.toggle("is-active", !!isPlaying);
  btnDMPause?.classList.toggle("is-active", !isPlaying);
  // Animated gold bars � visible only when a track is actively playing.
  $("ambienceAudioBars")?.classList.toggle("hidden", !isPlaying);
  renderAtmospherePanel({
    track: dmAmbience?.value,
    volume: Number(dmVolume?.value ?? 0.6),
    isPlaying: !!isPlaying,
  });
}

if (btnToggleSocial) {
  // Toolbar action: open/close dedicated social view mode.
  btnToggleSocial.addEventListener("click", (e) => {
    if (btnToggleSocial.disabled) return;
    if (currentScreenKey !== SCREEN_KEYS.DM_DASH) {
      showOnly(SCREEN_KEYS.DM_DASH);
      setDMSocialMode(true);
      return;
    }
    const opening = !dmSplit?.classList.contains("social-mode");
    setDMSocialMode(opening);
  });
}

if (btnOpenSocialFromParty) {
  btnOpenSocialFromParty.addEventListener("click", () => {
    if (currentScreenKey !== SCREEN_KEYS.DM_DASH) showOnly(SCREEN_KEYS.DM_DASH);
    if (state.joinLink) {
      openQRInviteModal();
      return;
    }
    setDMSocialMode(true);
  });
}

if (btnOpenCreateHandout) {
  if (!btnOpenCreateHandout.onclick) btnOpenCreateHandout.addEventListener("click", () => {
    if (btnOpenCreateHandout.disabled) return;
    openCreateHandoutModal({ ensureDashboard: true });
  });
}

if (btnOpenInventory) {
  if (!btnOpenInventory.onclick) btnOpenInventory.addEventListener("click", () => {
    if (btnOpenInventory.disabled) return;
    openInventoryScreen();
  });
}

if (btnCloseSocial) {
  btnCloseSocial.addEventListener("click", () => {
    dmSocialPanel?.classList.add("hidden");
    dmSplit?.classList.remove("social-mode");
    dmHandoutsPanel?.classList.remove("hidden");
    setDMSocialMode(false);
  });
}

// Change / set session PIN from the social panel (in-app modal, no prompt())
{
  const changePinModal = $("changePinModal");
  const changePinInput = $("changePinInput");
  const changePinMsg = $("changePinMsg");
  const btnConfirmChangePin = $("btnConfirmChangePin");
  const btnCancelChangePin = $("btnCancelChangePin");

  function openChangePinModal() {
    if (!changePinModal) return;
    if (changePinInput) changePinInput.value = "";
    if (changePinMsg) changePinMsg.textContent = "";
    animateModalIn(changePinModal);
    changePinInput?.focus();
  }
  function closeChangePinModal() {
    if (!changePinModal) return;
    animateModalOut(changePinModal);
  }

  btnChangePin?.addEventListener("click", () => {
    if (!state.sessionId || state.role !== "dm") return;
    openChangePinModal();
  });

  btnConfirmChangePin?.addEventListener("click", async () => {
    const trimmed = (changePinInput?.value || "").trim();
    if (!/^\d{4,8}$/.test(trimmed)) {
      if (changePinMsg) changePinMsg.textContent = "PIN must be 4�8 digits.";
      return;
    }
    try {
      const pinHash = await sha256(trimmed);
      await updateDoc(doc(db, "sessions", state.sessionId), { pinHash });
      state.dmPinPlain = trimmed;
      persistLocal();
      if (dmPinShown) dmPinShown.textContent = trimmed;
      if (btnChangePin) btnChangePin.textContent = "Change";
      const qrUrl = `${state.joinLink}&pin=${encodeURIComponent(trimmed)}`;
      renderQR(qrUrl);
      closeChangePinModal();
      showToast("PIN updated!", "success");
    } catch (e) {
      console.error("changePin:", e);
      if (changePinMsg) changePinMsg.textContent = "Failed to update PIN.";
    }
  });

  btnCancelChangePin?.addEventListener("click", closeChangePinModal);

  changePinModal?.querySelector(".blockingModal__backdrop")?.addEventListener("click", closeChangePinModal);
}

// -- DM Transfer PIN modal (separate from session join PIN) --
{
  const changeTransferPinModal = $("changeTransferPinModal");
  const changeTransferPinInput = $("changeTransferPinInput");
  const changeTransferPinMsg = $("changeTransferPinMsg");
  const btnConfirmChangeTransferPin = $("btnConfirmChangeTransferPin");
  const btnRemoveTransferPin = $("btnRemoveTransferPin");
  const btnCancelChangeTransferPin = $("btnCancelChangeTransferPin");

  function openChangeTransferPinModal() {
    if (!changeTransferPinModal) return;
    if (changeTransferPinInput) changeTransferPinInput.value = "";
    if (changeTransferPinMsg) changeTransferPinMsg.textContent = "";
    animateModalIn(changeTransferPinModal);
    changeTransferPinInput?.focus();
  }
  function closeChangeTransferPinModal() {
    if (!changeTransferPinModal) return;
    animateModalOut(changeTransferPinModal);
  }

  btnChangeTransferPin?.addEventListener("click", () => {
    if (!state.sessionId || state.role !== "dm") return;
    openChangeTransferPinModal();
  });

  btnConfirmChangeTransferPin?.addEventListener("click", async () => {
    const trimmed = (changeTransferPinInput?.value || "").trim();
    if (!/^\d{4,8}$/.test(trimmed)) {
      if (changeTransferPinMsg) changeTransferPinMsg.textContent = "PIN must be 4�8 digits.";
      return;
    }
    try {
      const pinHash = await sha256(trimmed);
      await updateDoc(doc(db, "sessions", state.sessionId), { dmTransferPinHash: pinHash });
      if (dmTransferPinShown) dmTransferPinShown.textContent = "Set";
      if (btnChangeTransferPin) btnChangeTransferPin.textContent = "Change";
      closeChangeTransferPinModal();
      showToast("DM Transfer PIN set!", "success");
    } catch (e) {
      console.error("changeTransferPin:", e);
      if (changeTransferPinMsg) changeTransferPinMsg.textContent = "Failed to update transfer PIN.";
    }
  });

  btnRemoveTransferPin?.addEventListener("click", async () => {
    if (!state.sessionId || state.role !== "dm") return;
    try {
      await updateDoc(doc(db, "sessions", state.sessionId), { dmTransferPinHash: "" });
      if (dmTransferPinShown) dmTransferPinShown.textContent = "Not set";
      if (btnChangeTransferPin) btnChangeTransferPin.textContent = "Set";
      closeChangeTransferPinModal();
      showToast("DM Transfer PIN removed.", "info");
    } catch (e) {
      console.error("removeTransferPin:", e);
      if (changeTransferPinMsg) changeTransferPinMsg.textContent = "Failed to remove transfer PIN.";
    }
  });

  btnCancelChangeTransferPin?.addEventListener("click", closeChangeTransferPinModal);

  changeTransferPinModal?.querySelector(".blockingModal__backdrop")?.addEventListener("click", closeChangeTransferPinModal);
}

// GM sound is enabled by default when opening the GM dashboard (handled in openDMDashboard)

const AMBIENCE_URLS = {
  // Royalty-free ambience tracks (local audio/ folder).
  tavern:     "audio/Tavern - Music and Ambience.mp3",
  forest:     "audio/Forest - Ambience.mp3",
  dungeon:    "audio/Dungeon - Ambience.mp3",
  battle:     "audio/Battle - Music.mp3",
  ocean:      "audio/Ocean - Ambience.mp3",
  mysterious: "audio/Mysterious - Music and Ambience.mp3",
};

const AMBIENCE_FADE_MS = 900;
let ambienceFadeRaf = 0;
let ambienceFadeToken = 0;

function stopAmbienceFade() {
  if (ambienceFadeRaf) {
    cancelAnimationFrame(ambienceFadeRaf);
    ambienceFadeRaf = 0;
  }
}

function animateAmbienceVolume(from, to, durationMs, onDone) {
  stopAmbienceFade();
  const start = performance.now();
  const dur = Math.max(60, Number(durationMs) || AMBIENCE_FADE_MS);

  const tick = (now) => {
    const t = Math.min(1, (now - start) / dur);
    ambienceAudio.volume = from + (to - from) * t;
    if (t < 1) {
      ambienceFadeRaf = requestAnimationFrame(tick);
      return;
    }
    ambienceFadeRaf = 0;
    if (onDone) onDone();
  };

  ambienceFadeRaf = requestAnimationFrame(tick);
}

function setAmbienceTrack(track) {
  ensureAmbienceAudioMounted();
  const url = AMBIENCE_URLS[track];
  if (!url) return false;
  const abs = new URL(url, location.href).href;
  if (ambienceAudio.src === abs) return false;
  ambienceAudio.src = abs;
  return true;
}

let pendingAmbienceResume = false;
_lastAmbienceState = _lastAmbienceState || null; // cache for gesture-resume replay
let audioUnlockPromptEl = null;

function ensureAudioUnlockPrompt() {
  if (audioUnlockPromptEl) return audioUnlockPromptEl;
  // Build prompt lazily so we only allocate DOM when blocking actually occurs.
  const wrap = document.createElement("div");
  wrap.id = "audioUnlockPrompt";
  wrap.className = "audioUnlockPrompt";
  wrap.style.display = "none";
  wrap.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:center;">
      <span style="color:var(--text);font-size:13px;line-height:1.3;">Browser blocked audio.</span>
      <button id="btnForceEnableAudio" type="button" class="btn btn--small">Enable Audio</button>
    </div>
  `;
  document.body.appendChild(wrap);
  const btn = wrap.querySelector("#btnForceEnableAudio");
  if (btn) {
    btn.addEventListener("click", async () => {
      // Force-enable path:
      // 1) set local sound preference
      // 2) retry the most recent ambience state
      // 3) clear pending flag only on actual playback success
      soundEnabled = true;
      localStorage.setItem("tv_soundEnabled", "1");
      try { syncSoundToggleUI(); } catch (_) {}

      let ok = false;
      if (_lastAmbienceState && _lastAmbienceState.isPlaying) {
        const track = String(_lastAmbienceState.track ?? "tavern");
        const targetVol = Math.min(1, Math.max(0, Number(_lastAmbienceState.volume ?? 0.6)));
        setAmbienceTrack(track);
        ok = await attemptAmbiencePlay(targetVol);
        if (ok) ambienceAudio.volume = targetVol;
      } else if (ambienceAudio.src) {
        ok = await attemptAmbiencePlay();
      }

      if (ok) {
        pendingAmbienceResume = false;
        hideAudioUnlockPrompt();
        showToast("Audio enabled.", "success", 1400);
      } else {
        showToast("Audio still blocked. Tap Enable Audio again.", "info", 2200);
      }
    });
  }
  audioUnlockPromptEl = wrap;
  return wrap;
}

function showAudioUnlockPrompt() {
  const el = ensureAudioUnlockPrompt();
  if (el) el.style.display = "block";
}

function hideAudioUnlockPrompt() {
  if (audioUnlockPromptEl) audioUnlockPromptEl.style.display = "none";
}

function requestAmbienceResume() {
  if (!soundEnabled || !ambienceAudio.src) return;
  // This flag is consumed by gesture listeners below.
  // Autoplay policy reminder: browsers often require a user gesture before audio can start.
  pendingAmbienceResume = true;
  showToast("Audio blocked by browser � tap anywhere to hear sound.", "info", 3000);
  showAudioUnlockPrompt();
}

async function tryResumeAmbienceFromGesture() {
  if (!pendingAmbienceResume || !soundEnabled || !ambienceAudio.src) return;
  // Called from pointer/click/keydown events: these satisfy autoplay policy.
  const ok = await attemptAmbiencePlay();
  if (ok) {
    pendingAmbienceResume = false;
    hideAudioUnlockPrompt();
    // Re-apply full ambience state so volume fades in properly.
    if (_lastAmbienceState) applyAmbience(_lastAmbienceState);
  }
}

function applyAmbience(amb) {
  // Why this is separated into one function:
  // Any listener (GM or player) can call one shared routine for audio updates.
  // This prevents logic duplication and keeps behavior consistent.
  if (!amb) return;
  _lastAmbienceState = amb; // cache for gesture-resume replay
  const track = String(amb.track ?? "tavern");
  const targetVol = Math.min(1, Math.max(0, Number(amb.volume ?? 0.6)));
  const playing = !!amb.isPlaying;
  const sourceChanged = setAmbienceTrack(track);

  // Keep looping enforced even after source changes.
  ambienceAudio.loop = true;

  if (!soundEnabled) {
    stopAmbienceFade();
    ambienceAudio.pause();
    ambienceAudio.volume = 0;
    return;
  }

  if (playing) {
    // If track changed while already playing, fade out old track and fade in the new one.
    if (sourceChanged && !ambienceAudio.paused) {
      const token = ++ambienceFadeToken;
      const halfFade = Math.round(AMBIENCE_FADE_MS * 0.45);
      const startVol = ambienceAudio.volume;

      animateAmbienceVolume(startVol, 0, halfFade, () => {
        // Tip: token checks prevent stale async callbacks from older fades
        // from mutating the current track state after a rapid user change.
        if (token !== ambienceFadeToken) return;
        ambienceAudio.pause();
        ambienceAudio.currentTime = 0;
        ambienceAudio.volume = 0;
        attemptAmbiencePlay(0).then((ok) => {
          if (token !== ambienceFadeToken) return;
          if (!ok) {
            requestAmbienceResume();
            return;
          }
          animateAmbienceVolume(0, targetVol, AMBIENCE_FADE_MS - halfFade);
        });
      });
      return;
    }

    // Fresh start or resume: fade in smoothly.
    if (ambienceAudio.paused || sourceChanged) {
      const token = ++ambienceFadeToken;
      ambienceAudio.currentTime = 0;
      ambienceAudio.volume = 0;
      attemptAmbiencePlay(0).then((ok) => {
        // Same token guard here for quick play/pause/track toggles.
        if (token !== ambienceFadeToken) return;
        if (!ok) {
          requestAmbienceResume();
          return;
        }
        animateAmbienceVolume(0, targetVol, AMBIENCE_FADE_MS);
      });
      return;
    }

    // Already playing same track: smooth volume adjustment instead of jump.
    animateAmbienceVolume(ambienceAudio.volume, targetVol, AMBIENCE_FADE_MS);
    return;
  }

  // Pause path: fade out before pausing to avoid abrupt cutoff.
  if (ambienceAudio.paused) {
    ambienceAudio.volume = 0;
    return;
  }

  const token = ++ambienceFadeToken;
  const startVol = ambienceAudio.volume;
  animateAmbienceVolume(startVol, 0, AMBIENCE_FADE_MS, () => {
    if (token !== ambienceFadeToken) return;
    ambienceAudio.pause();
    ambienceAudio.volume = 0;
  });
}

window.addEventListener("pointerdown", () => {
  tryResumeAmbienceFromGesture().catch(() => {});
}, { passive: true });
window.addEventListener("touchend", () => {
  tryResumeAmbienceFromGesture().catch(() => {});
}, { passive: true });
window.addEventListener("click", () => {
  tryResumeAmbienceFromGesture().catch(() => {});
}, { passive: true });
window.addEventListener("keydown", () => {
  tryResumeAmbienceFromGesture().catch(() => {});
}, { passive: true });
ambienceAudio.addEventListener("canplaythrough", () => {
  tryResumeAmbienceFromGesture().catch(() => {});
});

// ---- 20) Resume helpers (GM + player) ----
// BEGINNER NOTE � Session persistence:
// When the user refreshes the page or reopens TomeVault, we try to
// resume their previous session automatically. localStorage stores the
// sessionId and role; these functions verify the data is still valid
// in Firestore (session exists, user owns it / is a player in it)
// before re-opening the dashboard or player view.
// If the session was one-shot and has expired, we clean it up instead.
async function tryResumeDM(sessionId) {
  // Resume only if current anonymous uid matches stored dmUid ownership.
  const sessionRef = doc(db, "sessions", sessionId);
  const snap = await getDoc(sessionRef);
  if (!snap.exists()) return false;

  const s = snap.data();
  if (isExpiredOneShotSession(s)) {
    await tryDeleteExpiredOneShotSession(sessionId, s);
    localStorage.removeItem("tv_lastDmSessionId");
    return false;
  }
  if (s.dmUid !== state.uid) return false;

  state.role = "dm";
  state.sessionId = sessionId;
  state.joinTag = s.joinTag || sessionId;
  state.joinLink = `${location.origin}${location.pathname}?join=${encodeURIComponent(state.joinTag)}`;
  state.dmPinPlain = localStorage.getItem("tv_dmPin") || null;

  if (dmSessionName) dmSessionName.value = s.name || "";
  await openDMDashboard(s.name || "Session");
  persistLocal();
  return true;
}

async function findLatestOwnedDMSessionId(uid) {
  if (!uid) return "";
  try {
    const dmSnap = await getDocs(query(collection(db, "sessions"), where("dmUid", "==", uid)));
    if (dmSnap.empty) return "";
    const sorted = dmSnap.docs
      .map((d) => ({
        id: d.id,
        updatedAtMs: d.data()?.updatedAt?.toMillis ? d.data().updatedAt.toMillis() : 0,
        createdAtMs: d.data()?.createdAt?.toMillis ? d.data().createdAt.toMillis() : 0,
      }))
      .sort((a, b) => (b.updatedAtMs || b.createdAtMs) - (a.updatedAtMs || a.createdAtMs));
    return sorted[0]?.id || "";
  } catch (e) {
    console.warn("findLatestOwnedDMSessionId failed:", e);
    return "";
  }
}

async function tryResumePlayer(sessionId) {
  // Resume only if this uid already exists in players subcollection.
  const sessionRef = doc(db, "sessions", sessionId);
  const snap = await getDoc(sessionRef);
  if (!snap.exists()) return false;

  const s = snap.data();
  if (isExpiredOneShotSession(s)) {
    await tryDeleteExpiredOneShotSession(sessionId, s);
    localStorage.removeItem("tv_sessionId");
    localStorage.removeItem("tv_joinTag");
    if (localStorage.getItem("tv_role") === "player") localStorage.removeItem("tv_role");
    return false;
  }

  const playerRef = doc(db, "sessions", sessionId, "players", state.uid);
  const psnap = await getDoc(playerRef);
  if (!psnap.exists()) return false;

  state.role = "player";
  state.sessionId = sessionId;
  state.joinTag = s.joinTag || sessionId;
  state.joinLink = `${location.origin}${location.pathname}?join=${encodeURIComponent(state.joinTag)}`;

  await openPlayerView(s.name || "Session");
  persistLocal();
  return true;
}

// ---- 21) Main boot ----
// BEGINNER NOTE � Application entry point:
// `main()` is called once when the page loads. It sets up the entire app
// in a specific order (theme ? network status ? auth ? URL parsing ?
// session resume). The order matters because each step depends on the
// previous one: you can't resume a session without knowing who the user is,
// and you can't know who the user is without initializing auth first.
async function main() {
  initializeTheme();
  showAuthLoading("Restoring your session...");
  try {
    await ensureAuthPersistence();
    // Startup order:
    // 1) auth (wait for first auth state � may or may not have user)
    // 2) URL join param (auto-guest for QR links)
    // 3) local resume logic (gm/player) � only if signed in
    // 4) fallback landing screen
    await processRedirectAuthResult();
    const user = await initAuth();


// ================================================================
// ZONE: APP BOOTSTRAP
// Purpose: start app initialization exactly once.
// ================================================================
    // If returning user is signed in, load profile cache
    if (user) {
      updateTopBarAvatar("");
      try { await ensureOwnProfileLoaded(); } catch (e) { console.warn("Profile load:", e); }
      try { await runOneTimeRoleDisplayNameMigration(user); } catch (e) { console.warn("Role name migration:", e); }
      try { await cleanupOwnedExpiredOneShots(user.uid); } catch (e) { console.warn("One-shot cleanup:", e); }
    }

    const joinFromUrl = parseJoinParam();
    const { r, s, dm } = loadLocal();

    // Detect returning guest
    if (user && user.isAnonymous) {
      state.isGuest = true;
      localStorage.setItem("tv_isGuest", "1");
    }

    // Via QR/join link: auto-sign-in as guest if needed, then go to player join
    if (joinFromUrl) {
      if (!user) {
        try {
          await signInAnonymously(auth);
          state.uid = auth.currentUser.uid;
          state.isGuest = true;
          state.isSignedIn = true;
          localStorage.setItem("tv_isGuest", "1");
        } catch (e) {
          console.error("Auto-guest for QR link failed:", e);
          showOnly(SCREEN_KEYS.LANDING);
          return;
        }
      }
      state.role = "player";
      showOnly(SCREEN_KEYS.PL_JOIN);
      // Attempt instant auto-join when the link carries a valid PIN.
      try {
        const autoJoined = await tryAutoJoinFromDeepLink(joinFromUrl);
        if (autoJoined) return;
      } catch (e) {
        console.warn("Auto-join from deep link failed:", e);
      }
      // Auto-join didn't succeed � guide user to the missing field
      if (plPin && !String(plPin.value || "").trim()) {
        plPin.focus();
      }
      return;
    }

    // If not signed in at all, show landing (auth card visible)
    if (!user) {
      showOnly(SCREEN_KEYS.LANDING);
      return;
    }

    // Resume GM (also recover if role flag is missing but last GM session exists)
    if (r === "dm" || (!r && dm)) {
      const preferredSessionId = s || dm;
      if (preferredSessionId) {
        const ok = await tryResumeDM(preferredSessionId);
        if (ok) return;
      }
      const fallbackDmId = await findLatestOwnedDMSessionId(state.uid);
      if (fallbackDmId && fallbackDmId !== preferredSessionId) {
        const fallbackOk = await tryResumeDM(fallbackDmId);
        if (fallbackOk) return;
      }
    }

    // Resume player
    if (r === "player" && s) {
      const ok = await tryResumePlayer(s);
      if (ok) return;
      showOnly(SCREEN_KEYS.PL_JOIN);
      return;
    }

    // Signed-in user with no active session → show landing home section
    showOnly(SCREEN_KEYS.LANDING);
    updateLandingAuthState();
  } finally {
    hideAuthLoading();
  }
}

main().catch((e) => {
  // Fail-safe startup handling so user still sees UI instead of blank page.
  console.error("Startup error:", e);
  try { showOnly(SCREEN_KEYS.LANDING); } catch {}
  showToast("Startup error. Open F12 ? Console for details.", "error", 4500);
});

[modalTitle, modalPublic, modalSecret].forEach((el) => {
  el?.addEventListener("input", () => {
    if (!modalDraft || modalCtx.role !== "dm") return;
    syncModalTextIntoDraft();
    refreshModalSaveState();
  });
});

// Service worker registration intentionally disabled.








# TomeVault: Gedetailleerd Verslag

## Inhoudsopgave

1. [Inleiding en Doel](#inleiding-en-doel)
2. [Wat is TomeVault?](#wat-is-tomevault)
3. [Functionaliteiten en Features](#functionaliteiten-en-features)
4. [Technologie Stack](#technologie-stack)
5. [Architectuur Overzicht](#architectuur-overzicht)
6. [Datastructuur en Firestore Schema](#datastructuur-en-firestore-schema)
7. [Component Structuur](#component-structuur)
8. [Bibliotheek en Utility Functies](#bibliotheek-en-utility-functies)
9. [Verificatie en Toestemmingen](#verificatie-en-toestemmingen)
10. [Gebruikersworkflows](#gebruikersworkflows)
11. [UI Design en Theming](#ui-design-en-theming)
12. [Freemium Bedrijfsmodel](#freemium-bedrijfsmodel)
13. [Build, Deploy en Configuratie](#build-deploy-en-configuratie)
14. [Huidige Implementatiepatronen](#huidige-implementatiepatronen)

---

## Inleiding en Doel

Dit verslag biedt een **volledige en diepgaande analyse** van het TomeVault-project. Het is bedoeld als referentiemateriaal voor NotebookLM en andere AI-systemen om het project volledig te begrijpen, inclusief:

- Het doel en de waardepropositie van de toepassing
- Gedetailleerde functionaliteiten voor zowel Game Masters (GM's) als spelers
- De volledige technische architectuur en codestructuur
- Data-modellering en Firestore-schema
- Component-hierarchie en communicatiepatronen
- Bedrijfslogica en monetisatiemodel

---

## Wat is TomeVault?

### Kernomschrijving

**TomeVault** is een **moderne webapplicatie voor het beheren van D&D en TTRPG (Tabletop Roleplaying Game) sessies**. Het is een samenwerkingsplatform waar Game Masters (GM's) D&D-sessions organiseren en coördineren, terwijl spelers in real-time kunnen deelnemen aan gedeelde campagnes.

TomeVault biedt een **gecentraliseerde hub** voor het beheren van TTRPG-sessies met live-communicatie, gevechtstrack, voorraadbeheer en sfeervolle audiobegeleiding.

### Waardepropositie

1. **Gecentraliseerd sessiecentrum** - Alle informatie op één plek in plaats van verspreid over Discord, Excel en notitieblokken
2. **Real-time samenwerking** - Spelers en GM's zien dezelfde informatie tegelijkertijd
3. **Eenvoudig toegangsmodel** - Spelers joinen via QR-code of invitatiecode, geen installatie nodig
4. **Atmosferische ervaring** - Diceroller, ambientzuziek en gekleurd schaakchat voegen sfeer toe
5. **GM-gerichte tools** - Voorbereiding, NPC-templates, handout-verdeling
6. **Spelaantekeningen** - Persoonlijke logboeken en voorraadbeheer per speler
7. **Sessie-archivering** - PDF-export van sessiegeschiedenis en spelerrecords

### Doelgroep

- **Casual tot intermediate tabletop-spelers**
- **D&D- en TTRPG-groepen** (minimaal 2 tot ongeveer 6 spelers)
- **Online en hybride gaminggroepen**
- **GM's die systematisch willen voorbereiding en track-beheer**
- **SaaS-alternatief** voor Roll20 en Fantasy Grounds (meer gericht op D&D, minder op andere systemen)

### Humoristische visie

*"Een plaats waar GM's hun plannen kunnen coördineren, spelers hun goud kunnen vertrouwen, en iedereen dezelfde diceroller kan gebruiken zonder dat iemand anders de Discord moet scrollen."*

---

## Functionaliteiten en Features

### Voor Game Masters (GM)

#### 1. Sessiebeheer
- **Sessie creatie** - Unieke invitatiecode + QR-code generering
- **Sessie-archivering** - Oude sessies opslaan/herstellen
- **Speelersrooster** - Manual roster management met join-tracking
- **GM-overdracht** - Ownership overdragen aan ander speelerlid met PIN/transfer-document

#### 2. Handout-verdeling
- **Handout-creatie** - Story-clues, kaarten, schatbeschrijvingen maken
- **Zichtbaarheidstoggle** - Handouts tonen/verbergen voor spelers
- **Geheimen** - Aparte "secret" toggle voor gevoelige informatie
- **Buit claimen** - GM markeert items als "claimable" en spelers kunnen ze zelf claimen
- **Afbeeldingen** - Upload afbeeldingen voor visuele handouts

#### 3. Partymanagement
- **NPC toevoegen** - Snelle NPC-statblocks on-the-fly maken
- **HP/AC tracking** - Levenspunten en armor class beheren
- **Initiative modifiers** - Custom initiative bonussen per karakter
- **Custom stats** - Aangepaste velden (bv. Spell Slots, Sanity)
- **Combatdeelname** - In/uit-schakelen van combatpartners per sessie

#### 4. Gevechtstracking
- **Initiative roller** - d20 + modifiers auto-berekend
- **Turn-gebaseerde tracker** - Huidige beurt duidelijk aangegeven
- **Handmatig herschikken** - Volgorde van initiatives aanpassen
- **Rundenogtelling** - Automatisch ronde-incrementering
- **Speelersalarmen** - Volgende beurt waarschuwingen ("Je beurt in 2 beurten")

#### 5. Voorbereiding/Templates
- **Karaktertemplates opslaan** - Volledige statblocks (naam, HP, AC, avatar, bio, stats)
- **Sjabloontoewijzing** - Templates aan spelers toewijzen met acceptatiewerkstroom
- **Backup snapshots** - Backups maken voor herstel bij beschadigde profielen
- **Toewijzingsstatus** - Tracking van pending/accepted/rejected/ready
- **Meerdere templates** - Tot 3 (Free) of onbeperkt (Premium)

#### 6. Sessiambience
- **Audiospoor selectie** - Tavern, Bos, Kerker, Oceaan, etc.
- **Mastervolume controle** - Luisteraarvolume aanpassen
- **Fade timing** - Crossfade-duur voor muziekwissels
- **Speelertoestand** - Alle luisteraars synchroon houden

#### 7. Voorraadbeheer
- **Bulk toevoegen** - Items in bulk toevoegen met categorieën
- **Aangepaste secties** - Groepen items in custom secties
- **Amounttracking** - Per-speler hoeveelheden aanpassen
- **Afbeeldingsondersteuning** - Upload afbeeldingen voor items

#### 8. Eigenaar Admin Panel
- **Gebruikersopwaardering** - Manual Premium-upgrades uitvoeren
- **Code-generering** - Redemption codes genereren voor inwisselingen
- **Gebruikerszoeking** - Analytics en gebruiker Details

### Voor Spelers

#### 1. Sessie-ontdekking
- **QR-code joinen** - Snelle sessie-toegang via camera
- **Invitatiecode** - Tekstcode invoeren voor minder technisch mede-spelers
- **Recente sessies** - Cross-device persistentie van vorige sessies
- **Hervat sessie** - Automatisch terug naar laatste actieve sessie

#### 2. Live chatten
- **Berichten verzenden** - Real-time chatten met alle sessieleden
- **Accentkleuren** - Berichten personaliseren met gekozen kleur
- **Inline diceroller** - Typ `roll d20 + 5` voor directe wurf
- **Rollhistorie** - Alle eerdere worpen zien

#### 3. Gevechtsdeelname
- **Opt-in combatteerd** - Kies om deel te nemen aan combat
- **Huidig beurtbewustzijn** - Weet wanneer het je beurt is
- **Volgende beurt-waarschuwing** - Alert voor aanstaande beurt
- **Schadebeheer** - Accepteer damage van GM of selbewust

#### 4. Voorraadetoegang
- **Persoonlijke inventaris** - Items toebedeeld aan jouw karakter
- **Party-inventaris** - Gedeelde voorraden als GM toestaat
- **Item-ontvangst** - Zie wanneer GM je items geeft
- **Hoeveelheid aanpassing** - Zelf items verbruiken

#### 5. Handout-interactie
- **Handout weergave** - Bekijk GM-ontvangen handouts
- **Buiteclaim** - Claim buit wanneer beschikbaar
- **Geheim onthullen** - Lees gevoelige informatie wanneer GM toestaat
- **Afbeeldingweergave** - Bekijk handout-afbeeldingen

#### 6. Persoonsaantekeningen
- **Sessielogboek** - Aanvullende aantekeningen maken over sessies
- **Aangepaste structuur** - Maak je eigen notitiebasis
- **Synchronisatie** - Aantekeningen beschikbaar op alle apparaten
- **Privacy** - Volledig privé per speler

#### 7. Karakterprofielen
- **Karakteraanpassingen** - Werk je karaktersheet bij (binnen aanbeden template)
- **Avatar-upload** - Upload of genereer karakterafbeelding
- **Custom stats** - Personaliseer extra statistieken
- **Biografie** - Stel je karakter voor

---

## Technologie Stack

### Frontend

```
React 19.2.5
  ├─ Moderne functionele componenten met hooks
  ├─ Efficiënte re-render via useMemo/useCallback
  └─ Context API voor globale state (waar nodig)

Vite 8.0.10
  ├─ Lightningsnelle dev-server met hot module replacement
  ├─ Optimalisatie van build (tree-shaking, code splitting)
  ├─ Plugins voor Tailwind- en Vue-integratie
  └─ Snelle dev-iteratie in <100ms

TailwindCSS 4.2.4
  ├─ Utility-first styling framework
  ├─ Responsive design met breakpoints
  ├─ Custom theme tokens (kleuren, schaduwen, typografie)
  ├─ Dark mode ondersteuning
  └─ Vite-integratie voor optimalisatie

Lucide React 1.14.0
  ├─ Modern iconenbibliotheek (200+ icons)
  ├─ SVG-gebaseerd voor crisp rendering
  ├─ Theme-aware colored icons
  └─ Gebruikers voor UI-elementen overal

Material Design Icons (@mdi/js) 7.4.47
  ├─ Diceroller-specifieke iconen
  ├─ Grote icon-selectie
  └─ Aanvulling op Lucide
```

### Backend & Services

```
Firebase Suite
  ├─ Firebase Auth
  │  ├─ Multi-methode authenticatie (Google OAuth, Email, Anoniem)
  │  ├─ Persistence strategieën (IndexedDB → LocalStorage → SessionStorage → Memory)
  │  └─ Auto-token-vernieuwing
  │
  ├─ Firestore Database
  │  ├─ Real-time NoSQL database
  │  ├─ Security Rules voor server-side enforcement
  │  ├─ Composite indexes voor complexe queries
  │  ├─ Subcollecties voor user memberships
  │  └─ Batch writes voor transacties
  │
  ├─ Firebase Storage
  │  ├─ Afbeeldingupload (handouts, NPC's, items, avatars)
  │  ├─ Download URLs in Firestore opgeslagen
  │  └─ Storage security rules
  │
  ├─ Cloud Functions
  │  ├─ Reserve voor toekomstige logic (email, webhooks, etc.)
  │  └─ Momenteel minimal gebruikt
  │
  └─ Firebase Hosting
     ├─ SPA-rewrite voor client-side routing
     ├─ Static file serving met caching
     ├─ HTTPS automatisch
     └─ Deployment via Firebase CLI
```

### Utilities & Libraries

```
PDF Generatie
  ├─ jspdf - PDF-document creatie
  ├─ jspdf-autotable - Geautomatiseerde tabellay-out
  └─ Gebruik: Session archive export, player records

QR-codes
  ├─ qr-code-styling - Gestileerde QR-generatie
  ├─ react-qr-code - React-component wrapper
  └─ Gebruik: Session invite codes

TailwindCSS Vite Plugin
  ├─ CSS preprocessing
  ├─ JIT-compilatie
  └─ Development hot-reload
```

### Taal & Localizations

- **JavaScript (ES Modules)** met JSX voor componenten
- **Nederlands UI-kopie** ingebouwd in component-tekst (geen i18n library)
- **Browser Storage** voor client-voorkeuren

---

## Architectuur Overzicht

### High-level Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     LANDING SCREEN                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Auth Flow:                                          │  │
│  │  ├─ Google OAuth                                    │  │
│  │  ├─ Email/Wachtwoord                                │  │
│  │  ├─ Anoniem                                         │  │
│  │  └─ QR-code join                                    │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
         ┌──────────────────────────────────────┐
         │    SESSION HUB (Recent Sessions)     │
         │                                      │
         │  ├─ Browse past sessions            │
         │  ├─ Create new campaign             │
         │  └─ Join recent session             │
         └──────────────────────────────────────┘
                            ↓
    ┌────────────────────────────────────────────────────┐
    │           ACTIVE SESSION DASHBOARD                │
    │                                                   │
    │  ┌─────────────────────────────────────────────┐ │
    │  │           TOP BAR                           │ │
    │  │  Session Name │ Party Toggle │ Ambience │   │ │
    │  │  Settings │ Share                       │   │ │
    │  └─────────────────────────────────────────────┘ │
    │                                                   │
    │  ┌──────────────┐    ┌──────────────────────┐   │
    │  │ SIDEBAR      │    │   CONTENT AREA       │   │
    │  │              │    │                      │   │
    │  │ ├─ Handouts  │    │  Selected Tab:       │   │
    │  │ ├─ Chat      │    │  ├─ Handouts        │   │
    │  │ ├─ Inventory │    │  ├─ Chat            │   │
    │  │ ├─ Prep (GM) │    │  ├─ Inventory       │   │
    │  │ └─ Notes     │    │  ├─ Prep (GM)       │   │
    │  │              │    │  └─ Notes           │   │
    │  └──────────────┘    └──────────────────────┘   │
    │                                                   │
    │  ┌────────────────────────────────────────────┐ │
    │  │      RIGHT SIDEBAR (Party Members)        │ │
    │  │                                            │ │
    │  │  [Player 1 Name] HP: 45/50 AC: 16        │ │
    │  │  [Player 2 Name] HP: 30/35 AC: 14        │ │
    │  │  [NPC 1] HP: 60/75 AC: 18                │ │
    │  └────────────────────────────────────────────┘ │
    │                                                   │
    └────────────────────────────────────────────────────┘
```

### Data Flow: Creatie tot Weergave

```
┌─────────────────────────────────────────────────────┐
│          USER INTERACTION (UI EVENT)               │
│  Voorbeeld: Speler voegt item toe aan inventaris  │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│      COMPONENT STATE UPDATE (Optimistic)            │
│  useState setInventoryItems([...])                 │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│      FIRESTORE WRITE                                │
│  db.collection('sessions').doc(sessionId)          │
│    .collection('inventory').add({...})             │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│      FIRESTORE LISTENER TRIGGERS                    │
│  onSnapshot(query, (snapshot) => {                 │
│    processSnapshot();                              │
│  })                                                │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│      COMPONENT RE-RENDERS                           │
│  State updated met server-confirmed data           │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│      UI UPDATED FOR ALL CONNECTED USERS             │
│  Alle sessieleden zien gelijktijdig                │
└─────────────────────────────────────────────────────┘
```

### Authentication Flow

```
Browser                    Firebase Auth               Firestore
  │                              │                          │
  ├─ User clicks "Login"         │                          │
  │                              │                          │
  ├─ onAuthStateChanged          │                          │
  │     trigger                  │                          │
  │                              │                          │
  ├──────────────────────────────┼─ Return Auth Object     │
  │                              │  {uid, email, etc}       │
  │                              │                          │
  ├─ Read /users/{uid}           │                          │
  │  + /users/{uid}/memberships  ├─────────────────────────┤
  │                              │  Return user document    │
  │                              │  + session memberships   │
  │                              │                          │
  ├─ Local state: currentUser    │                          │
  ├─ Local state: activeSessions │                          │
  │                              │                          │
  ├─ Dashboard renders           │                          │
```

---

## Datastructuur en Firestore Schema

### Firestore Collections

#### `/admins/{adminId}`
```javascript
{
  uid: "admin-user-id",
  role: "owner",
  createdAt: timestamp
}
```
**Doel:** Propriëtaire-alleen features identifiëren

---

#### `/users/{uid}`
```javascript
{
  displayName: "Speler Naam",
  photoUrl: "https://...",
  email: "speler@example.com",
  createdAt: timestamp,
  
  // Subcollectie: memberships
  memberships/{sessionId}: {
    role: "gm" | "player",
    sessionName: "My Campaign",
    joinTag: "CAMP-1234",
    status: "active" | "archived",
    preferredChatColor: "blue" | "green" | "red" | "yellow",
    joinedAt: timestamp
  },
  
  // Subcollectie: entitlements (premium tiers)
  entitlements/{audience}: {
    audience: "gm" | "player",
    tier: "free" | "premium" | "plus",
    expiresAt: timestamp,
    reason: "purchased" | "redeemed" | "owner-grant"
  },
  
  // Subcollectie: personal notes
  notes/{noteId}: {
    title: "Session Notes",
    content: "Detailed notes...",
    sessionId: "session-ref",
    authorId: currentUid,
    createdAt: timestamp,
    updatedAt: timestamp
  }
}
```

**Doel:** Centraliseren van gebruikersinformatie, lidmaatschappen en premiummeta

---

#### `/sessions/{sessionId}`
```javascript
{
  gmUid: "gm-user-id",
  sessionName: "The Lost Mine",
  joinTag: "MINE-5678",
  
  // Combat state
  combatStatus: "idle" | "active" | "paused",
  currentTurnId: "player-uuid",
  turnRound: 3,
  initiativeOrder: ["player-1", "npc-2", "player-3"],
  
  // Ambience
  ambienceState: {
    trackId: "tavern-ambience",
    isPlaying: true,
    masterVolume: 0.75,
    fadeMs: 500
  },
  
  // Metadata
  createdAt: timestamp,
  updatedAt: timestamp,
  
  // Subcollectie: players (party members)
  players/{playerId}: {
    uid: "player-uuid" | null (for NPCs),
    name: "Character Name",
    avatar: "url-to-image.jpg",
    hp: 45,
    maxHp: 50,
    ac: 16,
    initMod: 3,
    customStats: {
      "spellSlots": 5,
      "sanity": 80
    },
    isNpc: false,
    combatParticipation: "active" | "inactive",
    combatJoinRequestStatus: "pending" | "accepted" | "declined",
    addedAt: timestamp
  },
  
  // Subcollectie: handouts
  handouts/{handoutId}: {
    title: "Map of the Dungeon",
    content: "Detailed description...",
    type: "clue" | "map" | "loot" | "secret",
    isRevealed: true,
    imageUrl: "url-to-image.jpg",
    claimable: true,
    claimedBy: "player-uid" | null,
    secret: true,
    secretContent: "Hidden info",
    createdBy: "gm-uid",
    createdAt: timestamp
  },
  
  // Subcollectie: chat messages
  chat/{messageId}: {
    senderUid: "user-uid",
    senderName: "Player Name",
    text: "roll d20 + 5 for initiative",
    color: "blue" | "green" | "red" | "yellow",
    diceRoll: {
      dice: "d20",
      modifier: 5,
      result: 18
    },
    timestamp: timestamp
  },
  
  // Subcollectie: inventory
  inventory/{itemId}: {
    name: "Sword +1",
    desc: "A magical longsword",
    amount: 2,
    ownerId: "player-uid" | "party",
    category: "Weapon" | "Armor" | "Potion" | "Misc",
    section: "inventory-section-id",
    imageUrl: "url-to-item.jpg",
    addedAt: timestamp
  },
  
  // Subcollectie: custom inventory sections
  inventorySections/{sectionId}: {
    name: "Quest Items",
    order: 1,
    createdAt: timestamp
  },
  
  // Subcollectie: party wallets
  wallets/{walletId}: {
    ownerId: "player-uid" | "party",
    gold: 150,
    silver: 45,
    copper: 23,
    notes: "Party treasury",
    updatedAt: timestamp
  },
  
  // Subcollectie: preparations (character templates)
  preparations/{prepId}: {
    name: "Fighter Template",
    subtitle: "Level 3",
    bio: "A seasoned warrior",
    imageUrl: "url.jpg",
    hp: 30,
    maxHp: 30,
    ac: 18,
    initMod: 1,
    customStats: {...},
    sourceUid: "gm-uid",
    sourceType: "npc" | "player-backup",
    assignedToUid: "player-uid" | null,
    assignmentStatus: "pending" | "accepted" | "rejected" | "ready",
    createdAt: timestamp
  },
  
  // Subcollectie: preparation backups (recovery snapshots)
  preparationBackups/{backupId}: {
    playerUid: "player-uid",
    snapshot: { full player profile object },
    createdAt: timestamp,
    reason: "pre-session-backup" | "recovery"
  }
}
```

**Doel:** Centraliseren van alle sessie-gegevens met real-time listeners

---

### Firestore Security Rules (Beknopte Samenvatting)

```
/admins/{adminId}
  ├─ READ: Only admins
  └─ WRITE: Only admins

/users/{uid}
  ├─ READ: uid == request.auth.uid OR admin
  └─ WRITE: uid == request.auth.uid OR admin

/users/{uid}/memberships/{sessionId}
  ├─ READ: uid == request.auth.uid
  └─ CREATE: uid == request.auth.uid + sessionId exists

/sessions/{sessionId}
  ├─ READ: User in sessionId memberships OR gmUid == request.auth.uid
  ├─ WRITE (GM): gmUid == request.auth.uid
  ├─ WRITE (Player): Limited (e.g., own HP, chat messages)
  └─ DELETE: gmUid == request.auth.uid

/sessions/{sessionId}/handouts/{handoutId}
  ├─ READ: Session member (GM sees all, players see only revealed)
  ├─ CLAIM: Only players can claim claimable, unclaimed loot
  └─ WRITE: GM-only

/sessions/{sessionId}/inventory/{itemId}
  ├─ READ: Session member
  ├─ ADD: GM-only
  └─ MODIFY: Scoped (owner can adjust own amount)

/sessions/{sessionId}/chat/{messageId}
  ├─ READ: Session member
  └─ CREATE: Any authenticated session member
```

---

## Component Structuur

### Componentenhiërarchie

```
App.jsx (Monolitische root, ~3000+ regels)
├─ onAuthStateChanged listener
├─ Global state management (useState hooks)
├─ Firestore listeners setup
└─ Renders: LandingScreen OR DashboardLayout

LandingScreen.jsx
├─ Auth UI (Google, Email, Anoniem, QR)
├─ Recent sessions hub
├─ Geeft: LandingScreen

DashboardLayout
├─ TopBar.jsx
│  ├─ Session name & info
│  ├─ Party toggle button
│  ├─ Ambience controls
│  ├─ Settings menu
│  └─ Share button
│
├─ Sidebar.jsx (Resizable, ~300px)
│  ├─ Tab buttons (Handouts, Chat, Inventory, Prep, Notes)
│  ├─ Slider voor width-aanpassing
│  └─ Geeft: Geselecteerde tab-inhoud
│
├─ RightSidebar.jsx (Party members list)
│  ├─ Player cards
│  │  ├─ Avatar
│  │  ├─ Name, HP/Max HP
│  │  ├─ AC, Initiative Mod
│  │  ├─ Damage Modal trigger
│  │  └─ Combat participation toggle
│  │
│  ├─ Add NPC button
│  └─ Combat start/end buttons
│
└─ Content Area (Tab-based)
   ├─ HandoutsView.jsx
   │  ├─ Filtered handouts (GM sees all, players see revealed)
   │  ├─ Handout cards (title, content, image, claim button)
   │  ├─ HandoutModal.jsx trigger
   │  └─ Claimed vs unclaimed sections
   │
   ├─ ChatView.jsx
   │  ├─ Message list (auto-scroll to bottom)
   │  ├─ Dice roller integration (inline results)
   │  ├─ Chat input field
   │  ├─ Dice parse (e.g., "roll d20 + 5")
   │  └─ Message color per player
   │
   ├─ InventoryView.jsx
   │  ├─ Player selector (dropdown)
   │  ├─ Custom inventory sections
   │  ├─ Item list per section
   │  │  ├─ Item card (name, desc, amount, image)
   │  │  ├─ Amount adjuster
   │  │  └─ Edit/delete buttons
   │  ├─ AddItemModal trigger
   │  └─ Party wallet section (WalletSection.jsx)
   │
   ├─ PreparationsView.jsx (GM-only)
   │  ├─ Character template list
   │  │  ├─ Template cards (name, subtitle, avatar)
   │  │  ├─ Assignment status badges
   │  │  └─ PreparationModal trigger
   │  ├─ AddNpcModal for inline character creation
   │  └─ Player assignment buttons
   │
   └─ NotesView.jsx
      ├─ Personal notes list
      ├─ Note editor (title, content)
      ├─ Delete buttons
      └─ Sync status indicator
```

### Key Components Details

#### **App.jsx** (Root component)
- **Regels:** ~3000+
- **State:** monolitisch (auth, session, players, handouts, chat, combat, ambience, etc.)
- **Firestore listeners:** Real-time sync voor players, handouts, chat, wallets
- **Doel:** Centraal brein van de applicatie

#### **LandingScreen.jsx**
- **Doel:** Auth & session discovery
- **Features:**
  - Google OAuth, Email/password, Anonymous
  - QR code scanning for join
  - Recent sessions list
  - New campaign creation

#### **TopBar.jsx**
- **Doel:** Session-breedte controls
- **Features:**
  - Session name display
  - Party toggle (show/hide right sidebar)
  - Ambience controls (track selector, volume)
  - Settings menu trigger
  - Share button (QR + invite code)

#### **Sidebar.jsx**
- **Doel:** Tab navigation & view selection
- **Features:**
  - Resizable width (localStorage persisted)
  - Tab buttons (Handouts, Chat, Inventory, Prep, Notes)
  - Active tab highlighting
  - Drag-to-resize handle

#### **RightSidebar.jsx**
- **Doel:** Party member display
- **Features:**
  - Player cards (HP, AC, initiative)
  - Damage modal per player
  - Add NPC button
  - Combat participation toggles
  - Combat start/end buttons

#### **ChatView.jsx**
- **Doel:** Session chat
- **Features:**
  - Message list met auto-scroll
  - Inline dice roll parsing
  - Color-coded messages per player
  - Dice roller history

#### **HandoutsView.jsx**
- **Doel:** Handout display & loot claiming
- **Features:**
  - GM sees all, players see only revealed
  - Claim buttons for loot
  - Handout cards met images
  - Modal for creating/editing

#### **InventoryView.jsx**
- **Doel:** Party inventory management
- **Features:**
  - Player selector (dropdown)
  - Custom inventory sections
  - Add/edit/delete items
  - Amount adjustment
  - Wallet/treasury section

#### **PreparationsView.jsx** (GM-only)
- **Doel:** Character template management
- **Features:**
  - Template list met thumbnails
  - Assignment status tracking
  - Assign to player workflow
  - Create new template inline

#### **Modal Components**
- **DamageModal.jsx** - HP adjust (damage/heal/set)
- **SettingsModal.jsx** - Theme, brightness, audio, profile
- **ShareModal.jsx** - QR code & join link generation
- **AddItemModal.jsx** - Inventory item creation
- **AddNpcModal.jsx** - Quick NPC creation
- **HandoutModal.jsx** - Handout creation/editing
- **CharacterProfileModal.jsx** - Player profile editing
- **PreparationModal.jsx** - Template editing
- **PlayerPickerModal.jsx** - Assignment selection
- **PreparationOfferModal.jsx** - Player acceptance UI
- **SessionManageModal.jsx** - Archive/leave options
- **SourcelistModal.jsx** - Audio attribution
- **InitiativeSwapModal.jsx** - Initiative reordering

#### **Utility Components**
- **ModalFrame.jsx** - Reusable modal wrapper
- **EditableStat.jsx** - Inline stat editor
- **RuntimeBadge.jsx** - Dev bootstrap indicator
- **DiceRoller.jsx** - Standalone dice UI
- **DiceRollerSheet.jsx** - Enhanced dice component
- **AmbiencePanel.jsx** - Audio track selector
- **WalletSection.jsx** - Treasury display
- **PlaceholderView.jsx** - Empty state fallback
- **OwnerAdminPanel.jsx** - Owner-only analytics

---

## Bibliotheek en Utility Functies

### `src/lib/` Overzicht

#### **accessPlans.js**
```javascript
// Freemium tier logic
export const PLAN_IDS = {
  GM_FREE: "gm-free",
  GM_PREMIUM: "gm-premium",
  PLAYER_FREE: "player-free",
  PLAYER_PLUS: "player-plus"
};

export function resolveActivePlan(currentEntitlement, role) {
  // Returns: { tier, limits, features }
  // Used throughout app to gate features
}

export function isPremium(entitlement) {
  // Check if user has premium/plus tier
}
```

**Doel:** Centraal beheren van feature-gates en tier-logica

---

#### **ambienceLibrary.js**
```javascript
// Audio track definitions & management
export const AMBIENCE_TRACKS = {
  tavern: { name: "Tavern", path: "audio/tavern.mp3" },
  forest: { name: "Forest", path: "audio/forest.mp3" },
  dungeon: { name: "Dungeon", path: "audio/dungeon.mp3" },
  ocean: { name: "Ocean", path: "audio/ocean.mp3" }
};

export function normalizeAmbienceState(state) {
  // Ensure volume between 0-1, etc.
}

export function clampVolume(value) {
  return Math.max(0, Math.min(1, value));
}
```

**Doel:** Gecentraliseerde audio-metagegevens en helpers

---

#### **battleUtils.js**
```javascript
// Combat state & initiative calculations
export function getInitiativeTotal(player, initMod) {
  return (Math.random() * 20) + 1 + (initMod || 0);
}

export function sortByInitiative(players) {
  return [...players].sort((a, b) => 
    b.initiative - a.initiative
  );
}

export function getCurrentTurn(initiativeOrder, currentTurnId) {
  return initiativeOrder.indexOf(currentTurnId);
}

export function getTurnsUntilMember(members, currentId, playerId) {
  const currentIdx = members.indexOf(currentId);
  const memberIdx = members.indexOf(playerId);
  return (memberIdx - currentIdx + members.length) % members.length;
}
```

**Doel:** Combat-gerelateerde berekeningen en state management

---

#### **battleConditions.js**
```javascript
// Status effects & conditions
export const CONDITIONS = {
  INCAPACITATED: "incapacitated",
  PRONE: "prone",
  STUNNED: "stunned"
};

export function applyCondition(player, condition) {
  // Add condition to player
}

export function removeCondition(player, condition) {
  // Remove condition from player
}
```

**Doel:** Status effect management

---

#### **browserStorage.js**
```javascript
// Safe localStorage/sessionStorage wrappers
export function getFromStorage(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.warn("Storage quota exceeded");
  }
}
```

**Doel:** Veilige browser storage met fallbacks

---

#### **chatUtils.js**
```javascript
// Chat message parsing & helpers
export function parseChatMessage(text) {
  const diceMatch = text.match(/roll\s*d(\d+)\s*(?:\+\s*(\d+))?/i);
  if (diceMatch) {
    const dice = `d${diceMatch[1]}`;
    const modifier = parseInt(diceMatch[2]) || 0;
    const result = Math.floor(Math.random() * parseInt(diceMatch[1])) + 1 + modifier;
    return { dice, modifier, result };
  }
  return null;
}

export function formatChatMessage(message) {
  // Returns formatted HTML for display
}
```

**Doel:** Chat parsing en formatting

---

#### **handoutUtils.js**
```javascript
// Handout type detection & icons
export function getHandoutIcon(type) {
  const icons = {
    clue: "MapPin",
    map: "Map",
    loot: "Gift",
    secret: "Lock"
  };
  return icons[type] || "FileText";
}

export function getHandoutTypeLabel(type) {
  // Human-readable labels
}
```

**Doel:** Handout presentatie helpers

---

#### **placeholders.js**
```javascript
// Deterministic avatar generation
export function getPlaceholderAvatarForUser(uid) {
  // Generates deterministic colorful avatar based on UID
  // Fallback als user geen avatar uploaded
}

export function getPlaceholderForPlayer(playerId) {
  // NPC/player placeholder images
}
```

**Doel:** Consistente placeholder avatar generation

---

#### **playerArchivePdf.js**
```javascript
// PDF export helpers
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function generateSessionArchivePdf(sessionData, playerName) {
  const doc = new jsPDF();
  // Add session header, chat log, loot claimed, etc.
  doc.save(`${sessionData.sessionName}-${playerName}.pdf`);
}
```

**Doel:** Session archive PDF generation

---

#### **premiumUtils.js**
```javascript
// Premium feature checks (wraps accessPlans)
export function canCreateUnlimitedNpcs(entitlement) {
  return entitlement?.tier === "premium";
}

export function canExportPdf(role, entitlement) {
  return role === "player" && entitlement?.tier === "plus"
      || role === "gm" && entitlement?.tier === "premium";
}
```

**Doel:** Specifieke premium-gate helpers

---

#### **runtimeContext.js**
```javascript
// Dev bootstrap detection
export function isDevBootstrapMode() {
  const key = import.meta.env.VITE_DEV_BOOTSTRAP_KEY;
  return !!key && sessionStorage.getItem("dev-bootstrap-enabled");
}

export function getBootstrapSession() {
  // Injects mock session for local dev
}
```

**Doel:** Development bypass voor snelle testing

---

#### **sessionUtils.js**
```javascript
// Session helpers
export function generateUniqueJoinTag() {
  // Creates session-unique invite code (e.g., "CAMP-5678")
}

export function getJoinTagVariants(tag) {
  // Creates search variants for flexible matching
}

export function buildSessionInviteUrl(tag, qr = false) {
  // Builds shareable session URL
}
```

**Doel:** Session creatie en join helpers

---

## Verificatie en Toestemmingen

### Authenticatieflow

```
┌─────────────────────────────────────┐
│  User lands on landing page         │
│  (no auth or expired)               │
└──────────────┬──────────────────────┘
               ↓
    ┌──────────────────────┐
    │ Choose login method:  │
    │ • Google OAuth       │
    │ • Email/Password     │
    │ • Anonymous          │
    │ • QR Code Join       │
    └──────────┬───────────┘
               ↓
    ┌──────────────────────────────────┐
    │ Firebase Auth.signIn()           │
    │ + persistence strategy           │
    │ (IndexedDB → LocalStorage → ...) │
    └──────────┬───────────────────────┘
               ↓
    ┌──────────────────────────────────┐
    │ onAuthStateChanged listener      │
    │ Detects auth state change        │
    │ Populates currentUser            │
    └──────────┬───────────────────────┘
               ↓
    ┌──────────────────────────────────┐
    │ Query /users/{uid}               │
    │ Query /users/{uid}/memberships   │
    │ Query entitlements               │
    └──────────┬───────────────────────┘
               ↓
    ┌──────────────────────────────────┐
    │ Populate: currentUser,           │
    │           activeSessions,        │
    │           entitlements           │
    └──────────┬───────────────────────┘
               ↓
    ┌──────────────────────────────────┐
    │ App renders Dashboard with       │
    │ active session + real-time       │
    │ listeners                        │
    └──────────────────────────────────┘
```

### Toestemmingslagen

#### Laag 1: Firebase Authentication
- **Implementatie:** Firebase Auth SDK
- **Providers:** Google, Email, Anonymous
- **Tokens:** Auto-vernieuwd
- **Persistence:** IndexedDB → LocalStorage → SessionStorage → InMemory

#### Laag 2: Firestore Security Rules
- **Server-side enforcement** van read/write rechten
- **UID-based checks** - Is this user who they claim?
- **Role-based checks** - Is user a GM or player?
- **Session membership** - Is user a member of this session?

#### Laag 3: UI-level Role Gates
- **Component-level checks** met `if (isGm) render(<GMOnlyPanel />)`
- **Feature-level flags** via premiumUtils
- **Modal visibility** gebaseerd op role

#### Laag 4: Bedrijfslogica in Backend Rules

```javascript
// Voorbeeld: Handout claiming (Firestore rules)
match /sessions/{sessionId}/handouts/{handoutId} {
  // Only players can claim unclaimed loot
  allow create: if request.auth.uid != null
             && resource.data.claimable == true
             && resource.data.claimedBy == null
             && !('secret' in resource.data);
  
  // GM always has full access
  allow read, write, delete: if isGm(sessionId);
}

function isGm(sessionId) {
  let doc = get(/databases/$(database)/documents/sessions/$(sessionId));
  return doc.data.gmUid == request.auth.uid;
}
```

### Rol Definities

#### **GM (Game Master)**
- Volledige lees-/schrijftoegang tot sessiedata
- Kan handouts maken/wijzigen
- Kan party members toevoegen/verwijderen
- Kan combatinitiator starten/stoppen
- Kan NPC's maken (tot 5 Free, onbeperkt Premium)
- Kan character templates opslaan/toewijzen
- Zie alle chat berichten, handouts, inventaris

#### **Player**
- Lees-toegang tot meeste sessiedata
- Kan eigen karakter-profiel aanpassen
- Kan buit claimen (wanneer GM toestaat)
- Kan berichten in chat sturen
- Kan eigen inventaris zien
- Kan handouts zien (alleen revealed)
- Kan eigen notities maken
- Beperkte schrijftoegang (scoped per Firestore rules)

#### **Owner** (Eigenaar van TomeVault)
- Admin panel access (`/owner-admin`)
- Kan gebruikers manueel upgraden naar Premium
- Kan redemption codes genereren
- Analytics en gebruiker search
- Zie alle sessies (admin bypass)

---

## Gebruikersworkflows

### Workflow 1: Sessie Creatie (GM)

```
┌──────────────────────────────────┐
│ 1. GM klikt "Nieuwe Kampagne"    │
└────────────┬─────────────────────┘
             ↓
┌──────────────────────────────────┐
│ 2. Modal met sessienaam          │
│    GM voert "The Lost Mine" in   │
└────────────┬─────────────────────┘
             ↓
┌──────────────────────────────────┐
│ 3. Code generatie:               │
│    generateUniqueJoinTag()        │
│    Resulteert in: "MINE-5678"    │
└────────────┬─────────────────────┘
             ↓
┌──────────────────────────────────┐
│ 4. Firestore write:              │
│    /sessions/{newSessionId}      │
│    gmUid, sessionName, joinTag   │
└────────────┬─────────────────────┘
             ↓
┌──────────────────────────────────┐
│ 5. User membership write:        │
│    /users/{gmUid}/memberships    │
│    /{newSessionId}               │
└────────────┬─────────────────────┘
             ↓
┌──────────────────────────────────┐
│ 6. Dashboard renders met         │
│    lege party, chat, handouts    │
└────────────┬─────────────────────┘
             ↓
┌──────────────────────────────────┐
│ 7. GM klikt "Delen"              │
│    QR code + "MINE-5678" text    │
└────────────┬─────────────────────┘
             ↓
┌──────────────────────────────────┐
│ Sessie gereed voor spelers       │
└──────────────────────────────────┘
```

### Workflow 2: Speler Join via QR (Player)

```
┌──────────────────────────────────┐
│ 1. Speler opent TomeVault        │
│    Ziet landing page             │
└────────────┬─────────────────────┘
             ↓
┌──────────────────────────────────┐
│ 2. Klikt "QR-code scannen"       │
│    Browser vraagt camera         │
└────────────┬─────────────────────┘
             ↓
┌──────────────────────────────────┐
│ 3. Camera scant GM QR-code       │
│    Extraheert: joinTag="MINE-1234│
└────────────┬─────────────────────┘
             ↓
┌──────────────────────────────────┐
│ 4. App zoekt sessie:             │
│    Firestore query:              │
│    joinTag == "MINE-1234"        │
└────────────┬─────────────────────┘
             ↓
┌──────────────────────────────────┐
│ 5. Match gevonden: sessionId     │
│    Redirect naar join modal      │
└────────────┬─────────────────────┘
             ↓
┌──────────────────────────────────┐
│ 6. Speler voert naam in          │
│    Klikt "Toetreden"             │
└────────────┬─────────────────────┘
             ↓
┌──────────────────────────────────┐
│ 7. Write membership:             │
│    /users/{playerUid}            │
│    /memberships/{sessionId}      │
│    role: "player"                │
└────────────┬─────────────────────┘
             ↓
┌──────────────────────────────────┐
│ 8. Create player in party:       │
│    /sessions/{sessionId}         │
│    /players/{playerUid}          │
│    name, avatar, hp, etc.        │
└────────────┬─────────────────────┘
             ↓
┌──────────────────────────────────┐
│ 9. Speler dashboard              │
│    Real-time listeners active    │
└────────────┬─────────────────────┘
             ↓
┌──────────────────────────────────┐
│ GM ziet speler verschijnen       │
│ in party list (real-time)        │
└──────────────────────────────────┘
```

### Workflow 3: Combat Tracker Flow

```
┌──────────────────────────────────┐
│ 1. GM klikt "Start Combat"       │
│    RightSidebar knop             │
└────────────┬─────────────────────┘
             ↓
┌──────────────────────────────────┐
│ 2. Initiative roll modal          │
│    GM ziet: party members met    │
│    initiative modifiers           │
└────────────┬─────────────────────┘
             ↓
┌──────────────────────────────────┐
│ 3. App berekent:                 │
│    getInitiativeTotal() voor elk │
│    d20 + modifiers               │
└────────────┬─────────────────────┘
             ↓
┌──────────────────────────────────┐
│ 4. Firestore write:              │
│    combatStatus: "active"        │
│    initiativeOrder: [sorted UIDs]│
│    currentTurnId: first UID      │
│    turnRound: 1                  │
└────────────┬─────────────────────┘
             ↓
┌──────────────────────────────────┐
│ 5. RightSidebar highlight        │
│    Toon huidige beurt in vet     │
│    Toon "je beurt in 2"          │
└────────────┬─────────────────────┘
             ↓
┌──────────────────────────────────┐
│ 6. GM bewerkt HP via             │
│    DamageModal (speler kaart)    │
│    Klik "-5 HP" knop             │
└────────────┬─────────────────────┘
             ↓
┌──────────────────────────────────┐
│ 7. Write player HP:              │
│    /sessions/{id}/players/{uid}  │
│    hp: 40 (van 45)               │
└────────────┬─────────────────────┘
             ↓
┌──────────────────────────────────┐
│ 8. Listeners trigger             │
│    Alle clients zien nieuw HP    │
│    Real-time sync                │
└────────────┬─────────────────────┘
             ↓
┌──────────────────────────────────┐
│ 9. GM klikt "Next Turn"          │
│    (TopBar of RightSidebar)      │
└────────────┬─────────────────────┘
             ↓
┌──────────────────────────────────┐
│ 10. Berekening:                  │
│    Volgende UID in order         │
│    Firestore update:             │
│    currentTurnId: newUID         │
│    turnRound++                   │
└────────────┬─────────────────────┘
             ↓
┌──────────────────────────────────┐
│ 11. Spelers ontvangen alert      │
│    "Je beurt!"                   │
│    RightSidebar highlight updated│
└────────────┬─────────────────────┘
             ↓
┌──────────────────────────────────┐
│ 12. Herhaal 9-11 totdat          │
│    GM klikt "End Combat"         │
│    combatStatus: "idle"          │
└──────────────────────────────────┘
```

### Workflow 4: Handout Claiming

```
┌────────────────────────────────────┐
│ 1. GM klikt "Handouts" tab         │
│    Toont alle handouts             │
└────────────┬────────────────────────┘
             ↓
┌────────────────────────────────────┐
│ 2. GM maakt handout:               │
│    HandoutModal:                   │
│    title: "Treasure Map"           │
│    type: "loot"                    │
│    claimable: true                 │
│    content: "A map showing..."     │
└────────────┬────────────────────────┘
             ↓
┌────────────────────────────────────┐
│ 3. Write handout:                  │
│    /sessions/{id}/handouts/{newId} │
│    claimable: true,                │
│    claimedBy: null                 │
└────────────┬────────────────────────┘
             ↓
┌────────────────────────────────────┐
│ 4. Listeners sync                  │
│    Alle spelers zien handout       │
│    "Claim" knop beschikbaar        │
└────────────┬────────────────────────┘
             ↓
┌────────────────────────────────────┐
│ 5. Speler klikt "Claim"            │
│    HandoutsView component          │
└────────────┬────────────────────────┘
             ↓
┌────────────────────────────────────┐
│ 6. Firestore rule check:           │
│    Is handout claimable? ✓         │
│    Is handout unclaimed? ✓         │
│    Is user authenticated? ✓        │
└────────────┬────────────────────────┘
             ↓
┌────────────────────────────────────┐
│ 7. Write: claimedBy = playerUid    │
│    /sessions/{id}/handouts/{id}    │
│    claimedBy: playerUid            │
└────────────┬────────────────────────┘
             ↓
┌────────────────────────────────────┐
│ 8. Listeners update:               │
│    Handout moves naar "Claimed"    │
│    section van die speler          │
│    GM ziet ook wie claiman         │
└────────────┬────────────────────────┘
             ↓
┌────────────────────────────────────┐
│ Workflow compleet                  │
└────────────────────────────────────┘
```

---

## UI Design en Theming

### Design Filosofie

**North Star:** *Moderne donkere fantasy SaaS - professioneel en atmosferisch, niet game-achtig*

### Theme System

#### Beschikbare Themes
1. **Purple** (default) - Mystiek, elegant
2. **Amber** - Warm, tavern-achtig
3. **Green** - Natuur, forest-achtig
4. **Light** - Hell, minimalistisch

#### Theme Token Mapping
```javascript
// Voorbeeld: Purple theme
{
  primary: "#a855f7",      // Paars
  secondary: "#ec4899",    // Roze
  accent: "#06b6d4",       // Cyan
  bg: "#0f172a",           // Dark navy
  bgLight: "#1e293b",      // Lighter navy
  text: "#e2e8f0",         // Wit-grijs
  border: "#334155"        // Grijs border
}
```

#### Brightness Control
- **Scale:** 0–4 (5 levels)
- **Effect:** Controleert overlay opacity
- **Implementatie:** CSS variable `--brightness: var(--brightness-level)`
- **Persistentie:** localStorage

### Component Styling Guidelines

#### TopBar
- Sticky positie (top: 0)
- Gradient background met theme color
- Flexbox row layout
- Buttons met hover-state transitions (200ms ease-out)

#### Sidebar
- Fixed width of resizable (default 300px)
- Scrollable content
- Tab buttons met active state highlighting
- Drag handle for resize (z-index layering)

#### Modal Frame
```javascript
// Shared modal structure
<ModalFrame 
  title="Title"
  icon={IconComponent}
  accentColor="theme-primary"
  onClose={handleClose}
>
  {/* Modal content */}
</ModalFrame>
```

#### Cards (Handouts, Items, etc.)
- Border: 1px solid theme-primary / 20 opacity
- Hover: Scale 1.02 + shadow-lg
- Transition: 150ms ease-out
- Padding: 16px (1rem)

#### Typography
- **Sans-serif (primary):** For navigation, labels, body
- **Fantasy serif (accents):** For session name, numbers, titles
- **Font sizes:**
  - Title: 28px (1.75rem, font-bold)
  - Heading: 18px (1.125rem, font-semibold)
  - Body: 14px (0.875rem, regular)
  - Small: 12px (0.75rem, light)

### Color Palette (Example: Purple)

```
┌─────────────────────────────────────┐
│ Primary: #a855f7 (Lucent Purple)    │ Used for buttons, borders, highlights
├─────────────────────────────────────┤
│ Secondary: #ec4899 (Pink)           │ Accent gradients, hover states
├─────────────────────────────────────┤
│ Accent: #06b6d4 (Cyan)              │ Interactive elements
├─────────────────────────────────────┤
│ Background: #0f172a (Dark Navy)     │ Page background
├─────────────────────────────────────┤
│ Surface: #1e293b (Lighter Navy)     │ Cards, panels
├─────────────────────────────────────┤
│ Text: #e2e8f0 (Off White)           │ Primary text
├─────────────────────────────────────┤
│ Muted: #94a3b8 (Gray)               │ Secondary text
├─────────────────────────────────────┤
│ Success: #22c55e (Green)            │ Positive actions
├─────────────────────────────────────┤
│ Error: #ef4444 (Red)                │ Destructive actions
└─────────────────────────────────────┘
```

### Responsive Design

```
Mobile (< 640px)
├─ Sidebar hidden by default (toggle via menu)
├─ RightSidebar als bottom sheet or modal
├─ TopBar buttons stacked or icons-only
└─ Full-width modals

Tablet (640px - 1024px)
├─ Sidebar visible (200px fixed)
├─ RightSidebar visible (250px)
├─ Optimized touch targets
└─ Adjusted font sizes

Desktop (> 1024px)
├─ Sidebar resizable (300px default)
├─ RightSidebar resizable (300px)
├─ Full-size modals (max-width: 600px)
└─ Normal font sizes
```

---

## Freemium Bedrijfsmodel

### Tier Structuur

#### **GM Free Tier**
- ✓ Onbeperkte sessies
- ✓ Tot 5 NPC's
- ✓ Tot 3 character templates
- ✓ Text-only export (session log)
- ✗ Custom themes (paars alleen)
- ✗ Onbeperkte NPC's
- ✗ PDF export
- **Prijs:** Gratis

#### **GM Premium Tier**
- ✓ Alles uit Free +
- ✓ Onbeperkte NPC's
- ✓ Onbeperkte character templates
- ✓ PDF archive export
- ✓ Custom themes (4 beschikbaar)
- ✓ Campaign history/logs
- ✓ Priority support
- **Prijs:** €4.99/maand of €49.99/jaar

#### **Player Free Tier**
- ✓ Onbeperkt sessies joinen
- ✓ Chat, inventory, handouts
- ✓ Personal notes
- ✗ PDF export
- ✗ Custom themes
- **Prijs:** Gratis

#### **Player Plus Tier**
- ✓ Alles uit Free +
- ✓ PDF export van eigen records
- ✓ Custom player themes
- ✓ Cross-campaign character vault (512 MB)
- ✓ Personal media storage
- **Prijs:** €2.99/maand of €29.99/jaar

### Tier Gating Implementatie

```javascript
// accessPlans.js
export const PLAN_LIMITS = {
  "gm-free": {
    maxNpcs: 5,
    maxPreparations: 3,
    features: {
      unlimitedNpcs: false,
      pdfExport: false,
      customThemes: false
    }
  },
  "gm-premium": {
    maxNpcs: Infinity,
    maxPreparations: Infinity,
    features: {
      unlimitedNpcs: true,
      pdfExport: true,
      customThemes: true
    }
  },
  // ... etc
};

// Component usage
function AddNpcButton() {
  const entitlement = useContext(EntitlementContext);
  const plan = resolveActivePlan(entitlement, "gm");
  const atLimit = npcCount >= plan.maxNpcs;
  
  if (atLimit && !plan.features.unlimitedNpcs) {
    return <UpgradePrompt feature="Unlimited NPCs" tier="Premium" />;
  }
  
  return <Button onClick={handleAddNpc}>Add NPC</Button>;
}
```

### Monetisatie Kanalen

1. **Direct Subscription** (Stripe)
   - Monthly of annual billing
   - Auto-renewal with cancel option
   - Issued entitlements in Firestore

2. **Redemption Codes** (Owner generates)
   - Owner panel generates 30-day codes
   - Users redeem in-app for trial/gifted tier
   - Stored in entitlements

3. **Freemium Conversion** (Viral loop)
   - Players can join 1 session free
   - When want more sessions → upgrade
   - GM can create 1 campaign free (more → Premium)

### Business Logic

#### Premium Feature Gates

```javascript
// Voorbeeld: PDF export
export function canExportPdf(role, entitlement) {
  if (role === "gm") {
    return entitlement?.tier === "premium";
  }
  if (role === "player") {
    return entitlement?.tier === "plus";
  }
  return false;
}

// Component usage
<button 
  disabled={!canExportPdf(currentRole, entitlements)}
  onClick={handleExportPdf}
>
  Export to PDF
  {!canExportPdf(currentRole, entitlements) && (
    <UpgradeHint>Only Premium/Plus</UpgradeHint>
  )}
</button>
```

#### Upgrade Prompts

- **Soft prompts:** "Upgrade to Premium for unlimited NPCs"
- **Hard limits:** Can't add 6th NPC without upgrade
- **Trial offer:** "Try Premium for 7 days free"

---

## Build, Deploy en Configuratie

### Build Process

```bash
# Development
npm run dev           # Vite dev server (localhost:5173)

# Production Build
npm run build         # Output to dist/

# Preview production build locally
npm run preview       # Preview dist/ locally
```

### Vite Configuration

```javascript
// vite.config.js
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default {
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2020',
    minify: 'terser',
    sourcemap: false
  },
  server: {
    port: 5173,
    host: 'localhost'
  }
};
```

### Firebase Hosting Config

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css|woff|woff2|eot|ttf|otf|svg)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "index.html",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=0, must-revalidate"
          },
          {
            "key": "Cross-Origin-Opener-Policy",
            "value": "same-origin"
          }
        ]
      }
    ]
  }
}
```

### Deployment

```bash
# Build
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting

# Or deploy everything (functions, firestore rules, etc.)
firebase deploy
```

### Environment Variables

```
# .env (local dev — copy from .env.example, never commit)
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
VITE_PUBLIC_APP_ORIGIN=https://your-project.web.app
```

### Configuratiebestanden

| File | Purpose |
|------|---------|
| [firebase.json](firebase.json) | Hosting rewrites, headers, cache |
| [firestore.rules](firestore.rules) | Database security rules |
| [firestore.indexes.json](firestore.indexes.json) | Composite indexes |
| [storage.rules](storage.rules) | Storage bucket security |
| [.firebaserc](.firebaserc) | Project alias mapping |
| [package.json](package.json) | Dependencies & build scripts |
| [vite.config.js](vite.config.js) | Vite build configuration |
| [index.html](index.html) | SPA entry point |

---

## Huidige Implementatiepatronen

### State Management

**Pattern:** Monolitisch in App.jsx via React hooks

```javascript
// App.jsx
function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Session state
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  
  // Party state
  const [partyMembers, setPartyMembers] = useState([]);
  const [combatStatus, setCombatStatus] = useState("idle");
  
  // UI state
  const [selectedTab, setSelectedTab] = useState("handouts");
  const [theme, setTheme] = useState(getFromStorage("tv_theme", "purple"));
  
  // Firestore listeners
  useEffect(() => {
    const unsubscribe = db.collection("sessions")
      .doc(activeSessionId)
      .collection("players")
      .onSnapshot(snapshot => {
        setPartyMembers(snapshot.docs.map(doc => doc.data()));
      });
    
    return unsubscribe;
  }, [activeSessionId]);
  
  return (
    // JSX that uses all the above state
  );
}
```

**Voordelen:**
- Directe state access, geen prop drilling
- Easy debugging (alles op één plek)
- Real-time sync met listeners

**Nadelen:**
- Grote component (~3000 lines)
- Moeilijk om over te dragen aan ander team
- Kan langzaam worden met veel listeners

### Real-Time Listeners Pattern

```javascript
// Setup in useEffect
useEffect(() => {
  const unsub1 = db.collection("sessions").doc(sessionId)
    .collection("players").onSnapshot(snapshot => {
      setPartyMembers(snapshot.docs.map(doc => doc.data()));
    });
  
  const unsub2 = db.collection("sessions").doc(sessionId)
    .collection("chat").orderBy("timestamp").onSnapshot(snapshot => {
      setChatMessages(snapshot.docs.map(doc => doc.data()));
    });
  
  // Cleanup
  return () => {
    unsub1();
    unsub2();
  };
}, [sessionId]);
```

### Optimistic Updates Pattern

```javascript
// User interacts
function handleAddItem(item) {
  // 1. Update local state immediately (optimistic)
  setInventory([...inventory, { ...item, id: tempId }]);
  
  // 2. Write to Firestore
  db.collection("sessions").doc(sessionId)
    .collection("inventory").add(item)
    .then(docRef => {
      // 3. On success, replace temp ID with real ID
      setInventory(inv => inv.map(i => 
        i.id === tempId ? { ...i, id: docRef.id } : i
      ));
    })
    .catch(() => {
      // 4. On error, revert optimistic change
      setInventory(inv => inv.filter(i => i.id !== tempId));
    });
}
```

### Naming Conventions

- **Dutch UI labels:** "Partychat", "Schatkamer", "Gevecht", "Voorbereiding"
- **Component names:** PascalCase (`CharacterProfileModal.jsx`)
- **Util functions:** camelCase (`generateUniqueJoinTag()`)
- **Variables:** camelCase (`currentUser`, `sessionData`)
- **Firestore fields:** snake_case (`createdAt`, `gmUid`)
- **Constants:** UPPER_SNAKE_CASE (`PLAN_IDS.GM_PREMIUM`)

### Error Handling Patterns

```javascript
try {
  await db.collection("sessions").doc(sessionId).update({
    combatStatus: "active"
  });
} catch (error) {
  if (error.code === "permission-denied") {
    // User not GM
    alert("Alleen GM's kunnen gevecht starten");
  } else if (error.code === "not-found") {
    // Session deleted
    alert("Sessie niet gevonden");
  } else {
    console.error(error);
    alert("Fout bij het starten van gevecht");
  }
}
```

### Browser Storage Patterns

```javascript
// Safe get/set
const theme = getFromStorage("tv_theme", "purple");
saveToStorage("tv_theme", "amber");

// Session-specific
const activeSessId = sessionStorage.getItem("tomevault:active-session:v1");

// Persistent (cross-session)
localStorage.setItem("tomevault.sidebarWidth", "350");
```

---

## Conclusie

TomeVault is een **volledige, produktiegroote webapplicatie** voor TTRPG-sessiebeheer met:

- **Frontend:** React + Vite + TailwindCSS
- **Backend:** Firebase (Auth, Firestore, Storage, Hosting)
- **Data Model:** Genormaliseerde Firestore collections met real-time listeners
- **Architecture:** Monolitische App.jsx met state hooks + component tree
- **Features:** Sessie-creatie, party management, chat, inventory, combat tracking, handouts, preparations
- **Monetisatie:** Freemium model (Free/Premium voor GMs, Free/Plus voor Players)
- **UI:** Donkere fantasy SaaS design met 4 themes + brightness control
- **Security:** Firestore rules enforce access control

Dit verslag biedt alle informatie die nodig is om het project volledig te begrijpen, aan te passen, uit te breiden, of over te dragen aan ander team.

---

**Versie:** 1.0  
**Datum:** May 20, 2026  
**Auteur:** Codebase Analysis  
**Gericht voor:** NotebookLM & AI-systemen

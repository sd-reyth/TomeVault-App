import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getItemCategoryLabel } from './itemCategories';
import { formatCustomStatValue } from './statModifiers';
import {
  PDF_LAYOUT,
  PDF_LIMITS,
  PDF_THEME,
  PdfLayoutEngine,
  addFooterToAllPages,
  applyPdfTheme,
  asString,
  drawCover,
  drawMetricStrip,
  drawStoryCard,
  drawTableOfContents,
  formatDateShort,
  loadCoverBrandAssets,
  tableBaseOptions,
} from './pdfTheme';

function formatChatMomentLabel(msg) {
  const date = asString(msg?.date, '');
  const time = asString(msg?.time, '');

  if (date && time) return `${date} ${time}`;
  if (date) return date;
  if (time) return time;
  return '-';
}

const SECTION_DESCRIPTIONS = {
  'Karakterprofiel': 'Profiel, stats en custom waarden',
  'GM Overzicht': 'Sessie-dashboard en kernstatistieken',
  'Reislog': 'Persoonlijke notities en reisherinneringen',
  'Inventaris': 'Items, categorieën en notities',
  'Wallet': 'Munten en bezittingen',
  'Wallet Overzicht (Party)': 'Party-brede geldmiddelen',
  'Ontdekte Handouts': 'Zichtbare ontdekkingen en lore',
  'Chat Kroniek': 'Recente berichten en worpen',
  'Party Roster': 'Spelers en NPC\'s in de sessie',
  'Voorbereidingenbibliotheek': 'Toegewezen voorbereidingen',
  'Herstelpunten': 'Back-ups en herstelmomenten',
};

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {PdfLayoutEngine} layout
 * @param {object} options
 */
function drawTable(doc, layout, options) {
  const startY = layout.cursorY;
  autoTable(doc, {
    startY,
    ...tableBaseOptions(),
    ...options,
    willDrawPage: () => {
      const page = doc.getNumberOfPages();
      if (!layout.isCoverPage(page) && !layout.isTocPage(page)) {
        layout.drawPageBackground();
      }
    },
  });
  layout.cursorY = (doc.lastAutoTable?.finalY || startY) + PDF_LAYOUT.sectionGap;
  return layout.cursorY;
}

/**
 * @param {PdfLayoutEngine} layout
 * @param {string} title
 * @param {string} subtitle
 */
function startSection(layout, title, subtitle = '') {
  const description = SECTION_DESCRIPTIONS[title] || '';
  return layout.startSection(title, subtitle, description);
}

/**
 * @param {PdfLayoutEngine} layout
 * @param {object} profile
 * @param {object} archive
 */
function renderProfileSection(layout, profile, archive) {
  const doc = layout.doc;
  const subtitle = archive.mode === 'gm'
    ? 'Complete snapshot van het huidige geselecteerde karakter'
    : 'Persoonlijke status op exportmoment';

  startSection(layout, 'Karakterprofiel', subtitle);

  const hp = `${Number(profile.hp ?? 0)}/${Number(profile.maxHp ?? profile.hp ?? 0)}`;
  layout.cursorY = layout.ensureSpace(60);
  layout.cursorY += drawMetricStrip(
    doc,
    layout.cursorY,
    [
      { label: 'HP', value: hp },
      { label: 'AC', value: String(Number(profile.ac ?? 10)) },
      { label: 'Init', value: String(Number(profile.initMod ?? 0)) },
    ],
    layout.contentWidth,
  ) + PDF_LAYOUT.blockGap;

  const statRows = [
    ['Naam', asString(profile.name, archive.subjectName || 'Onbekend')],
    ['Titel', asString(profile.subtitle, '-')],
  ].concat((profile.customStats || []).map((entry) => [
    asString(entry?.name, 'STAT'),
    formatCustomStatValue(entry),
  ]));

  drawTable(doc, layout, {
    head: [['Veld', 'Waarde']],
    body: statRows,
    theme: 'grid',
  });

  layout.renderCallout(
    archive.mode === 'gm'
      ? [
          'Deze export draait in GM-modus en bevat uitgebreide sessie-inzichten naast spelersdata.',
          'Gebruik dit document als operationele kroniek en audittrail voor voorbereiding en narratieve continuïteit.',
        ]
      : [
          'Dit document bundelt jouw reis als speler: profiel, bezittingen, zichtbare handouts en je recente kroniek.',
          'Gebruik het als persoonlijke archive, recap of als overgangsdossier bij character death-events.',
        ],
  );
}

/**
 * @param {PdfLayoutEngine} layout
 * @param {object} archive
 */
function renderGmOverview(layout, archive) {
  if (archive.mode !== 'gm' || !archive.gmData) return;

  const gm = archive.gmData;
  startSection(layout, 'GM Overzicht', 'Sessie-breed kernbeeld');

  const doc = layout.doc;
  layout.cursorY = layout.ensureSpace(60);
  layout.cursorY += drawMetricStrip(
    doc,
    layout.cursorY,
    [
      { label: 'Combat', value: asString(gm.combatStatus, 'idle') },
      { label: 'Ronde', value: String(Number(gm.turnRound ?? 1)) },
      { label: 'Party', value: String((gm.party || []).length) },
      { label: 'Handouts', value: String((gm.handouts || []).length) },
    ],
    layout.contentWidth,
  ) + PDF_LAYOUT.blockGap;

  drawTable(doc, layout, {
    head: [['Onderdeel', 'Waarde']],
    body: [
      ['Combat status', asString(gm.combatStatus, 'idle')],
      ['Huidige ronde', String(Number(gm.turnRound ?? 1))],
      ['Party leden', String((gm.party || []).length)],
      ['Handouts totaal', String((gm.handouts || []).length)],
      ['Voorbereidingen', String((gm.preparations || []).length)],
      ['Backups', String((gm.preparationBackups || []).length)],
      ['Chat berichten (recent)', String((archive.chat || []).length)],
    ],
    theme: 'grid',
  });
}

/**
 * @param {PdfLayoutEngine} layout
 * @param {object} archive
 */
function renderNotesSection(layout, archive) {
  const notes = Array.isArray(archive.notes) ? archive.notes : [];
  const limit = archive.mode === 'gm' ? PDF_LIMITS.notesGm : PDF_LIMITS.notesPlayer;

  startSection(layout, 'Reislog', `${notes.length} notities`);

  if (notes.length === 0) {
    layout.drawEmptyState('Nog geen reisnotities vastgelegd in deze export.');
    return;
  }

  const doc = layout.doc;
  notes.slice(0, limit).forEach((note, index) => {
    const bodyText = asString(note.content, '-').replace(/\s+/g, ' ') || '-';
    const wrapped = doc.splitTextToSize(bodyText, layout.contentWidth - 28).slice(0, PDF_LIMITS.noteExcerptLines);
    const estimatedHeight = Math.max(58, 36 + (wrapped.length * 12) + (note.lastEdited ? 10 : 0));
    layout.cursorY = layout.ensureSpace(estimatedHeight + 12);
    const cardHeight = drawStoryCard(
      doc,
      layout.cursorY,
      {
        title: `${index + 1}. ${asString(note.title, 'Naamloze notitie')}`,
        meta: note.lastEdited ? `Laatst bewerkt: ${formatDateShort(note.lastEdited)}` : undefined,
        body: asString(note.content, '-') || '-',
      },
      layout.contentWidth,
    );
    layout.cursorY += cardHeight + 10;
  });

  layout.drawTruncationNotice('notities', Math.min(notes.length, limit), notes.length);
}

/**
 * @param {PdfLayoutEngine} layout
 * @param {object} archive
 */
function renderInventorySection(layout, archive) {
  const inventoryRows = (archive.inventory || []).map((item) => [
    asString(item.name, 'Onbekend item'),
    String(Number(item.amount ?? 1)),
    asString(item.ownerName || item.ownerId || '-', '-'),
    getItemCategoryLabel(item.category),
    asString(item.desc, '-'),
  ]);

  startSection(layout, 'Inventaris', `${inventoryRows.length} items`);

  if (inventoryRows.length === 0) {
    layout.drawEmptyState('Geen items vastgelegd in bezit.');
    return;
  }

  drawTable(layout.doc, layout, {
    head: [['Item', 'Aantal', 'Eigenaar', 'Categorie', 'Notitie']],
    body: inventoryRows,
    theme: 'striped',
    columnStyles: {
      0: { cellWidth: 110 },
      1: { cellWidth: 45 },
      2: { cellWidth: 95 },
      3: { cellWidth: 75 },
      4: { cellWidth: 'auto' },
    },
  });
}

/**
 * @param {PdfLayoutEngine} layout
 * @param {object} archive
 */
function renderWalletSection(layout, archive) {
  const wallet = archive.wallet || {};
  startSection(layout, 'Wallet', 'Persoonlijke munten');

  const doc = layout.doc;
  layout.cursorY = layout.ensureSpace(60);
  layout.cursorY += drawMetricStrip(
    doc,
    layout.cursorY,
    [
      { label: 'Platinum', value: String(Number(wallet.platinum ?? 0)) },
      { label: 'Gold', value: String(Number(wallet.gold ?? 0)) },
      { label: 'Silver', value: String(Number(wallet.silver ?? 0)) },
      { label: 'Bronze', value: String(Number(wallet.bronze ?? 0)) },
    ],
    layout.contentWidth,
  ) + PDF_LAYOUT.blockGap;

  drawTable(doc, layout, {
    head: [['Munt', 'Aantal']],
    body: [
      ['Platinum (PP)', String(Number(wallet.platinum ?? 0))],
      ['Gold (GP)', String(Number(wallet.gold ?? 0))],
      ['Silver (SP)', String(Number(wallet.silver ?? 0))],
      ['Bronze (BP)', String(Number(wallet.bronze ?? 0))],
    ],
    theme: 'grid',
  });

  if (archive.mode === 'gm' && archive.gmData?.walletRows?.length) {
    startSection(layout, 'Wallet Overzicht (Party)', `${archive.gmData.walletRows.length} eigenaars`);
    drawTable(doc, layout, {
      head: [['Eigenaar', 'PP', 'GP', 'SP', 'BP']],
      body: archive.gmData.walletRows,
      theme: 'striped',
    });
  }
}

/**
 * @param {PdfLayoutEngine} layout
 * @param {object} archive
 */
function renderHandoutsSection(layout, archive) {
  const hasSecretColumn = archive.mode === 'gm';
  const handoutRows = (archive.handouts || []).map((handout) => (
    hasSecretColumn
      ? [
          asString(handout.title, 'Naamloze handout'),
          asString(handout.type, 'clue'),
          asString(handout.assignedToNick || '-', '-'),
          asString(handout.content, '-'),
          asString(handout.secret || '-', '-'),
        ]
      : [
          asString(handout.title, 'Naamloze handout'),
          asString(handout.type, 'clue'),
          asString(handout.assignedToNick || '-', '-'),
          asString(handout.content, '-'),
        ]
  ));

  startSection(layout, 'Ontdekte Handouts', `${handoutRows.length} zichtbaar`);

  if (handoutRows.length === 0) {
    layout.drawEmptyState('Nog geen handouts ontdekt of toegewezen.');
    return;
  }

  const handoutHead = hasSecretColumn
    ? [['Titel', 'Type', 'Toegewezen', 'Publiek', 'Geheim']]
    : [['Titel', 'Type', 'Toegewezen', 'Inhoud']];

  const handoutColumnStyles = hasSecretColumn
    ? {
        0: { cellWidth: 82 },
        1: { cellWidth: 50 },
        2: { cellWidth: 70 },
        3: { cellWidth: 130 },
        4: { cellWidth: 'auto', textColor: PDF_THEME.color.secret },
      }
    : {
        0: { cellWidth: 100 },
        1: { cellWidth: 60 },
        2: { cellWidth: 82 },
        3: { cellWidth: 'auto' },
      };

  drawTable(layout.doc, layout, {
    head: handoutHead,
    body: handoutRows,
    theme: 'striped',
    columnStyles: handoutColumnStyles,
  });
}

/**
 * @param {PdfLayoutEngine} layout
 * @param {object} archive
 */
function renderChatSection(layout, archive) {
  const chatLimit = archive.mode === 'gm' ? PDF_LIMITS.chatGm : PDF_LIMITS.chatPlayer;
  const allChat = Array.isArray(archive.chat) ? archive.chat : [];
  const chatRows = allChat.slice(-chatLimit).map((msg) => [
    asString(msg.author, 'Onbekend'),
    formatChatMomentLabel(msg),
    asString(msg.text, ''),
  ]);

  startSection(layout, 'Chat Kroniek', `${chatRows.length} recente berichten`);

  if (chatRows.length === 0) {
    layout.drawEmptyState('Nog geen chatberichten in deze export.');
    return;
  }

  drawTable(layout.doc, layout, {
    head: [['Auteur', 'Moment', 'Bericht']],
    body: chatRows,
    theme: 'plain',
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'bold' },
      1: { cellWidth: 100, textColor: PDF_THEME.color.inkSoft },
      2: { cellWidth: 'auto', font: PDF_THEME.font.story },
    },
  });

  layout.drawTruncationNotice('berichten', chatRows.length, allChat.length);
}

/**
 * @param {PdfLayoutEngine} layout
 * @param {object} archive
 */
function renderGmDetailSections(layout, archive) {
  if (archive.mode !== 'gm' || !archive.gmData) return;

  const doc = layout.doc;
  const gm = archive.gmData;

  if (gm.party?.length) {
    startSection(layout, 'Party Roster', `${gm.party.length} leden`);
    drawTable(doc, layout, {
      head: [['Naam', 'Rol', 'HP', 'AC', 'Init', 'Type']],
      body: gm.party.map((entry) => [
        asString(entry.name, 'Onbekend'),
        asString(entry.subtitle, '-'),
        `${Number(entry.hp ?? 0)}/${Number(entry.maxHp ?? entry.hp ?? 0)}`,
        String(Number(entry.ac ?? 10)),
        String(Number(entry.init ?? 0)),
        entry.isNpc ? 'NPC' : 'Speler',
      ]),
      theme: 'striped',
    });
  }

  if (Array.isArray(gm.preparations) && gm.preparations.length) {
    startSection(layout, 'Voorbereidingenbibliotheek', `${gm.preparations.length} entries`);
    drawTable(doc, layout, {
      head: [['Naam', 'Status', 'Speler', 'Laatste update']],
      body: gm.preparations.map((entry) => [
        asString(entry.name, 'Naamloos'),
        asString(entry.assignmentStatus, 'unassigned'),
        asString(entry.assignedToName || '-', '-'),
        formatDateShort(entry.updatedAtMs),
      ]),
      theme: 'striped',
    });
  }

  if (Array.isArray(gm.preparationBackups) && gm.preparationBackups.length) {
    startSection(layout, 'Herstelpunten', `${gm.preparationBackups.length} backups`);
    drawTable(doc, layout, {
      head: [['Speler', 'Template', 'Aangemaakt', 'Hersteld']],
      body: gm.preparationBackups.map((entry) => [
        asString(entry.playerName, '-'),
        asString(entry.templateName, '-'),
        formatDateShort(entry.createdAtMs),
        formatDateShort(entry.restoredAtMs),
      ]),
      theme: 'striped',
    });
  }
}

/**
 * Counts the sections that will actually render, so we can reserve exactly the
 * right number of TOC pages (avoiding trailing blank pages).
 * @param {object} archive
 */
function planSectionCount(archive) {
  const isGm = archive.mode === 'gm';
  const gm = archive.gmData || {};
  let count = 0;

  count += 1; // Karakterprofiel
  if (isGm && archive.gmData) count += 1; // GM Overzicht
  count += 1; // Reislog
  count += 1; // Inventaris
  count += 1; // Wallet
  if (isGm && gm.walletRows?.length) count += 1; // Wallet Overzicht (Party)
  count += 1; // Ontdekte Handouts
  count += 1; // Chat Kroniek
  if (isGm && gm.party?.length) count += 1; // Party Roster
  if (isGm && Array.isArray(gm.preparations) && gm.preparations.length) count += 1;
  if (isGm && Array.isArray(gm.preparationBackups) && gm.preparationBackups.length) count += 1;

  return count;
}

/**
 * @param {object} [archive]
 * @returns {Promise<{ filename: string, pageCount: number, sectionCount: number }>}
 */
export async function downloadPlayerArchivePdf(archive = {}) {
  applyPdfTheme(archive.theme);

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const brandAssets = await loadCoverBrandAssets();

  drawCover(doc, archive, brandAssets);

  const tocStartPage = 2;
  const plannedSections = planSectionCount(archive);
  const tocPageCount = Math.max(1, Math.ceil(plannedSections / PDF_LAYOUT.maxTocRowsPerPage));
  for (let i = 0; i < tocPageCount; i += 1) {
    doc.addPage();
  }

  doc.addPage();
  const layout = new PdfLayoutEngine(doc, {
    tocStartPage,
    tocPageCount,
    isCoverPage: (page) => page === 1,
  });
  layout.drawPageBackground();

  const profile = archive.profile || {};
  renderProfileSection(layout, profile, archive);
  renderGmOverview(layout, archive);
  renderNotesSection(layout, archive);
  renderInventorySection(layout, archive);
  renderWalletSection(layout, archive);
  renderHandoutsSection(layout, archive);
  renderChatSection(layout, archive);
  renderGmDetailSections(layout, archive);

  drawTableOfContents(doc, layout, archive.mode === 'gm' ? 'gm' : 'player');
  addFooterToAllPages(doc, archive);

  const safeName = asString(archive.subjectName, 'adventurer').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const safeSession = asString(archive.sessionId, 'session').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const mode = archive.mode === 'gm' ? 'gm' : 'player';
  const versionTag = asString(archive.layoutVersion, 'tv-pdf-r5').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const filename = `tomevault-${mode}-${safeName}-${safeSession}-${versionTag}-${new Date().toISOString().slice(0, 10)}.pdf`;

  doc.save(filename);

  return {
    filename,
    pageCount: doc.getNumberOfPages(),
    sectionCount: layout.sections.length,
  };
}

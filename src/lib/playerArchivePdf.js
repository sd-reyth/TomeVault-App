import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import i18n from '../i18n/index.js';
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

const t = (key, options) => i18n.t(`pdf:${key}`, options);

function formatChatMomentLabel(msg) {
  const date = asString(msg?.date, '');
  const time = asString(msg?.time, '');

  if (date && time) return `${date} ${time}`;
  if (date) return date;
  if (time) return time;
  return t('fallbacks.dash');
}

function startSection(layout, sectionKey, subtitle = '') {
  return layout.startSection(
    t(`sections.${sectionKey}.title`),
    subtitle,
    t(`sections.${sectionKey}.description`),
  );
}

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
 * @param {object} profile
 * @param {object} archive
 */
function renderProfileSection(layout, profile, archive) {
  const doc = layout.doc;
  const subtitle = archive.mode === 'gm'
    ? t('sections.profile.subtitleGm')
    : t('sections.profile.subtitlePlayer');

  startSection(layout, 'profile', subtitle);

  const hp = `${Number(profile.hp ?? 0)}/${Number(profile.maxHp ?? profile.hp ?? 0)}`;
  layout.cursorY = layout.ensureSpace(60);
  layout.cursorY += drawMetricStrip(
    doc,
    layout.cursorY,
    [
      { label: t('fields.hp'), value: hp },
      { label: t('fields.ac'), value: String(Number(profile.ac ?? 10)) },
      { label: t('fields.init'), value: String(Number(profile.initMod ?? 0)) },
    ],
    layout.contentWidth,
  ) + PDF_LAYOUT.blockGap;

  const statRows = [
    [t('fields.name'), asString(profile.name, archive.subjectName || t('fallbacks.unknown'))],
    [t('fields.title'), asString(profile.subtitle, t('fallbacks.dash'))],
  ].concat((profile.customStats || []).map((entry) => [
    asString(entry?.name, 'STAT'),
    formatCustomStatValue(entry),
  ]));

  drawTable(doc, layout, {
    head: [[t('fields.field'), t('fields.value')]],
    body: statRows,
    theme: 'grid',
  });

  layout.renderCallout(
    t(`callout.${archive.mode === 'gm' ? 'gm' : 'player'}`, { returnObjects: true }),
  );
}

/**
 * @param {PdfLayoutEngine} layout
 * @param {object} archive
 */
function renderGmOverview(layout, archive) {
  if (archive.mode !== 'gm' || !archive.gmData) return;

  const gm = archive.gmData;
  startSection(layout, 'gmOverview', t('sections.gmOverview.subtitle'));

  const doc = layout.doc;
  layout.cursorY = layout.ensureSpace(60);
  layout.cursorY += drawMetricStrip(
    doc,
    layout.cursorY,
    [
      { label: t('metrics.combat'), value: asString(gm.combatStatus, 'idle') },
      { label: t('metrics.round'), value: String(Number(gm.turnRound ?? 1)) },
      { label: t('metrics.party'), value: String((gm.party || []).length) },
      { label: t('metrics.handouts'), value: String((gm.handouts || []).length) },
    ],
    layout.contentWidth,
  ) + PDF_LAYOUT.blockGap;

  drawTable(doc, layout, {
    head: [[t('tables.component'), t('fields.value')]],
    body: [
      [t('tables.combatStatus'), asString(gm.combatStatus, 'idle')],
      [t('tables.currentRound'), String(Number(gm.turnRound ?? 1))],
      [t('tables.partyMembers'), String((gm.party || []).length)],
      [t('tables.handoutsTotal'), String((gm.handouts || []).length)],
      [t('tables.preparations'), String((gm.preparations || []).length)],
      [t('tables.backups'), String((gm.preparationBackups || []).length)],
      [t('tables.recentChat'), String((archive.chat || []).length)],
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

  startSection(layout, 'notes', t('labels.notesCount', { count: notes.length }));

  if (notes.length === 0) {
    layout.drawEmptyState(t('empty.notes'));
    return;
  }

  const doc = layout.doc;
  notes.slice(0, limit).forEach((note, index) => {
    const bodyText = asString(note.content, t('fallbacks.dash')).replace(/\s+/g, ' ') || t('fallbacks.dash');
    const wrapped = doc.splitTextToSize(bodyText, layout.contentWidth - 28).slice(0, PDF_LIMITS.noteExcerptLines);
    const estimatedHeight = Math.max(58, 36 + (wrapped.length * 12) + (note.lastEdited ? 10 : 0));
    layout.cursorY = layout.ensureSpace(estimatedHeight + 12);
    const cardHeight = drawStoryCard(
      doc,
      layout.cursorY,
      {
        title: `${index + 1}. ${asString(note.title, t('fallbacks.unnamedNote'))}`,
        meta: note.lastEdited ? t('labels.lastEdited', { date: formatDateShort(note.lastEdited) }) : undefined,
        body: asString(note.content, t('fallbacks.dash')) || t('fallbacks.dash'),
      },
      layout.contentWidth,
    );
    layout.cursorY += cardHeight + 10;
  });

  layout.drawTruncationNotice(t('truncation.notes'), Math.min(notes.length, limit), notes.length);
}

/**
 * @param {PdfLayoutEngine} layout
 * @param {object} archive
 */
function renderInventorySection(layout, archive) {
  const inventoryRows = (archive.inventory || []).map((item) => [
    asString(item.name, t('fallbacks.unknownItem')),
    String(Number(item.amount ?? 1)),
    asString(item.ownerName || item.ownerId || t('fallbacks.dash'), t('fallbacks.dash')),
    getItemCategoryLabel(item.category),
    asString(item.desc, t('fallbacks.dash')),
  ]);

  startSection(layout, 'inventory', t('labels.itemsCount', { count: inventoryRows.length }));

  if (inventoryRows.length === 0) {
    layout.drawEmptyState(t('empty.inventory'));
    return;
  }

  drawTable(layout.doc, layout, {
    head: [[t('tables.item'), t('tables.amount'), t('tables.owner'), t('tables.category'), t('tables.note')]],
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
  startSection(layout, 'wallet', t('sections.wallet.subtitle'));

  const doc = layout.doc;
  layout.cursorY = layout.ensureSpace(60);
  layout.cursorY += drawMetricStrip(
    doc,
    layout.cursorY,
    [
      { label: t('currency.platinum'), value: String(Number(wallet.platinum ?? 0)) },
      { label: t('currency.gold'), value: String(Number(wallet.gold ?? 0)) },
      { label: t('currency.silver'), value: String(Number(wallet.silver ?? 0)) },
      { label: t('currency.bronze'), value: String(Number(wallet.bronze ?? 0)) },
    ],
    layout.contentWidth,
  ) + PDF_LAYOUT.blockGap;

  drawTable(doc, layout, {
    head: [[t('tables.coin'), t('tables.amount')]],
    body: [
      [t('currency.platinumShort'), String(Number(wallet.platinum ?? 0))],
      [t('currency.goldShort'), String(Number(wallet.gold ?? 0))],
      [t('currency.silverShort'), String(Number(wallet.silver ?? 0))],
      [t('currency.bronzeShort'), String(Number(wallet.bronze ?? 0))],
    ],
    theme: 'grid',
  });

  if (archive.mode === 'gm' && archive.gmData?.walletRows?.length) {
    startSection(layout, 'partyWallet', t('labels.walletOwners', { count: archive.gmData.walletRows.length }));
    drawTable(doc, layout, {
      head: [[t('tables.owner'), 'PP', 'GP', 'SP', 'BP']],
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
          asString(handout.title, t('fallbacks.unnamedHandout')),
          asString(handout.type, 'clue'),
          asString(handout.assignedToNick || t('fallbacks.dash'), t('fallbacks.dash')),
          asString(handout.content, t('fallbacks.dash')),
          asString(handout.secret || t('fallbacks.dash'), t('fallbacks.dash')),
        ]
      : [
          asString(handout.title, t('fallbacks.unnamedHandout')),
          asString(handout.type, 'clue'),
          asString(handout.assignedToNick || t('fallbacks.dash'), t('fallbacks.dash')),
          asString(handout.content, t('fallbacks.dash')),
        ]
  ));

  startSection(layout, 'handouts', t('labels.handoutsCount', { count: handoutRows.length }));

  if (handoutRows.length === 0) {
    layout.drawEmptyState(t('empty.handouts'));
    return;
  }

  const handoutHead = hasSecretColumn
    ? [[t('tables.title'), t('tables.type'), t('tables.assigned'), t('tables.public'), t('tables.secret')]]
    : [[t('tables.title'), t('tables.type'), t('tables.assigned'), t('tables.content')]];

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
    asString(msg.author, t('fallbacks.unknown')),
    formatChatMomentLabel(msg),
    asString(msg.text, ''),
  ]);

  startSection(layout, 'chat', t('labels.chatCount', { count: chatRows.length }));

  if (chatRows.length === 0) {
    layout.drawEmptyState(t('empty.chat'));
    return;
  }

  drawTable(layout.doc, layout, {
    head: [[t('tables.author'), t('tables.moment'), t('tables.message')]],
    body: chatRows,
    theme: 'plain',
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'bold' },
      1: { cellWidth: 100, textColor: PDF_THEME.color.inkSoft },
      2: { cellWidth: 'auto', font: PDF_THEME.font.story },
    },
  });

  layout.drawTruncationNotice(t('truncation.messages'), chatRows.length, allChat.length);
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
    startSection(layout, 'roster', t('labels.rosterCount', { count: gm.party.length }));
    drawTable(doc, layout, {
      head: [[t('fields.name'), t('tables.role'), t('fields.hp'), t('fields.ac'), t('fields.init'), t('tables.type')]],
      body: gm.party.map((entry) => [
        asString(entry.name, t('fallbacks.unknown')),
        asString(entry.subtitle, t('fallbacks.dash')),
        `${Number(entry.hp ?? 0)}/${Number(entry.maxHp ?? entry.hp ?? 0)}`,
        String(Number(entry.ac ?? 10)),
        String(Number(entry.init ?? 0)),
        entry.isNpc ? t('roster.npc') : t('roster.player'),
      ]),
      theme: 'striped',
    });
  }

  if (Array.isArray(gm.preparations) && gm.preparations.length) {
    startSection(layout, 'preparations', t('labels.preparationCount', { count: gm.preparations.length }));
    drawTable(doc, layout, {
      head: [[t('fields.name'), t('tables.status'), t('tables.player'), t('tables.lastUpdate')]],
      body: gm.preparations.map((entry) => [
        asString(entry.name, t('fallbacks.unnamed')),
        asString(entry.assignmentStatus, 'unassigned'),
        asString(entry.assignedToName || t('fallbacks.dash'), t('fallbacks.dash')),
        formatDateShort(entry.updatedAtMs),
      ]),
      theme: 'striped',
    });
  }

  if (Array.isArray(gm.preparationBackups) && gm.preparationBackups.length) {
    startSection(layout, 'backups', t('labels.backupCount', { count: gm.preparationBackups.length }));
    drawTable(doc, layout, {
      head: [[t('tables.player'), t('tables.template'), t('tables.created'), t('tables.restored')]],
      body: gm.preparationBackups.map((entry) => [
        asString(entry.playerName, t('fallbacks.dash')),
        asString(entry.templateName, t('fallbacks.dash')),
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

  count += 1; // profile
  if (isGm && archive.gmData) count += 1; // gmOverview
  count += 1; // notes
  count += 1; // inventory
  count += 1; // wallet
  if (isGm && gm.walletRows?.length) count += 1; // partyWallet
  count += 1; // handouts
  count += 1; // chat
  if (isGm && gm.party?.length) count += 1; // roster
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

  const safeName = asString(archive.subjectName, t('fallbacks.adventurer')).toLowerCase().replace(/[^a-z0-9]+/g, '-');
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

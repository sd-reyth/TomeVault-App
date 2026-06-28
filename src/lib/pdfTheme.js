/**
 * TomeVault PDF design system — mirrors app tokens (tokens.css / revolution.css)
 * in jsPDF-safe RGB values and reusable drawing primitives.
 */

/** @typedef {[number, number, number]} Rgb */

/** @param {string} hex */
export function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  const full = normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized;
  const value = Number.parseInt(full, 16);
  return [
    (value >> 16) & 255,
    (value >> 8) & 255,
    value & 255,
  ];
}

/**
 * Per-theme accent/surface palettes mirroring the in-app data-theme variants.
 * Paper/ink/gold/borders stay constant for print readability; only the
 * accent, dark surfaces and table-head colors adapt to the selected theme.
 */
export const PDF_THEME_PALETTES = {
  'ember-forge': { accent: '#ff9d42', accentSoft: '#ffc285', canvas: '#2b1f18', canvasDeep: '#1c130d', tableHead: '#7a4420' },
  'dawn-parchment': { accent: '#9c6f2e', accentSoft: '#c79a55', canvas: '#2e2417', canvasDeep: '#1f1810', tableHead: '#6b4f23' },
  'midnight-tome': { accent: '#9f7dff', accentSoft: '#c4b0ff', canvas: '#1a1625', canvasDeep: '#120e1a', tableHead: '#3d2a5c' },
  'forest-scroll': { accent: '#6bc66b', accentSoft: '#a5e0a5', canvas: '#1f2a22', canvasDeep: '#141c17', tableHead: '#2f5a38' },
  'blood-moon': { accent: '#c41e3a', accentSoft: '#ff6b86', canvas: '#1a0f14', canvasDeep: '#120a0d', tableHead: '#6b2030' },
};

const PDF_DEFAULT_THEME = 'ember-forge';

/** App theme palette translated for PDF output (mutated per export via applyPdfTheme) */
export const PDF_THEME = {
  color: {
    canvas: hexToRgb('#2b1f18'),
    canvasDeep: hexToRgb('#1c130d'),
    paper: hexToRgb('#f8f1e3'),
    paperMuted: hexToRgb('#f0e6d2'),
    paperWarm: hexToRgb('#ebe0cc'),
    ink: hexToRgb('#2c2218'),
    inkMuted: hexToRgb('#5c4a3a'),
    inkSoft: hexToRgb('#8a7560'),
    accent: hexToRgb('#ff9d42'),
    accentSoft: hexToRgb('#ffc285'),
    gold: hexToRgb('#d4a017'),
    goldSoft: hexToRgb('#e8c56a'),
    goldPale: hexToRgb('#f5e0a8'),
    border: hexToRgb('#c4a882'),
    borderSoft: hexToRgb('#ddd0b8'),
    divider: hexToRgb('#b8a48c'),
    tableHead: hexToRgb('#7a4420'),
    tableHeadText: hexToRgb('#f5e8d0'),
    tableRow: hexToRgb('#faf6ee'),
    tableRowAlt: hexToRgb('#f3ecdc'),
    callout: hexToRgb('#f3ead8'),
    calloutBorder: hexToRgb('#c9b896'),
    secret: hexToRgb('#5c2a4a'),
    secretBg: hexToRgb('#f8eef2'),
    white: [255, 255, 255],
    coverText: hexToRgb('#f5efe3'),
    coverMuted: hexToRgb('#c8b8a0'),
  },
  type: {
    display: 24,
    title: 14,
    section: 12,
    subtitle: 9,
    body: 9.5,
    small: 8.5,
    meta: 8,
    label: 7.5,
  },
  font: {
    ui: 'helvetica',
    story: 'times',
  },
};

/**
 * Mutates PDF_THEME.color to match the selected in-app theme.
 * @param {string} [themeId]
 */
export function applyPdfTheme(themeId) {
  const palette = PDF_THEME_PALETTES[themeId] || PDF_THEME_PALETTES[PDF_DEFAULT_THEME];
  PDF_THEME.color.accent = hexToRgb(palette.accent);
  PDF_THEME.color.accentSoft = hexToRgb(palette.accentSoft);
  PDF_THEME.color.canvas = hexToRgb(palette.canvas);
  PDF_THEME.color.canvasDeep = hexToRgb(palette.canvasDeep);
  PDF_THEME.color.tableHead = hexToRgb(palette.tableHead);
}

/** 0.75rem ≈ 9pt at standard scale */
export const PDF_LAYOUT = {
  margin: 36,
  marginInner: 44,
  footerY: 28,
  contentTop: 52,
  radius: 9,
  radiusSm: 6,
  sectionGap: 18,
  blockGap: 14,
  tocHeaderHeight: 108,
  tocRowHeight: 28,
  tocReservedPages: 3,
  maxTocRowsPerPage: 18,
};

export const PDF_LIMITS = {
  notesPlayer: 30,
  notesGm: 45,
  chatPlayer: 80,
  chatGm: 180,
  noteExcerptLines: 8,
  calloutLines: 3,
};

export function asString(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

export function toDisplayDate(value) {
  if (!value) return new Date().toLocaleString('nl-NL');
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toLocaleString('nl-NL');
  return date.toLocaleString('nl-NL');
}

export function formatDateShort(value) {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('nl-NL');
}

/**
 * Lightweight layout engine for cursor tracking, page backgrounds and TOC-safe pagination.
 */
export class PdfLayoutEngine {
  /**
   * @param {import('jspdf').jsPDF} doc
   * @param {{ tocStartPage: number, tocPageCount: number, isCoverPage?: (page: number) => boolean }} options
   */
  constructor(doc, options) {
    this.doc = doc;
    this.tocStartPage = options.tocStartPage;
    this.tocPageCount = options.tocPageCount;
    this.isCoverPage = options.isCoverPage || ((page) => page === 1);
    this.cursorY = PDF_LAYOUT.contentTop;
    /** @type {{ title: string, subtitle: string, description: string, page: number }[]} */
    this.sections = [];
  }

  get pageWidth() {
    return this.doc.internal.pageSize.getWidth();
  }

  get pageHeight() {
    return this.doc.internal.pageSize.getHeight();
  }

  get contentWidth() {
    return this.pageWidth - (PDF_LAYOUT.margin * 2);
  }

  isTocPage(page) {
    return page >= this.tocStartPage && page < this.tocStartPage + this.tocPageCount;
  }

  /** @param {Rgb} rgb */
  setFill(rgb) {
    this.doc.setFillColor(...rgb);
  }

  /** @param {Rgb} rgb */
  setDraw(rgb) {
    this.doc.setDrawColor(...rgb);
  }

  /** @param {Rgb} rgb */
  setText(rgb) {
    this.doc.setTextColor(...rgb);
  }

  drawPageBackground() {
    const page = this.doc.getNumberOfPages();
    if (this.isCoverPage(page) || this.isTocPage(page)) return;

    this.setFill(PDF_THEME.color.paper);
    this.doc.rect(0, 0, this.pageWidth, this.pageHeight, 'F');

    this.setDraw(PDF_THEME.color.borderSoft);
    this.doc.setLineWidth(0.35);
    this.doc.rect(
      PDF_LAYOUT.margin - 8,
      PDF_LAYOUT.margin - 8,
      this.pageWidth - ((PDF_LAYOUT.margin - 8) * 2),
      this.pageHeight - ((PDF_LAYOUT.margin - 8) * 2),
      'S',
    );

    this.setFill(PDF_THEME.color.accent);
    const canUseOpacity = typeof this.doc.GState === 'function' && typeof this.doc.setGState === 'function';
    if (canUseOpacity) {
      this.doc.setGState(new this.doc.GState({ opacity: 0.04 }));
    }
    this.doc.circle(this.pageWidth - 48, 48, 80, 'F');
    if (canUseOpacity) {
      this.doc.setGState(new this.doc.GState({ opacity: 1 }));
    }
  }

  newPage() {
    this.doc.addPage();
    this.drawPageBackground();
    this.cursorY = PDF_LAYOUT.contentTop;
    return this.cursorY;
  }

  ensureSpace(requiredHeight = 100) {
    const bottomLimit = this.pageHeight - PDF_LAYOUT.footerY - 16;
    if (this.cursorY + requiredHeight <= bottomLimit) return this.cursorY;
    return this.newPage();
  }

  /**
   * @param {string} title
   * @param {string} [subtitle]
   * @param {string} [description]
   */
  startSection(title, subtitle = '', description = '') {
    this.sections.push({
      title,
      subtitle,
      description,
      page: this.doc.getNumberOfPages(),
    });
    this.cursorY = this.ensureSpace(subtitle ? 108 : 92);
    this.cursorY = drawSectionHeader(this.doc, this.cursorY, title, subtitle);
    return this.cursorY;
  }

  /**
   * @param {string} message
   * @param {number} [height]
   */
  drawEmptyState(message, height = 52) {
    this.cursorY = this.ensureSpace(height);
    drawEmptyState(this.doc, this.cursorY, message, this.contentWidth);
    this.cursorY += height + PDF_LAYOUT.blockGap;
    return this.cursorY;
  }

  /**
   * @param {string[]} lines
   */
  renderCallout(lines) {
    this.cursorY = this.ensureSpace(80);
    const height = drawCallout(this.doc, this.cursorY, lines, this.contentWidth);
    this.cursorY += height + PDF_LAYOUT.blockGap;
    return this.cursorY;
  }

  /**
   * @param {string} label
   * @param {string | number} value
   */
  drawTruncationNotice(label, shown, total) {
    if (total <= shown) return this.cursorY;
    this.cursorY = this.ensureSpace(22);
    this.doc.setFont(PDF_THEME.font.ui, 'italic');
    this.doc.setFontSize(PDF_THEME.type.meta);
    this.setText(PDF_THEME.color.inkSoft);
    this.doc.text(
      `${shown} van ${total} ${label} opgenomen in deze kroniek.`,
      PDF_LAYOUT.marginInner,
      this.cursorY + 10,
    );
    this.cursorY += 24;
    return this.cursorY;
  }
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} y
 * @param {string} title
 * @param {string} [subtitle]
 */
export function drawSectionHeader(doc, y, title, subtitle = '') {
  const width = doc.internal.pageSize.getWidth() - (PDF_LAYOUT.margin * 2);
  const boxHeight = subtitle ? 46 : 34;
  const x = PDF_LAYOUT.margin;

  doc.setFillColor(...PDF_THEME.color.canvas);
  doc.roundedRect(x, y, width, boxHeight, PDF_LAYOUT.radius, PDF_LAYOUT.radius, 'F');

  doc.setDrawColor(...PDF_THEME.color.accent);
  doc.setLineWidth(1.2);
  doc.line(x + 12, y + 8, x + 12, y + boxHeight - 8);

  doc.setFillColor(...PDF_THEME.color.gold);
  doc.circle(x + 12, y + (boxHeight / 2), 2.5, 'F');

  doc.setTextColor(...PDF_THEME.color.goldPale);
  doc.setFont(PDF_THEME.font.ui, 'bold');
  doc.setFontSize(PDF_THEME.type.section);
  doc.text(asString(title, 'Sectie'), x + 22, y + (subtitle ? 20 : 22));

  if (subtitle) {
    doc.setTextColor(...PDF_THEME.color.coverMuted);
    doc.setFont(PDF_THEME.font.ui, 'normal');
    doc.setFontSize(PDF_THEME.type.subtitle);
    doc.text(subtitle, x + 22, y + 36);
  }

  return y + boxHeight + PDF_LAYOUT.blockGap;
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} y
 * @param {string} message
 * @param {number} width
 */
export function drawEmptyState(doc, y, message, width) {
  const height = 48;
  doc.setFillColor(...PDF_THEME.color.paperWarm);
  doc.setDrawColor(...PDF_THEME.color.borderSoft);
  doc.setLineWidth(0.5);
  doc.roundedRect(PDF_LAYOUT.margin, y, width, height, PDF_LAYOUT.radiusSm, PDF_LAYOUT.radiusSm, 'FD');

  doc.setFont(PDF_THEME.font.ui, 'italic');
  doc.setFontSize(PDF_THEME.type.body);
  doc.setTextColor(...PDF_THEME.color.inkSoft);
  doc.text(message, PDF_LAYOUT.marginInner, y + 28);
  return height;
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} y
 * @param {string[]} lines
 * @param {number} width
 */
export function drawCallout(doc, y, lines = [], width) {
  const content = Array.isArray(lines) ? lines.filter(Boolean) : [];
  const innerWidth = width - 26;
  let lineCount = 0;
  content.slice(0, PDF_LIMITS.calloutLines).forEach((line) => {
    const wrapped = doc.splitTextToSize(String(line), innerWidth);
    lineCount += Math.min(wrapped.length, 2);
  });
  const height = Math.max(64, 24 + (lineCount * 13));

  doc.setFillColor(...PDF_THEME.color.callout);
  doc.setDrawColor(...PDF_THEME.color.calloutBorder);
  doc.setLineWidth(0.6);
  doc.roundedRect(PDF_LAYOUT.margin, y, width, height, PDF_LAYOUT.radiusSm, PDF_LAYOUT.radiusSm, 'FD');

  doc.setFont(PDF_THEME.font.story, 'italic');
  doc.setFontSize(PDF_THEME.type.body);
  doc.setTextColor(...PDF_THEME.color.inkMuted);

  let lineY = y + 22;
  content.slice(0, PDF_LIMITS.calloutLines).forEach((line) => {
    const wrapped = doc.splitTextToSize(String(line), innerWidth).slice(0, 2);
    doc.text(wrapped, PDF_LAYOUT.margin + 13, lineY);
    lineY += wrapped.length * 13 + 2;
  });

  return height;
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} y
 * @param {{ label: string, value: string }[]} metrics
 * @param {number} width
 */
export function drawMetricStrip(doc, y, metrics, width) {
  const count = Math.max(1, metrics.length);
  const gap = 8;
  const cardWidth = (width - (gap * (count - 1))) / count;
  const cardHeight = 52;

  metrics.forEach((metric, index) => {
    const x = PDF_LAYOUT.margin + (index * (cardWidth + gap));
    doc.setFillColor(...PDF_THEME.color.paperMuted);
    doc.setDrawColor(...PDF_THEME.color.borderSoft);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, y, cardWidth, cardHeight, PDF_LAYOUT.radiusSm, PDF_LAYOUT.radiusSm, 'FD');

    doc.setFont(PDF_THEME.font.ui, 'normal');
    doc.setFontSize(PDF_THEME.type.label);
    doc.setTextColor(...PDF_THEME.color.inkSoft);
    doc.text(metric.label.toUpperCase(), x + 10, y + 16);

    doc.setFont(PDF_THEME.font.ui, 'bold');
    doc.setFontSize(PDF_THEME.type.title);
    doc.setTextColor(...PDF_THEME.color.ink);
    doc.text(asString(metric.value, '-'), x + 10, y + 36);
  });

  return cardHeight;
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} y
 * @param {{ title: string, meta?: string, body: string }} card
 * @param {number} width
 */
export function drawStoryCard(doc, y, card, width) {
  const bodyText = asString(card.body, '-').replace(/\s+/g, ' ');
  const wrapped = doc.splitTextToSize(bodyText, width - 28).slice(0, PDF_LIMITS.noteExcerptLines);
  const height = Math.max(58, 36 + (wrapped.length * 12));

  doc.setFillColor(...PDF_THEME.color.tableRow);
  doc.setDrawColor(...PDF_THEME.color.borderSoft);
  doc.setLineWidth(0.45);
  doc.roundedRect(PDF_LAYOUT.margin, y, width, height, PDF_LAYOUT.radiusSm, PDF_LAYOUT.radiusSm, 'FD');

  doc.setFont(PDF_THEME.font.ui, 'bold');
  doc.setFontSize(PDF_THEME.type.body);
  doc.setTextColor(...PDF_THEME.color.ink);
  doc.text(asString(card.title, 'Naamloos'), PDF_LAYOUT.marginInner, y + 18);

  if (card.meta) {
    doc.setFont(PDF_THEME.font.ui, 'normal');
    doc.setFontSize(PDF_THEME.type.meta);
    doc.setTextColor(...PDF_THEME.color.inkSoft);
    doc.text(card.meta, PDF_LAYOUT.marginInner, y + 30);
  }

  doc.setFont(PDF_THEME.font.story, 'normal');
  doc.setFontSize(PDF_THEME.type.small);
  doc.setTextColor(...PDF_THEME.color.inkMuted);
  doc.text(wrapped, PDF_LAYOUT.marginInner, y + (card.meta ? 44 : 34));

  return height;
}

/** @returns {import('jspdf-autotable').UserOptions} */
export function tableBaseOptions() {
  return {
    margin: { left: PDF_LAYOUT.margin, right: PDF_LAYOUT.margin },
    tableWidth: 'auto',
    styles: {
      font: PDF_THEME.font.ui,
      fontSize: PDF_THEME.type.small,
      cellPadding: 4,
      lineColor: PDF_THEME.color.borderSoft,
      lineWidth: 0.25,
      textColor: PDF_THEME.color.ink,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: PDF_THEME.color.tableHead,
      textColor: PDF_THEME.color.tableHeadText,
      fontStyle: 'bold',
      fontSize: PDF_THEME.type.small,
    },
    alternateRowStyles: {
      fillColor: PDF_THEME.color.tableRowAlt,
    },
    bodyStyles: {
      fillColor: PDF_THEME.color.tableRow,
    },
    showHead: 'everyPage',
  };
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {object} archive
 * @param {{ tomeVaultLogo?: HTMLImageElement | null, sneezingDonkeyMark?: HTMLImageElement | null }} brandAssets
 */
export function drawCover(doc, archive, brandAssets = {}) {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const centerX = width / 2;
  const isGm = archive.mode === 'gm';
  const canUseOpacity = typeof doc.GState === 'function' && typeof doc.setGState === 'function';

  doc.setFillColor(...PDF_THEME.color.canvasDeep);
  doc.rect(0, 0, width, height, 'F');

  if (canUseOpacity) doc.setGState(new doc.GState({ opacity: 0.16 }));
  doc.setFillColor(...PDF_THEME.color.accent);
  doc.circle(width * 0.85, 90, 150, 'F');
  doc.setFillColor(...PDF_THEME.color.gold);
  doc.circle(width * 0.1, height - 120, 130, 'F');
  if (canUseOpacity) doc.setGState(new doc.GState({ opacity: 0.06 }));
  doc.setFillColor(...PDF_THEME.color.accentSoft);
  doc.circle(width * 0.2, 160, 90, 'F');
  if (canUseOpacity) doc.setGState(new doc.GState({ opacity: 1 }));

  doc.setDrawColor(...PDF_THEME.color.gold);
  doc.setLineWidth(1.4);
  doc.roundedRect(34, 34, width - 68, height - 68, PDF_LAYOUT.radius, PDF_LAYOUT.radius, 'S');
  doc.setDrawColor(...PDF_THEME.color.accent);
  doc.setLineWidth(0.5);
  doc.roundedRect(42, 42, width - 84, height - 84, PDF_LAYOUT.radiusSm, PDF_LAYOUT.radiusSm, 'S');

  if (brandAssets.sneezingDonkeyMark) {
    const donkeyDataUrl = imageToDataUrl(brandAssets.sneezingDonkeyMark, 'image/png');
    if (donkeyDataUrl) {
      if (canUseOpacity) doc.setGState(new doc.GState({ opacity: 0.05 }));
      doc.addImage(donkeyDataUrl, 'PNG', centerX - 150, height / 2 - 100, 300, 210, undefined, 'FAST');
      if (canUseOpacity) doc.setGState(new doc.GState({ opacity: 1 }));
    }
  }

  if (brandAssets.tomeVaultLogo) {
    const logoDataUrl = imageToDataUrl(brandAssets.tomeVaultLogo, 'image/png');
    if (logoDataUrl) {
      const logoSize = 132;
      doc.addImage(logoDataUrl, 'PNG', centerX - (logoSize / 2), 96, logoSize, logoSize, undefined, 'FAST');
    }
  }

  doc.setTextColor(...PDF_THEME.color.gold);
  doc.setFont(PDF_THEME.font.ui, 'bold');
  doc.setFontSize(30);
  doc.text('TOMEVAULT', centerX, 268, { align: 'center' });

  doc.setTextColor(...PDF_THEME.color.coverMuted);
  doc.setFont(PDF_THEME.font.ui, 'normal');
  doc.setFontSize(PDF_THEME.type.subtitle);
  doc.text('by Sneezing Donkey', centerX, 286, { align: 'center' });

  const badgeLabel = isGm ? 'GM DOSSIER' : 'SPELERKRONIEK';
  doc.setFontSize(PDF_THEME.type.label);
  const badgeWidth = doc.getTextWidth(badgeLabel) + 28;
  doc.setFillColor(...PDF_THEME.color.accent);
  doc.roundedRect(centerX - (badgeWidth / 2), 318, badgeWidth, 24, PDF_LAYOUT.radiusSm, PDF_LAYOUT.radiusSm, 'F');
  doc.setTextColor(...PDF_THEME.color.white);
  doc.setFont(PDF_THEME.font.ui, 'bold');
  doc.text(badgeLabel, centerX, 334, { align: 'center' });

  doc.setDrawColor(...PDF_THEME.color.gold);
  doc.setLineWidth(0.6);
  doc.line(centerX - 150, 392, centerX - 40, 392);
  doc.line(centerX + 40, 392, centerX + 150, 392);
  doc.setFillColor(...PDF_THEME.color.gold);
  doc.circle(centerX, 392, 2.2, 'F');

  doc.setTextColor(...PDF_THEME.color.coverText);
  doc.setFont(PDF_THEME.font.ui, 'bold');
  doc.setFontSize(26);
  const subjectName = asString(archive.subjectName, 'Naamloze Avonturier');
  const subjectLines = doc.splitTextToSize(subjectName, width - 140);
  doc.text(subjectLines.slice(0, 2), centerX, 426, { align: 'center' });

  doc.setTextColor(...PDF_THEME.color.coverMuted);
  doc.setFont(PDF_THEME.font.story, 'italic');
  doc.setFontSize(PDF_THEME.type.body);
  const modeLabel = isGm
    ? 'Grandmaster Chronicle — campagnedossier'
    : 'Character Chronicle — persoonlijke kroniek';
  doc.text(modeLabel, centerX, 452, { align: 'center' });

  const metaCardW = 320;
  const metaCardX = centerX - (metaCardW / 2);
  const metaY = 510;
  doc.setFillColor(...PDF_THEME.color.canvas);
  doc.setDrawColor(...PDF_THEME.color.border);
  doc.setLineWidth(0.6);
  doc.roundedRect(metaCardX, metaY, metaCardW, 88, PDF_LAYOUT.radiusSm, PDF_LAYOUT.radiusSm, 'FD');

  const metaRows = [
    ['Sessie', asString(archive.sessionId, 'Onbekend')],
    ['Export', toDisplayDate(archive.generatedAt)],
    ['Layout', asString(archive.layoutVersion, 'TV-PDF-R5')],
  ];
  metaRows.forEach(([label, value], index) => {
    const rowY = metaY + 22 + (index * 22);
    doc.setFont(PDF_THEME.font.ui, 'bold');
    doc.setFontSize(PDF_THEME.type.label);
    doc.setTextColor(...PDF_THEME.color.accentSoft);
    doc.text(label.toUpperCase(), metaCardX + 20, rowY);
    doc.setFont(PDF_THEME.font.ui, 'normal');
    doc.setFontSize(PDF_THEME.type.subtitle);
    doc.setTextColor(...PDF_THEME.color.coverText);
    doc.text(value, metaCardX + 90, rowY);
  });

  doc.setFont(PDF_THEME.font.story, 'italic');
  doc.setFontSize(PDF_THEME.type.body);
  doc.setTextColor(...PDF_THEME.color.goldSoft);
  const scopeLabel = isGm
    ? 'Uitgebreide GM-export met sessiebreed overzicht, audittrail en narratieve continuïteit.'
    : 'Alle speler-zichtbare gegevens op het moment van export — jouw reis, vastgelegd.';
  const scopeWrapped = doc.splitTextToSize(scopeLabel, 360);
  doc.text(scopeWrapped, centerX, height - 96, { align: 'center' });

  doc.setFont(PDF_THEME.font.ui, 'normal');
  doc.setFontSize(PDF_THEME.type.meta);
  doc.setTextColor(...PDF_THEME.color.coverMuted);
  doc.text('Sessies en herinneringen — eeuwig bewaard.', centerX, height - 62, { align: 'center' });
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {PdfLayoutEngine} layout
 * @param {'gm' | 'player'} mode
 */
export function drawTableOfContents(doc, layout, mode) {
  const { sections, tocStartPage, tocPageCount } = layout;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxRows = tocPageCount * PDF_LAYOUT.maxTocRowsPerPage;

  let rowIndex = 0;
  let tocPageOffset = 0;

  for (let i = 0; i < Math.min(sections.length, maxRows); i += 1) {
    const entry = sections[i];
    if (rowIndex > 0 && rowIndex % PDF_LAYOUT.maxTocRowsPerPage === 0) {
      tocPageOffset += 1;
    }

    const pageNum = tocStartPage + tocPageOffset;
    doc.setPage(pageNum);

    if (rowIndex % PDF_LAYOUT.maxTocRowsPerPage === 0) {
      doc.setFillColor(...PDF_THEME.color.canvas);
      doc.rect(0, 0, pageWidth, PDF_LAYOUT.tocHeaderHeight, 'F');

      doc.setTextColor(...PDF_THEME.color.gold);
      doc.setFont(PDF_THEME.font.ui, 'bold');
      doc.setFontSize(20);
      doc.text('Inhoudsopgave', PDF_LAYOUT.margin, 52);

      doc.setTextColor(...PDF_THEME.color.coverMuted);
      doc.setFont(PDF_THEME.font.ui, 'normal');
      doc.setFontSize(PDF_THEME.type.subtitle);
      doc.text(
        `Exportmodus: ${mode === 'gm' ? 'GM volledig' : 'Speler persoonlijk'}`,
        PDF_LAYOUT.margin,
        72,
      );

      doc.setFillColor(...PDF_THEME.color.paper);
      doc.rect(0, PDF_LAYOUT.tocHeaderHeight, pageWidth, pageHeight - PDF_LAYOUT.tocHeaderHeight, 'F');
    }

    const rowInPage = rowIndex % PDF_LAYOUT.maxTocRowsPerPage;
    const tocY = PDF_LAYOUT.tocHeaderHeight + 36 + (rowInPage * PDF_LAYOUT.tocRowHeight);

    doc.setFont(PDF_THEME.font.ui, 'bold');
    doc.setFontSize(PDF_THEME.type.body);
    doc.setTextColor(...PDF_THEME.color.ink);
    doc.text(`${i + 1}. ${entry.title}`, PDF_LAYOUT.marginInner, tocY);

    if (entry.description) {
      doc.setFont(PDF_THEME.font.ui, 'normal');
      doc.setFontSize(PDF_THEME.type.meta);
      doc.setTextColor(...PDF_THEME.color.inkSoft);
      doc.text(entry.description, PDF_LAYOUT.marginInner + 14, tocY + 11);
    }

    doc.setDrawColor(...PDF_THEME.color.divider);
    doc.setLineWidth(0.3);
    const lineY = entry.description ? tocY + 14 : tocY - 3;
    doc.line(200, lineY, pageWidth - 56, lineY);

    doc.setFont(PDF_THEME.font.ui, 'normal');
    doc.setFontSize(PDF_THEME.type.body);
    doc.setTextColor(...PDF_THEME.color.accent);
    doc.text(String(entry.page), pageWidth - 48, tocY);

    rowIndex += 1;
  }

  if (sections.length > maxRows) {
    const lastTocPage = tocStartPage + tocPageCount - 1;
    doc.setPage(lastTocPage);
    doc.setFont(PDF_THEME.font.ui, 'italic');
    doc.setFontSize(PDF_THEME.type.meta);
    doc.setTextColor(...PDF_THEME.color.inkSoft);
    doc.text(
      `+ ${sections.length - maxRows} extra secties — verhoog TOC-reserve`,
      PDF_LAYOUT.marginInner,
      pageHeight - 40,
    );
  }
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {object} archive
 */
export function addFooterToAllPages(doc, archive) {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();

    doc.setDrawColor(...PDF_THEME.color.divider);
    doc.setLineWidth(0.4);
    doc.line(PDF_LAYOUT.margin - 4, height - PDF_LAYOUT.footerY, width - PDF_LAYOUT.margin + 4, height - PDF_LAYOUT.footerY);

    doc.setFont(PDF_THEME.font.ui, 'normal');
    doc.setFontSize(PDF_THEME.type.meta);
    doc.setTextColor(...PDF_THEME.color.inkSoft);
    doc.text(
      `TomeVault by Sneezing Donkey · ${asString(archive.sessionId, 'Onbekend')}`,
      PDF_LAYOUT.margin,
      height - 14,
    );
    doc.text(`Pagina ${page}/${pages}`, width - 72, height - 14);
  }
}

export function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Kon afbeelding niet laden: ${src}`));
    image.src = src;
  });
}

export function imageToDataUrl(image, mimeType = 'image/png') {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0);
  return canvas.toDataURL(mimeType);
}

export async function loadCoverBrandAssets() {
  const [tomeVaultLogo, sneezingDonkeyMark] = await Promise.allSettled([
    loadImageElement('/references/tomeVaultLogo1.png'),
    loadImageElement('/assets/nugget.svg'),
  ]);

  return {
    tomeVaultLogo: tomeVaultLogo.status === 'fulfilled' ? tomeVaultLogo.value : null,
    sneezingDonkeyMark: sneezingDonkeyMark.status === 'fulfilled' ? sneezingDonkeyMark.value : null,
  };
}

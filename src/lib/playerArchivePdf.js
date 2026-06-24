import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getItemCategoryLabel } from './itemCategories';

const PDF_MARGIN = 32;

function asString(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function toDisplayDate(value) {
  if (!value) return new Date().toLocaleString('nl-NL');
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toLocaleString('nl-NL');
  return date.toLocaleString('nl-NL');
}

function formatDateShort(value) {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('nl-NL');
}

function tableBaseOptions() {
  return {
    margin: { left: PDF_MARGIN, right: PDF_MARGIN },
    tableWidth: 'auto',
  };
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Kon afbeelding niet laden: ${src}`));
    image.src = src;
  });
}

function imageToDataUrl(image, mimeType = 'image/png') {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0);
  return canvas.toDataURL(mimeType);
}

function fitImageInBox(image, maxWidth, maxHeight) {
  const sourceWidth = Number(image?.naturalWidth || image?.width || 0);
  const sourceHeight = Number(image?.naturalHeight || image?.height || 0);

  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return {
      width: maxWidth,
      height: maxHeight,
    };
  }

  const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);
  return {
    width: Math.max(1, sourceWidth * scale),
    height: Math.max(1, sourceHeight * scale),
  };
}

function formatChatMomentLabel(msg) {
  const date = asString(msg?.date, '');
  const time = asString(msg?.time, '');

  if (date && time) return `${date} ${time}`;
  if (date) return date;
  if (time) return time;
  return '-';
}

async function loadCoverBrandAssets() {
  const [tomeVaultLogo, sneezingDonkeyMark] = await Promise.allSettled([
    loadImageElement('/references/tomeVaultLogo1.png'),
    loadImageElement('/assets/nugget.svg'),
  ]);

  return {
    tomeVaultLogo: tomeVaultLogo.status === 'fulfilled' ? tomeVaultLogo.value : null,
    sneezingDonkeyMark: sneezingDonkeyMark.status === 'fulfilled' ? sneezingDonkeyMark.value : null,
  };
}

function withPageBreak(doc, cursorY, requiredHeight = 120) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (cursorY + requiredHeight < pageHeight - 32) return cursorY;
  doc.addPage();
  return 48;
}

function sectionTitle(doc, y, title, subtitle = '') {
  const safeY = withPageBreak(doc, y, subtitle ? 104 : 90);
  const boxHeight = subtitle ? 42 : 30;

  doc.setFillColor(34, 15, 15);
  doc.roundedRect(32, safeY, doc.internal.pageSize.getWidth() - 64, boxHeight, 6, 6, 'F');

  doc.setTextColor(248, 227, 195);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(asString(title, 'Sectie'), 44, safeY + 19);

  if (subtitle) {
    doc.setTextColor(173, 154, 132);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(subtitle, 44, safeY + 33);
  }

  return safeY + boxHeight + 12;
}

function drawNarrativePanel(doc, y, lines = []) {
  const safeY = withPageBreak(doc, y, 110);
  const width = doc.internal.pageSize.getWidth() - (PDF_MARGIN * 2);
  const content = Array.isArray(lines) ? lines.filter(Boolean) : [];

  doc.setFillColor(246, 239, 227);
  doc.setDrawColor(145, 123, 97);
  doc.setLineWidth(0.6);
  doc.roundedRect(PDF_MARGIN, safeY, width, 72, 6, 6, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(84, 64, 47);

  let lineY = safeY + 20;
  content.slice(0, 3).forEach((line) => {
    const wrapped = doc.splitTextToSize(String(line), width - 26).slice(0, 2);
    doc.text(wrapped, PDF_MARGIN + 13, lineY);
    lineY += wrapped.length * 12 + 2;
  });

  return safeY + 84;
}

function addFooterToAllPages(doc, archive) {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();

    doc.setDrawColor(110, 92, 72);
    doc.setLineWidth(0.4);
    doc.line(28, height - 28, width - 28, height - 28);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(128, 113, 97);
    doc.text(`TomeVault by Sneezing Donkey • ${asString(archive.sessionId, 'Onbekend')}`, 32, height - 14);
    doc.text(`Pagina ${page}/${pages}`, width - 90, height - 14);
  }
}

function drawCover(doc, archive, brandAssets = {}) {
  const width = doc.internal.pageSize.getWidth();
  const layoutVersion = asString(archive.layoutVersion, 'TV-PDF-R4');

  doc.setFillColor(18, 11, 11);
  doc.rect(0, 0, width, 220, 'F');

  doc.setDrawColor(120, 40, 40);
  doc.setLineWidth(1.3);
  doc.rect(26, 26, width - 52, 168);

  const rightPaneX = width * 0.5;
  const rightPaneY = 34;
  const rightPaneWidth = width - rightPaneX - 34;
  const rightPaneHeight = 152;

  doc.setDrawColor(140, 108, 72);
  doc.setLineWidth(0.45);
  doc.roundedRect(rightPaneX + 12, rightPaneY + 18, rightPaneWidth - 24, rightPaneHeight - 36, 10, 10, 'S');

  if (brandAssets.tomeVaultLogo) {
    const logoDataUrl = imageToDataUrl(brandAssets.tomeVaultLogo, 'image/png');
    if (logoDataUrl) {
      const logoSize = fitImageInBox(brandAssets.tomeVaultLogo, rightPaneWidth - 34, 74);
      const logoX = rightPaneX + ((rightPaneWidth - logoSize.width) / 2);
      const logoY = rightPaneY + ((rightPaneHeight - logoSize.height) / 2);
      doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoSize.width, logoSize.height, undefined, 'FAST');
    }
  }

  if (brandAssets.sneezingDonkeyMark) {
    const donkeyDataUrl = imageToDataUrl(brandAssets.sneezingDonkeyMark, 'image/png');
    if (donkeyDataUrl) {
      const donkeySize = fitImageInBox(brandAssets.sneezingDonkeyMark, 120, 84);
      const donkeyX = width - 42 - donkeySize.width;
      const donkeyY = 104;
      const canUseOpacity = typeof doc.GState === 'function' && typeof doc.setGState === 'function';
      if (canUseOpacity) {
        doc.setGState(new doc.GState({ opacity: 0.08 }));
      }
      doc.addImage(donkeyDataUrl, 'PNG', donkeyX, donkeyY, donkeySize.width, donkeySize.height, undefined, 'FAST');
      if (canUseOpacity) {
        doc.setGState(new doc.GState({ opacity: 1 }));
      }
    }
  }

  doc.setTextColor(241, 188, 106);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('TOMEVAULT', 42, 62);

  doc.setTextColor(188, 154, 118);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const modeLabel = archive.mode === 'gm' ? 'Grandmaster Chronicle Export' : 'Character Chronicle Export';
  doc.text(`TomeVault by Sneezing Donkey - ${modeLabel}`, 42, 78);

  doc.setTextColor(255, 242, 223);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(asString(archive.subjectName, 'Naamloze Avonturier'), 42, 124);

  doc.setTextColor(202, 186, 167);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Sessie: ${asString(archive.sessionId, 'Onbekend')}`, 42, 146);
  doc.text(`Exporttijd: ${toDisplayDate(archive.generatedAt)}`, 42, 162);
  doc.text(`Layout: ${layoutVersion}`, 42, 178);

  doc.setTextColor(141, 124, 103);
  doc.setFontSize(9);
  const scopeLabel = archive.mode === 'gm'
    ? 'Deze kroniek bevat een uitgebreide GM-export met sessiebreed overzicht.'
    : 'Deze kroniek bevat alle speler-zichtbare gegevens op het moment van export.';
  doc.text(scopeLabel, 42, 198);

  doc.setDrawColor(189, 151, 91);
  doc.setLineWidth(0.6);
  doc.line(42, 208, width - 42, 208);

  return 244;
}

export async function downloadPlayerArchivePdf(archive = {}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const sections = [];
  const brandAssets = await loadCoverBrandAssets();
  drawCover(doc, archive, brandAssets);

  doc.addPage();
  const tocPage = doc.getNumberOfPages();

  doc.addPage();
  let cursorY = 48;

  const startSection = (title, subtitle = '', minHeight = 120) => {
    sections.push({ title, page: doc.getNumberOfPages() });
    cursorY = withPageBreak(doc, cursorY, minHeight);
    cursorY = sectionTitle(doc, cursorY, title, subtitle);
  };

  const profile = archive.profile || {};
  const statRows = [
    ['Naam', asString(profile.name, archive.subjectName || 'Onbekend')],
    ['Titel', asString(profile.subtitle, '-')],
    ['HP', `${Number(profile.hp ?? 0)}/${Number(profile.maxHp ?? profile.hp ?? 0)}`],
    ['AC', String(Number(profile.ac ?? 10))],
    ['Initiative Mod', String(Number(profile.initMod ?? 0))],
  ].concat((profile.customStats || []).map((entry) => [
    asString(entry?.name, 'STAT'),
    String(Number(entry?.value ?? 0)),
  ]));

  startSection('Karakterprofiel', archive.mode === 'gm' ? 'Complete snapshot van het huidige geselecteerde karakter' : 'Persoonlijke status op exportmoment');
  autoTable(doc, {
    startY: cursorY,
    head: [['Veld', 'Waarde']],
    body: statRows,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 4 },
    ...tableBaseOptions(),
    headStyles: { fillColor: [77, 28, 28], textColor: [250, 223, 190] },
    bodyStyles: { fillColor: [250, 246, 240], textColor: [38, 25, 20] },
  });
  cursorY = (doc.lastAutoTable?.finalY || cursorY) + 20;

  cursorY = drawNarrativePanel(doc, cursorY, archive.mode === 'gm'
    ? [
        `Deze export draait in GM-modus en bevat uitgebreide sessie-inzichten naast spelersdata.`,
        `Gebruik dit document als operationele kroniek en audittrail voor voorbereiding en narratieve continuiteit.`,
      ]
    : [
        'Dit document bundelt jouw reis als speler: profiel, bezittingen, zichtbare handouts en je recente kroniek.',
        'Gebruik het als persoonlijke archive, recap of als overgangsdossier bij character death-events.',
      ]);

  if (archive.mode === 'gm' && archive.gmData) {
    startSection('GM Overzicht', 'Sessie-breed kernbeeld', 110);
    const gm = archive.gmData;
    autoTable(doc, {
      startY: cursorY,
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
      styles: { fontSize: 9, cellPadding: 4 },
      ...tableBaseOptions(),
      headStyles: { fillColor: [77, 28, 28], textColor: [250, 223, 190] },
      bodyStyles: { fillColor: [250, 246, 240], textColor: [38, 25, 20] },
    });
    cursorY = (doc.lastAutoTable?.finalY || cursorY) + 20;
  }

  const notes = Array.isArray(archive.notes) ? archive.notes : [];
  startSection('Reislog Notities', `${notes.length} notities`, 90);
  if (notes.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(110, 99, 88);
    doc.text('Geen notities aanwezig in deze export.', 44, cursorY + 12);
    cursorY += 24;
  } else {
    notes.slice(0, archive.mode === 'gm' ? 45 : 30).forEach((note, index) => {
      cursorY = withPageBreak(doc, cursorY, 92);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(64, 45, 34);
      doc.text(`${index + 1}. ${asString(note.title, 'Naamloze notitie')}`, 44, cursorY + 11);

      const excerpt = asString(note.content, '').replace(/\s+/g, ' ') || '-';
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(96, 83, 70);
      const wrapped = doc.splitTextToSize(excerpt, doc.internal.pageSize.getWidth() - 88).slice(0, 6);
      doc.text(wrapped, 44, cursorY + 26);
      cursorY += Math.min(86, wrapped.length * 12 + 18);
    });

    const shownNotes = archive.mode === 'gm' ? 45 : 30;
    if (notes.length > shownNotes) {
      doc.setFontSize(9);
      doc.setTextColor(120, 110, 98);
      doc.text(`+ ${notes.length - shownNotes} extra notities niet volledig afgedrukt in deze versie.`, 44, cursorY + 12);
      cursorY += 24;
    }
  }

  const inventoryRows = (archive.inventory || []).map((item) => [
    asString(item.name, 'Onbekend item'),
    String(Number(item.amount ?? 1)),
    asString(item.ownerName || item.ownerId || '-', '-'),
    getItemCategoryLabel(item.category),
    asString(item.desc, '-'),
  ]);

  startSection('Inventaris', `${inventoryRows.length} items`, 120);
  autoTable(doc, {
    startY: cursorY,
    head: [['Item', 'Aantal', 'Eigenaar', 'Categorie', 'Notitie']],
    body: inventoryRows.length ? inventoryRows : [['-', '-', '-', '-', 'Geen items in bezit']],
    theme: 'striped',
    styles: { fontSize: 8.5, cellPadding: 3.5, overflow: 'linebreak' },
    ...tableBaseOptions(),
    columnStyles: {
      0: { cellWidth: 110 },
      1: { cellWidth: 45 },
      2: { cellWidth: 95 },
      3: { cellWidth: 75 },
      4: { cellWidth: 'auto' },
    },
    headStyles: { fillColor: [77, 28, 28], textColor: [250, 223, 190] },
  });
  cursorY = (doc.lastAutoTable?.finalY || cursorY) + 18;

  const wallet = archive.wallet || {};
  startSection('Wallet', '', 90);
  autoTable(doc, {
    startY: cursorY,
    head: [['Munt', 'Aantal']],
    body: [
      ['Platinum', String(Number(wallet.platinum ?? 0))],
      ['Gold', String(Number(wallet.gold ?? 0))],
      ['Silver', String(Number(wallet.silver ?? 0))],
      ['Bronze', String(Number(wallet.bronze ?? 0))],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 4 },
    ...tableBaseOptions(),
    headStyles: { fillColor: [77, 28, 28], textColor: [250, 223, 190] },
  });
  cursorY = (doc.lastAutoTable?.finalY || cursorY) + 18;

  if (archive.mode === 'gm' && archive.gmData?.walletRows?.length) {
    startSection('Wallet Overzicht (Party)', `${archive.gmData.walletRows.length} eigenaars`, 120);
    autoTable(doc, {
      startY: cursorY,
      head: [['Eigenaar', 'PP', 'GP', 'SP', 'BP']],
      body: archive.gmData.walletRows,
      theme: 'striped',
      styles: { fontSize: 8.5, cellPadding: 3.5 },
      ...tableBaseOptions(),
      headStyles: { fillColor: [77, 28, 28], textColor: [250, 223, 190] },
    });
    cursorY = (doc.lastAutoTable?.finalY || cursorY) + 18;
  }

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

  const handoutHead = hasSecretColumn
    ? [['Titel', 'Type', 'Toegewezen', 'Publiek', 'Secret']]
    : [['Titel', 'Type', 'Toegewezen', 'Publiek']];

  const handoutEmpty = hasSecretColumn
    ? [['-', '-', '-', 'Geen zichtbare handouts', '-']]
    : [['-', '-', '-', 'Geen zichtbare handouts']];

  const handoutColumnStyles = hasSecretColumn
    ? {
        0: { cellWidth: 82 },
        1: { cellWidth: 50 },
        2: { cellWidth: 70 },
        3: { cellWidth: 130 },
        4: { cellWidth: 'auto' },
      }
    : {
        0: { cellWidth: 100 },
        1: { cellWidth: 60 },
        2: { cellWidth: 82 },
        3: { cellWidth: 'auto' },
      };

  startSection('Ervaren Handouts', `${handoutRows.length} zichtbaar`, 120);
  autoTable(doc, {
    startY: cursorY,
    head: handoutHead,
    body: handoutRows.length ? handoutRows : handoutEmpty,
    theme: 'striped',
    styles: { fontSize: 8.2, cellPadding: 3.5, overflow: 'linebreak' },
    ...tableBaseOptions(),
    columnStyles: handoutColumnStyles,
    headStyles: { fillColor: [77, 28, 28], textColor: [250, 223, 190] },
  });
  cursorY = (doc.lastAutoTable?.finalY || cursorY) + 18;

  const chatRows = (archive.chat || []).slice(-(archive.mode === 'gm' ? 180 : 80)).map((msg) => [
    asString(msg.author, 'Onbekend'),
    formatChatMomentLabel(msg),
    asString(msg.text, ''),
  ]);

  startSection('Chat Chronicle', `${chatRows.length} recente berichten`, 120);
  autoTable(doc, {
    startY: cursorY,
    head: [['Auteur', 'Moment', 'Bericht']],
    body: chatRows.length ? chatRows : [['-', '-', 'Geen berichten']],
    theme: 'plain',
    styles: { fontSize: 8.2, cellPadding: 3.5, overflow: 'linebreak' },
    ...tableBaseOptions(),
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 100 },
      2: { cellWidth: 'auto' },
    },
    headStyles: { fillColor: [77, 28, 28], textColor: [250, 223, 190] },
  });

  if (archive.mode === 'gm' && archive.gmData?.party?.length) {
    cursorY = (doc.lastAutoTable?.finalY || cursorY) + 18;
    startSection('Party Roster', `${archive.gmData.party.length} leden`, 120);
    autoTable(doc, {
      startY: cursorY,
      head: [['Naam', 'Rol', 'HP', 'AC', 'Init', 'Type']],
      body: archive.gmData.party.map((entry) => [
        asString(entry.name, 'Onbekend'),
        asString(entry.subtitle, '-'),
        `${Number(entry.hp ?? 0)}/${Number(entry.maxHp ?? entry.hp ?? 0)}`,
        String(Number(entry.ac ?? 10)),
        String(Number(entry.init ?? 0)),
        entry.isNpc ? 'NPC' : 'Speler',
      ]),
      theme: 'striped',
      styles: { fontSize: 8.2, cellPadding: 3.5 },
      ...tableBaseOptions(),
      headStyles: { fillColor: [77, 28, 28], textColor: [250, 223, 190] },
    });

    cursorY = (doc.lastAutoTable?.finalY || cursorY) + 18;
  }

  if (archive.mode === 'gm' && Array.isArray(archive.gmData?.preparations) && archive.gmData.preparations.length) {
    startSection('Voorbereidingen Bibliotheek', `${archive.gmData.preparations.length} entries`, 120);
    autoTable(doc, {
      startY: cursorY,
      head: [['Naam', 'Status', 'Speler', 'Laatste update']],
      body: archive.gmData.preparations.map((entry) => [
        asString(entry.name, 'Naamloos'),
        asString(entry.assignmentStatus, 'unassigned'),
        asString(entry.assignedToName || '-', '-'),
        formatDateShort(entry.updatedAtMs),
      ]),
      theme: 'striped',
      styles: { fontSize: 8.2, cellPadding: 3.5 },
      ...tableBaseOptions(),
      headStyles: { fillColor: [77, 28, 28], textColor: [250, 223, 190] },
    });
    cursorY = (doc.lastAutoTable?.finalY || cursorY) + 18;
  }

  if (archive.mode === 'gm' && Array.isArray(archive.gmData?.preparationBackups) && archive.gmData.preparationBackups.length) {
    startSection('Herstelpunten', `${archive.gmData.preparationBackups.length} backups`, 120);
    autoTable(doc, {
      startY: cursorY,
      head: [['Speler', 'Template', 'Aangemaakt', 'Hersteld']],
      body: archive.gmData.preparationBackups.map((entry) => [
        asString(entry.playerName, '-'),
        asString(entry.templateName, '-'),
        formatDateShort(entry.createdAtMs),
        formatDateShort(entry.restoredAtMs),
      ]),
      theme: 'striped',
      styles: { fontSize: 8.2, cellPadding: 3.5 },
      ...tableBaseOptions(),
      headStyles: { fillColor: [77, 28, 28], textColor: [250, 223, 190] },
    });
  }

  doc.setPage(tocPage);
  doc.setFillColor(25, 17, 17);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 120, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(245, 209, 152);
  doc.text('Inhoudsopgave', 34, 56);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(183, 161, 132);
  doc.text(`Exportmodus: ${archive.mode === 'gm' ? 'GM volledig' : 'Speler persoonlijk'}`, 34, 74);

  let tocY = 144;
  sections.forEach((entry, index) => {
    if (tocY > doc.internal.pageSize.getHeight() - 44) {
      doc.addPage();
      tocY = 44;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(66, 47, 37);
    doc.text(`${index + 1}. ${entry.title}`, 40, tocY);

    doc.setDrawColor(186, 166, 145);
    doc.setLineWidth(0.3);
    doc.line(170, tocY - 3, doc.internal.pageSize.getWidth() - 56, tocY - 3);

    doc.setFont('helvetica', 'normal');
    doc.text(String(entry.page), doc.internal.pageSize.getWidth() - 48, tocY);
    tocY += 20;
  });

  addFooterToAllPages(doc, archive);

  const safeName = asString(archive.subjectName, 'adventurer').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const safeSession = asString(archive.sessionId, 'session').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const mode = archive.mode === 'gm' ? 'gm' : 'player';
  const versionTag = asString(archive.layoutVersion, 'tv-pdf-r4').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const filename = `tomevault-${mode}-${safeName}-${safeSession}-${versionTag}-${new Date().toISOString().slice(0, 10)}.pdf`;

  doc.save(filename);
  return filename;
}

const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

/**
 * Helper to draw a sharp vector checkmark (tick) in PDFKit
 */
function drawTick(doc, cx, cy, size = 3.2) {
  doc.save();
  doc.lineWidth(1.1).strokeColor('#000000');
  doc.moveTo(cx - size, cy)
    .lineTo(cx - size / 3, cy + size)
    .lineTo(cx + size, cy - size)
    .stroke();
  doc.restore();
}

/**
 * Helper to draw a checkbox with optional tick
 */
function drawCheckbox(doc, x, y, size = 8, isChecked = false) {
  doc.save();
  doc.rect(x, y, size, size).lineWidth(0.8).strokeColor('#000000').stroke();
  if (isChecked) {
    drawTick(doc, x + size / 2, y + size / 2, size * 0.45);
  }
  doc.restore();
}

/**
 * Generates the Official 2-Page TCET Examination Application Form
 * Matching exact college template with 1cm (28.35pt) margins.
 */
function generatePdf(form, subjects, res) {
  // 1 cm = 28.35 points
  const MARGIN = 28.35;
  const doc = new PDFDocument({ margin: MARGIN, size: 'A4', autoFirstPage: true });
  doc.pipe(res);

  const PAGE_W = doc.page.width;   // 595.28
  const PAGE_H = doc.page.height;  // 841.89
  const L = MARGIN;                // 28.35
  const W = PAGE_W - 2 * MARGIN;   // 538.58
  const R = L + W;                 // 566.93

  const toRoman = (num) => {
    const roman = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
    return roman[num] || String(num || 'III');
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 1: EXAM APPLICATION FORM
  // ══════════════════════════════════════════════════════════════════════════
  const P1_H = PAGE_H - 2 * MARGIN; // 785.19

  // Outer Page 1 Border
  doc.rect(L, MARGIN, W, P1_H).lineWidth(0.8).strokeColor('#000000').stroke();

  // 1. College Header Banner (Image if available, or Vector header)
  const headerImgPath = path.join(__dirname, '../../assets/images/tcetheadder.png');
  let curY = MARGIN + 4;
  if (fs.existsSync(headerImgPath)) {
    try {
      doc.image(headerImgPath, L + 10, curY, { width: W - 20, height: 48, fit: [W - 20, 48] });
      curY += 52;
    } catch (e) {
      curY += 52;
    }
  } else {
    doc.font('Helvetica-Bold').fontSize(12).text('THAKUR COLLEGE OF ENGINEERING & TECHNOLOGY', L, curY + 6, { align: 'center', width: W });
    doc.font('Helvetica').fontSize(7.5).text('Autonomous Institute Affiliated to University of Mumbai | Accredited by NAAC & NBA', L, curY + 24, { align: 'center', width: W });
    curY += 52;
  }

  // Divider below header
  doc.moveTo(L, curY).lineTo(R, curY).lineWidth(0.8).stroke();

  // 2. Sub-header & Branch / Course Info
  curY += 6;
  const isFirstHalf = (form.exam_name || '').toLowerCase().includes('1st') || (form.exam_name || '').toLowerCase().includes('dec') || (form.exam_name || '').toLowerCase().includes('nov');
  const halfText = isFirstHalf ? '(1st half  / 2nd half  )' : '(1st half  / 2nd half  )';
  const examTypeUpper = (form.exam_type || 'REGULAR').toUpperCase();

  doc.font('Helvetica-Bold').fontSize(8)
    .text(`EXAMINATION FORM ${halfText} (${examTypeUpper}/SUPPLEMENTARY EXAMINATION)`, L, curY, { align: 'center', width: W });

  curY += 13;
  const branchName = (form.branch || 'COMPUTER ENGINEERING').toUpperCase();
  doc.font('Helvetica-Bold').fontSize(7.5)
    .text(`(Branch Name: ${branchName})`, L, curY, { align: 'center', width: W });

  curY += 12;
  const yearNames = {
    '1': 'FIRST YEAR (FE)',
    '2': 'SECOND YEAR (SE)',
    '3': 'THIRD YEAR (TE)',
    '4': 'FOURTH YEAR (BE)',
    '1D': 'FIRST YEAR (1D - DROP)',
    '2D': 'SECOND YEAR (2D - DROP)',
    '3D': 'THIRD YEAR (3D - DROP)',
    '4D': 'FOURTH YEAR (4D - DROP)',
    '1R': 'FIRST YEAR (1R - REPEATER)',
    '2R': 'SECOND YEAR (2R - REPEATER)',
    '3R': 'THIRD YEAR (3R - REPEATER)',
    '4R': 'FOURTH YEAR (4R - REPEATER)',
    1: 'FIRST YEAR (FE)',
    2: 'SECOND YEAR (SE)',
    3: 'THIRD YEAR (TE)',
    4: 'FOURTH YEAR (BE)',
    'FE': 'FIRST YEAR (FE)',
    'SE': 'SECOND YEAR (SE)',
    'TE': 'THIRD YEAR (TE)',
    'BE': 'FOURTH YEAR (BE)'
  };
  const yearText = String(yearNames[form.current_year] || (form.current_year ? `YEAR ${form.current_year}` : 'FOURTH YEAR (BE)')).toUpperCase();
  const semText = toRoman(form.current_semester || 7);
  const courseText = (form.course || 'CBCGS-HME 2023').toUpperCase();
  doc.font('Helvetica-Bold').fontSize(7.5)
    .text(`(YEAR: ${yearText} )    (SEMESTER- ${semText} )    (COURSE: ${courseText})`, L, curY, { align: 'center', width: W });

  curY += 13;
  doc.moveTo(L, curY).lineTo(R, curY).lineWidth(0.8).stroke();

  // 3. Student Personal Details & Photo Box
  const photoW = 75;
  const photoH = 88;
  const photoX = R - photoW - 6;
  const photoY = curY + 6;
  const detailsW = photoX - L - 10;

  // Draw Photo Frame
  doc.rect(photoX, photoY, photoW, photoH).lineWidth(0.6).stroke();
  doc.font('Helvetica').fontSize(6.5).fillColor('#64748b')
    .text('Affix Passport\nSize Photograph', photoX, photoY + 32, { width: photoW, align: 'center' });

  // Extract individual name components directly by splitting full_name
  const nameParts = (form.full_name || '').trim().split(/\s+/);
  const surname = (nameParts[0] || '').toUpperCase();
  const firstName = (nameParts[1] || '').toUpperCase();
  const fatherName = (nameParts[2] || '').toUpperCase();
  const motherName = (nameParts.slice(3).join(' ') || '').toUpperCase();

  // Column positions for the 4 name parts
  const xN1 = L + 142;
  const wN1 = 65;
  const xN2 = xN1 + wN1;
  const wN2 = 65;
  const xN3 = xN2 + wN2;
  const wN3 = 75;
  const xN4 = xN3 + wN3;
  const wN4 = 65;

  // Details Left Column
  let detY = curY + 5;
  doc.fillColor('#000000');

  // 1. Name in Full (Block Letters)
  doc.font('Helvetica-Bold').fontSize(7.5).text('1. NAME IN FULL', L + 6, detY);
  doc.font('Helvetica').fontSize(6.5).text('(BLOCK LETTERS)', L + 75, detY);

  doc.font('Helvetica-Bold').fontSize(8);
  doc.text(surname, xN1, detY, { width: wN1 - 4, lineBreak: false });
  doc.text(firstName, xN2, detY, { width: wN2 - 4, lineBreak: false });
  doc.text(fatherName, xN3, detY, { width: wN3 - 4, lineBreak: false });
  doc.text(motherName, xN4, detY, { width: wN4 - 4, lineBreak: false });

  detY += 12;
  doc.font('Helvetica').fontSize(5.5).fillColor('#475569');
  doc.text('(SURNAME)', xN1, detY, { width: wN1 });
  doc.text('(FIRST/OWN NAME)', xN2, detY, { width: wN2 });
  doc.text('(FATHER\'S NAME)', xN3, detY, { width: wN3 });
  doc.text('(MOTHER\'S NAME)', xN4, detY, { width: wN4 });

  detY += 13;
  doc.fillColor('#000000');
  // 2. Name in Devnagari / Regional Script
  doc.font('Helvetica-Bold').fontSize(7.5).text('2. NAME IN DEVNAGARI', L + 6, detY);
  doc.font('Helvetica').fontSize(6.5).text('(Regional Script)', L + 98, detY);

  doc.font('Helvetica-Bold').fontSize(8);
  doc.text(surname, xN1, detY, { width: wN1 - 4, lineBreak: false });
  doc.text(firstName, xN2, detY, { width: wN2 - 4, lineBreak: false });
  doc.text(fatherName, xN3, detY, { width: wN3 - 4, lineBreak: false });
  doc.text(motherName, xN4, detY, { width: wN4 - 4, lineBreak: false });

  detY += 12;
  doc.font('Helvetica').fontSize(5.5).fillColor('#475569');
  doc.text('(आडनाव / SURNAME)', xN1, detY, { width: wN1 });
  doc.text('(स्वतः चे नाव / FIRST)', xN2, detY, { width: wN2 });
  doc.text('(वडिलांचे नाव / FATHER)', xN3, detY, { width: wN3 });
  doc.text('(आईचे नाव / MOTHER)', xN4, detY, { width: wN4 });

  detY += 13;
  doc.fillColor('#000000');
  // 3. Complete Postal Address
  doc.font('Helvetica-Bold').fontSize(7).text('3. Complete Postal Address:', L + 6, detY);
  doc.font('Helvetica').fontSize(7.5).text(form.address || 'Kandivali (East), Mumbai - 400101, Maharashtra', L + 120, detY, { width: detailsW - 115, height: 18 });

  detY += 20;
  doc.font('Helvetica-Bold').fontSize(7)
    .text(`Contact Details: Mobile No.: `, L + 6, detY, { continued: true })
    .font('Helvetica').text(`${form.contact_number || '9579823812'}     and E-mail ID: `, { continued: true })
    .font('Helvetica-Bold').text(`${form.email}`);

  curY = photoY + photoH + 6;
  doc.moveTo(L, curY).lineTo(R, curY).lineWidth(0.8).stroke();

  // 5. Sex, Category, Student Type Section
  const row5H = 28;
  const colSexW = 110;
  const colCatW = 280;
  const colTypeW = W - colSexW - colCatW; // 148.58

  const xSex = L;
  const xCat = xSex + colSexW;
  const xType = xCat + colCatW;

  doc.rect(L, curY, W, row5H).lineWidth(0.8).stroke();
  doc.moveTo(xCat, curY).lineTo(xCat, curY + row5H).stroke();
  doc.moveTo(xType, curY).lineTo(xType, curY + row5H).stroke();

  // 4. Sex
  doc.font('Helvetica-Bold').fontSize(7).text('4. Sex', xSex + 5, curY + 3);
  const isMale = (form.gender || 'male').toLowerCase() === 'male' || (form.gender || '').toLowerCase() === 'm';
  drawCheckbox(doc, xSex + 8, curY + 14, 8, isMale);
  doc.font('Helvetica').fontSize(6.5).text('(M) MALE', xSex + 20, curY + 15);

  drawCheckbox(doc, xSex + 62, curY + 14, 8, !isMale);
  doc.font('Helvetica').fontSize(6.5).text('(F) FEMALE', xSex + 74, curY + 15);

  // 5. Category
  doc.font('Helvetica-Bold').fontSize(7).text('5. Category', xCat + 5, curY + 3);
  const cats = [
    { name: 'OPEN', code: '0' },
    { name: 'SC', code: '1' },
    { name: 'ST', code: '2' },
    { name: 'DT', code: '3' },
    { name: 'NT', code: '4' },
    { name: 'OBC', code: '5' },
    { name: 'SBC', code: '6' }
  ];
  const catCellW = colCatW / cats.length; // 40
  const activeCat = (form.category || 'open').toUpperCase();

  cats.forEach((c, idx) => {
    const cx = xCat + idx * catCellW;
    // vertical line
    if (idx > 0) doc.moveTo(cx, curY + 11).lineTo(cx, curY + row5H).stroke();
    doc.font('Helvetica-Bold').fontSize(6).text(c.name, cx, curY + 12, { width: catCellW, align: 'center' });
    doc.font('Helvetica').fontSize(5.5).text(c.code, cx, curY + 18, { width: catCellW, align: 'center' });
    if (activeCat.includes(c.name)) {
      drawTick(doc, cx + catCellW / 2, curY + 24, 3);
    }
  });

  // 6. Student Type
  doc.font('Helvetica-Bold').fontSize(7).text('6. Student Type', xType + 5, curY + 3);
  const isRepeater = !!form.repeters;
  const isPwd = !!form.pwd;

  drawCheckbox(doc, xType + 5, curY + 12, 7, !isRepeater);
  doc.font('Helvetica').fontSize(6.5).text('STUDENT', xType + 16, curY + 13);

  drawCheckbox(doc, xType + 60, curY + 12, 7, isRepeater);
  doc.font('Helvetica').fontSize(6.5).text('EX-STUDENT', xType + 71, curY + 13);

  drawCheckbox(doc, xType + 5, curY + 20, 7, isPwd);
  doc.font('Helvetica').fontSize(6.5).text('Phy. H.C. / Blind', xType + 16, curY + 21);

  curY += row5H;

  // 6. Academic Bank of Credits ID Box (7. ABC-ID)
  const row6H = 18;
  doc.rect(L, curY, W, row6H).stroke();
  doc.font('Helvetica-Bold').fontSize(7).text('7. Academic Bank of Credits ID:', L + 6, curY + 5);

  const abcId = form.abc_id || '124756391470';
  const boxStartX = L + 140;
  const numBoxes = 12;
  const digitBoxW = 14;
  const abcDigits = (abcId.replace(/\D/g, '') + '000000000000').substring(0, 12);

  for (let i = 0; i < numBoxes; i++) {
    const bx = boxStartX + i * digitBoxW;
    doc.rect(bx, curY + 2, digitBoxW, row6H - 4).stroke();
    doc.font('Helvetica-Bold').fontSize(8.5)
      .text(abcDigits[i] || '0', bx, curY + 4.5, { width: digitBoxW, align: 'center' });
  }

  curY += row6H;

  // 7. Examination Head Table (8. Examination Head)
  const tblHeadH = 26;
  doc.rect(L, curY, W, tblHeadH).stroke();

  doc.font('Helvetica-Bold').fontSize(7.5)
    .text('8. Examination Head (Regular/Supplementary)', L + 5, curY + 3);

  const colHeadNoW = 38;
  const colHeadNameW = 220;
  const colSubH1W = 75;
  const colSubH2W = 60;
  const colSubH3W = 70;
  const colSubH4W = W - colHeadNoW - colHeadNameW - colSubH1W - colSubH2W - colSubH3W; // ~75.58

  const xHNo = L;
  const xHName = xHNo + colHeadNoW;
  const xHS1 = xHName + colHeadNameW;
  const xHS2 = xHS1 + colSubH1W;
  const xHS3 = xHS2 + colSubH2W;
  const xHS4 = xHS3 + colSubH3W;

  const yTblHead = curY + 11;
  doc.moveTo(L, yTblHead).lineTo(R, yTblHead).stroke();

  // Vertical column dividers
  doc.moveTo(xHName, yTblHead).lineTo(xHName, curY + tblHeadH).stroke();
  doc.moveTo(xHS1, curY).lineTo(xHS1, curY + tblHeadH).stroke();
  doc.moveTo(xHS2, yTblHead).lineTo(xHS2, curY + tblHeadH).stroke();
  doc.moveTo(xHS3, yTblHead).lineTo(xHS3, curY + tblHeadH).stroke();
  doc.moveTo(xHS4, yTblHead).lineTo(xHS4, curY + tblHeadH).stroke();

  doc.font('Helvetica-Bold').fontSize(6.5)
    .text('Paper/\nSubject No.', xHNo, yTblHead + 2, { width: colHeadNoW, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(6.5)
    .text('Name of the Subject\n(As per Syllabus)', xHName, yTblHead + 2, { width: colHeadNameW, align: 'center' });

  doc.font('Helvetica-Bold').fontSize(6)
    .text('(Put (✓) if Claiming Exemption and   Put (X) if failed)', xHS1, curY + 2, { width: W - xHS1 + L, align: 'center' });

  doc.font('Helvetica-Bold').fontSize(5.5)
    .text('In-Semester\nAssessment/ Avg', xHS1, yTblHead + 2, { width: colSubH1W, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(6)
    .text('Theory', xHS2, yTblHead + 4, { width: colSubH2W, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(6)
    .text('Term Work', xHS3, yTblHead + 4, { width: colSubH3W, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(5.5)
    .text('Practical &\nOral', xHS4, yTblHead + 2, { width: colSubH4W, align: 'center' });

  curY += tblHeadH;

  // Render Subject Rows (Max 10 rows for clean grid)
  const maxRows = 10;
  const rowH = 13.5;

  for (let i = 0; i < maxRows; i++) {
    const sub = subjects[i];
    doc.rect(L, curY, W, rowH).stroke();
    doc.moveTo(xHName, curY).lineTo(xHName, curY + rowH).stroke();
    doc.moveTo(xHS1, curY).lineTo(xHS1, curY + rowH).stroke();
    doc.moveTo(xHS2, curY).lineTo(xHS2, curY + rowH).stroke();
    doc.moveTo(xHS3, curY).lineTo(xHS3, curY + rowH).stroke();
    doc.moveTo(xHS4, curY).lineTo(xHS4, curY + rowH).stroke();

    doc.font('Helvetica').fontSize(7).fillColor('#000000')
      .text(String(i + 1), xHNo, curY + 3, { width: colHeadNoW, align: 'center' });

    if (sub) {
      doc.font('Helvetica-Bold').fontSize(6.5)
        .text(sub.subject_name || sub.subject_code, xHName + 4, curY + 3, { width: colHeadNameW - 8, lineBreak: false });

      // Assessment Heads with Crisp Vector Ticks
      drawTick(doc, xHS1 + colSubH1W / 2, curY + 6.5, 3.2);
      if ((sub.max_marks_endsem || sub.ese || 0) > 0) {
        drawTick(doc, xHS2 + colSubH2W / 2, curY + 6.5, 3.2);
      }
      if ((sub.max_marks_tw || sub.tw || 0) > 0) {
        drawTick(doc, xHS3 + colSubH3W / 2, curY + 6.5, 3.2);
      }
      if ((sub.max_marks_pr || sub.or_pr || 0) > 0) {
        drawTick(doc, xHS4 + colSubH4W / 2, curY + 6.5, 3.2);
      }
    }
    curY += rowH;
  }

  // 8. Payment Section (9. Payment)
  const payTitleH = 11;
  doc.rect(L, curY, W, payTitleH).stroke();
  doc.font('Helvetica-Bold').fontSize(7).text('9. Payment', L + 4, curY + 2.5);
  curY += payTitleH;

  const payTblHeadH = 13;
  doc.rect(L, curY, W, payTblHeadH).stroke();

  const colPNo = 20;
  const colPPart = 70;
  const colPName = 95;
  const colPBr = 60;
  const colPRoll = 35;
  const colPAmt = 45;
  const colPDate = 50;
  const colPUTR = 105;
  const colPCont = W - colPNo - colPPart - colPName - colPBr - colPRoll - colPAmt - colPDate - colPUTR; // ~58.58

  const xP0 = L;
  const xP1 = xP0 + colPNo;
  const xP2 = xP1 + colPPart;
  const xP3 = xP2 + colPName;
  const xP4 = xP3 + colPBr;
  const xP5 = xP4 + colPRoll;
  const xP6 = xP5 + colPAmt;
  const xP7 = xP6 + colPDate;
  const xP8 = xP7 + colPUTR;

  // Header Titles
  doc.font('Helvetica-Bold').fontSize(5.5);
  doc.text('Sr.No', xP0, curY + 3.5, { width: colPNo, align: 'center' });
  doc.text('Particulars', xP1, curY + 3.5, { width: colPPart, align: 'center' });
  doc.text('Name of the Student', xP2, curY + 3.5, { width: colPName, align: 'center' });
  doc.text('Branch', xP3, curY + 3.5, { width: colPBr, align: 'center' });
  doc.text('Roll No.', xP4, curY + 3.5, { width: colPRoll, align: 'center' });
  doc.text('Paid Amt', xP5, curY + 3.5, { width: colPAmt, align: 'center' });
  doc.text('Payment Date', xP6, curY + 3.5, { width: colPDate, align: 'center' });
  doc.text('UTR No./Transaction ID NO.', xP7, curY + 3.5, { width: colPUTR, align: 'center' });
  doc.text('Contact No.', xP8, curY + 3.5, { width: colPCont, align: 'center' });

  // Column divider lines
  [xP1, xP2, xP3, xP4, xP5, xP6, xP7, xP8].forEach(xLine => {
    doc.moveTo(xLine, curY).lineTo(xLine, curY + payTblHeadH).stroke();
  });

  curY += payTblHeadH;

  // Payment Rows (1. Admission, 2. Examination, 3. Supplementary, 4. Form fee)
  const payRows = [
    { no: '1.', name: 'Admission', isFormFee: false },
    { no: '2.', name: 'Examination', isFormFee: false },
    { no: '3.', name: 'Supplementary', isFormFee: false },
    { no: '4.', name: 'Form fee', isFormFee: true }
  ];

  const pRowH = 13;
  const payDateFormatted = form.applied_at ? new Date(form.applied_at).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
  const utrNo = form.razorpay_payment_id || (form.payment_status === 'paid' ? 'pay_sim_928174' : 'PENDING');
  const rollNo = form.roll_no || form.student_id || '1';

  payRows.forEach(pr => {
    doc.rect(L, curY, W, pRowH).stroke();
    [xP1, xP2, xP3, xP4, xP5, xP6, xP7, xP8].forEach(xLine => {
      doc.moveTo(xLine, curY).lineTo(xLine, curY + pRowH).stroke();
    });

    doc.font('Helvetica').fontSize(6).fillColor('#000000');
    doc.text(pr.no, xP0, curY + 3, { width: colPNo, align: 'center' });
    doc.text(pr.name, xP1 + 3, curY + 3, { width: colPPart - 6 });

    if (pr.isFormFee) {
      doc.font('Helvetica-Bold').fontSize(5.5);
      doc.text(form.full_name || '', xP2 + 2, curY + 3, { width: colPName - 4, lineBreak: false });
      doc.text(branchName.substring(0, 14), xP3, curY + 3, { width: colPBr, align: 'center' });
      doc.text(String(rollNo), xP4, curY + 3, { width: colPRoll, align: 'center' });
      doc.text(`INR ${form.amount_paid || 1500}`, xP5, curY + 3, { width: colPAmt, align: 'center' });
      doc.text(payDateFormatted, xP6, curY + 3, { width: colPDate, align: 'center' });
      doc.text(utrNo, xP7 + 2, curY + 3, { width: colPUTR - 4, lineBreak: false, align: 'center' });
      doc.text(form.contact_number || '9579823812', xP8, curY + 3, { width: colPCont, align: 'center' });
    }

    curY += pRowH;
  });

  // 9. Bottom Section: 10. FOR REPEATER ONLY (Left) & 11. Details of Lower Examination (Right)
  const btmSectionH = P1_H - (curY - MARGIN) - 12; // remaining height
  const colBtmLeftW = 220;
  const colBtmRightW = W - colBtmLeftW;

  const xBtmL = L;
  const xBtmR = L + colBtmLeftW;

  doc.rect(L, curY, W, btmSectionH).stroke();
  doc.moveTo(xBtmR, curY).lineTo(xBtmR, curY + btmSectionH).stroke();

  // 10. FOR REPEATER ONLY
  doc.font('Helvetica-Bold').fontSize(7).text('10. FOR REPEATER ONLY', xBtmL + 5, curY + 4);
  const repGridY = curY + 14;
  const repGridH = 34;
  doc.rect(xBtmL + 5, repGridY, colBtmLeftW - 10, repGridH).stroke();
  doc.moveTo(xBtmL + 5, repGridY + 15).lineTo(xBtmL + colBtmLeftW - 5, repGridY + 15).stroke();
  doc.moveTo(xBtmL + (colBtmLeftW - 10) / 2 + 5, repGridY).lineTo(xBtmL + (colBtmLeftW - 10) / 2 + 5, repGridY + repGridH).stroke();

  doc.font('Helvetica-Bold').fontSize(6);
  doc.text('Last Seat No.', xBtmL + 5, repGridY + 4, { width: (colBtmLeftW - 10) / 2, align: 'center' });
  doc.text('Month & Year', xBtmL + (colBtmLeftW - 10) / 2 + 5, repGridY + 4, { width: (colBtmLeftW - 10) / 2, align: 'center' });

  doc.font('Helvetica').fontSize(6.5);
  doc.text(form.repeters ? '12315001' : '—', xBtmL + 5, repGridY + 20, { width: (colBtmLeftW - 10) / 2, align: 'center' });
  doc.text(form.repeters ? 'May 2026' : '—', xBtmL + (colBtmLeftW - 10) / 2 + 5, repGridY + 20, { width: (colBtmLeftW - 10) / 2, align: 'center' });

  doc.font('Helvetica-Bold').fontSize(6.5)
    .text('Attach mark sheet / Grade Card', xBtmL + 5, repGridY + repGridH + 12, { width: colBtmLeftW - 10, align: 'center' });

  // 11. Details of Lower Examination (if any)
  doc.font('Helvetica-Bold').fontSize(7).text('11. Details of Lower Examination (if any)', xBtmR + 6, curY + 4);
  const lowTblY = curY + 14;
  const lowCol1W = 60;
  const lowCol2W = colBtmRightW - 12 - lowCol1W;

  const lowRows = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  const lowRowH = 8.5;

  doc.rect(xBtmR + 6, lowTblY, colBtmRightW - 12, (lowRows.length + 1) * lowRowH).stroke();
  doc.moveTo(xBtmR + 6 + lowCol1W, lowTblY).lineTo(xBtmR + 6 + lowCol1W, lowTblY + (lowRows.length + 1) * lowRowH).stroke();
  doc.moveTo(xBtmR + 6, lowTblY + lowRowH).lineTo(xBtmR + colBtmRightW - 6, lowTblY + lowRowH).stroke();

  doc.font('Helvetica-Bold').fontSize(5.5);
  doc.text('Semester', xBtmR + 6, lowTblY + 2, { width: lowCol1W, align: 'center' });
  doc.text('Month and Year of Passing', xBtmR + 6 + lowCol1W, lowTblY + 2, { width: lowCol2W, align: 'center' });

  let curLowY = lowTblY + lowRowH;
  lowRows.forEach(sem => {
    doc.moveTo(xBtmR + 6, curLowY).lineTo(xBtmR + colBtmRightW - 6, curLowY).stroke();
    doc.font('Helvetica').fontSize(5.5).text(sem, xBtmR + 6, curLowY + 1.5, { width: lowCol1W, align: 'center' });
    curLowY += lowRowH;
  });

  doc.font('Helvetica-Bold').fontSize(6)
    .text('Attach Mark sheet / Grade Card', xBtmR + 6, curLowY + 3, { width: colBtmRightW - 12, align: 'center' });

  // P.T.O bottom right
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#000000')
    .text('P.T.O', R - 50, MARGIN + P1_H - 12, { width: 40, align: 'right' });

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 2: UNDERTAKING & OFFICE ENDORSEMENT
  // ══════════════════════════════════════════════════════════════════════════
  doc.addPage({ margin: MARGIN, size: 'A4' });

  // Outer Page 2 Border
  doc.rect(L, MARGIN, W, P1_H).lineWidth(0.8).strokeColor('#000000').stroke();

  // Page 2 Header Banner
  let p2Y = MARGIN + 16;
  if (fs.existsSync(headerImgPath)) {
    try {
      doc.image(headerImgPath, L + 10, p2Y, { width: W - 70, height: 42, fit: [W - 70, 42] });
      p2Y += 46;
    } catch (e) {
      p2Y += 46;
    }
  } else {
    doc.font('Helvetica-Bold').fontSize(12).text('THAKUR COLLEGE OF ENGINEERING & TECHNOLOGY', L, p2Y + 4, { align: 'center', width: W });
    p2Y += 46;
  }

  doc.moveTo(L, p2Y).lineTo(R, p2Y).lineWidth(0.8).stroke();

  // 12. Undertaking & 13. For Office Use Only Box Side-by-Side
  const p2SectionH = 340;
  const p2Col1W = 320;
  const p2Col2W = W - p2Col1W;

  const xP2L = L;
  const xP2R = L + p2Col1W;

  doc.rect(L, p2Y, W, p2SectionH).stroke();
  doc.moveTo(xP2R, p2Y).lineTo(xP2R, p2Y + p2SectionH).stroke();

  // Left Section (12. Undertaking)
  let uY = p2Y + 8;
  doc.font('Helvetica-Bold').fontSize(8).text('12.', xP2L + 6, uY);
  doc.font('Helvetica-Bold').fontSize(8).text('To, The Principal, Sir,', xP2L + 25, uY);

  uY += 16;
  doc.font('Helvetica').fontSize(7.5).fillColor('#000000')
    .text(
      'I request permission to present myself for the ensuing examination. I have paid the full prescribed admission fee as well as examination fees as per the details furnish above under point no. 8.',
      xP2L + 25, uY, { width: p2Col1W - 35, lineGap: 3 }
    );

  uY += 55;
  doc.font('Helvetica-Bold').fontSize(7.5)
    .text('Place:  Mumbai', xP2L + 25, uY)
    .text(`Date:   ${payDateFormatted}`, xP2L + 25, uY + 16);

  doc.font('Helvetica-Bold').fontSize(7.5)
    .text('Signature of the candidate', xP2L + 160, uY + 8);

  uY += 45;
  // Principal Seal & Signature
  doc.ellipse(xP2L + 80, uY + 25, 30, 20).lineWidth(0.8).stroke();
  doc.font('Helvetica-Bold').fontSize(7.5).text('Seal', xP2L + 65, uY + 20, { width: 30, align: 'center' });

  doc.font('Helvetica-Bold').fontSize(7.5)
    .text("Principal's Signature", xP2L + 175, uY + 25);

  uY += 80;
  doc.moveTo(xP2L, uY).lineTo(xP2R, uY).stroke();
  uY += 8;
  doc.font('Helvetica').fontSize(7)
    .text('Due date: _______________   Completion Date: _______________', xP2L + 15, uY)
    .text('If not as per the due date (Reason): _______________________________', xP2L + 15, uY + 16);

  // Right Section (13. For Office Use Only)
  let oY = p2Y + 8;
  doc.font('Helvetica-Bold').fontSize(8).text('13.', xP2R + 6, oY);

  const boxOfficeW = p2Col2W - 20;
  const boxOfficeH = 200;
  doc.rect(xP2R + 10, oY + 8, boxOfficeW, boxOfficeH).stroke();

  doc.font('Helvetica-Bold').fontSize(7.5)
    .text('For Office use only', xP2R + 10, oY + 14, { width: boxOfficeW, align: 'center' });

  let oFieldY = oY + 32;
  const addOfficeField = (label, val = '') => {
    doc.font('Helvetica').fontSize(6.5).text(label, xP2R + 15, oFieldY);
    if (val) {
      doc.font('Helvetica-Bold').fontSize(7).text(val, xP2R + 15, oFieldY + 10, { width: boxOfficeW - 10 });
      oFieldY += 24;
    } else {
      doc.moveTo(xP2R + 15, oFieldY + 18).lineTo(xP2R + boxOfficeW + 5, oFieldY + 18).stroke();
      oFieldY += 24;
    }
  };

  addOfficeField('Name of the Applicant:', (form.full_name || '').toUpperCase());
  addOfficeField('Branch/Class:', `${branchName} / ${yearText}`);
  addOfficeField('Roll No.:', String(rollNo));
  addOfficeField('Examination fees paid amount:', `INR ${form.amount_paid || 1500}.00`);
  addOfficeField('Remark (if any):', 'Verified & Form Approved');
  addOfficeField('Date: ________________    Signature: ________________');

  doc.font('Helvetica-Bold').fontSize(6.5)
    .text('Note: Separate examination form shall be submitted for each semester', xP2R + 10, oY + boxOfficeH + 20, { width: boxOfficeW, align: 'center', lineGap: 2 });

  doc.end();
}

/**
 * Generates Official TCET Admission Card / Hall Ticket PDF matching exact college layout.
 */
function generateAdmitCardPdf(form, schedules, res) {
  const doc = new PDFDocument({ margin: 25, size: 'A4' });
  doc.pipe(res);

  const PAGE_W = doc.page.width;   // ~595.28
  const LEFT_X = 25;
  const BOX_W = 545;
  const RIGHT_X = LEFT_X + BOX_W; // 570

  // Outer Border Box
  doc.rect(LEFT_X, 25, BOX_W, 792).lineWidth(1).strokeColor('#000000').stroke();

  // ── Header Text Section ──────────────────────────────────
  let curY = 40;

  doc.font('Times-Bold').fontSize(15).fillColor('#000000')
    .text('THAKUR COLLEGE OF ENGINEERING & TECHNOLOGY', LEFT_X, curY, { align: 'center', width: BOX_W });

  curY += 20;
  doc.font('Times-Italic').fontSize(9.5).fillColor('#000000')
    .text('An Autonomous Institute Affiliated to University of Mumbai', LEFT_X, curY, { align: 'center', width: BOX_W });

  curY += 16;
  doc.font('Times-Bold').fontSize(13).fillColor('#000000')
    .text('ADMISSION CARD', LEFT_X, curY, { align: 'center', width: BOX_W });

  curY += 18;
  doc.font('Times-Bold').fontSize(9.5).fillColor('#000000')
    .text('(CHOICE BASED CREDIT GRADING SCHEME - HME 2023)', LEFT_X, curY, { align: 'center', width: BOX_W });

  curY += 20;

  // ── Top Details Grid (SEMESTER | BRANCH | END SEMESTER EXAMINATION OF | SEAT NO. | M/F) ──
  const gridY = curY;
  const row1H = 20;
  const row2H = 25;
  const gridH = row1H + row2H;

  // Column Widths
  const wSem = 60;
  const wBranch = 65;
  const wExam = 250;
  const wSeat = 115;
  const wGender = 55;

  const xSem = LEFT_X;
  const xBranch = xSem + wSem;
  const xExam = xBranch + wBranch;
  const xSeat = xExam + wExam;
  const xGender = xSeat + wSeat;

  // Table Outer Box & Horizontal Line
  doc.rect(LEFT_X, gridY, BOX_W, gridH).stroke();
  doc.moveTo(LEFT_X, gridY + row1H).lineTo(RIGHT_X, gridY + row1H).stroke();

  // Vertical Divider Lines
  doc.moveTo(xBranch, gridY).lineTo(xBranch, gridY + gridH).stroke();
  doc.moveTo(xExam, gridY).lineTo(xExam, gridY + gridH).stroke();
  doc.moveTo(xSeat, gridY).lineTo(xSeat, gridY + gridH).stroke();
  doc.moveTo(xGender, gridY).lineTo(xGender, gridY + gridH).stroke();

  // Row 1: Header Labels
  doc.font('Times-Bold').fontSize(8.5);
  doc.text('SEMESTER', xSem, gridY + 5, { width: wSem, align: 'center' });
  doc.text('BRANCH', xBranch, gridY + 5, { width: wBranch, align: 'center' });
  doc.text('END SEMESTER EXAMINATION OF', xExam, gridY + 5, { width: wExam, align: 'center' });
  doc.text('SEAT NO.', xSeat, gridY + 5, { width: wSeat, align: 'center' });
  doc.text('M/F', xGender, gridY + 5, { width: wGender, align: 'center' });

  // Row 2: Values
  const getBranchCode = (bName) => {
    if (!bName) return 'COMP';
    const b = bName.toUpperCase();
    if (b.includes('COMPUTER')) return 'COMP';
    if (b.includes('INFORMATION') || b.includes('IT')) return 'IT';
    if (b.includes('ELECTRONICS') || b.includes('EXTC')) return 'EXTC';
    if (b.includes('MECHANICAL') || b.includes('MECH')) return 'MECH';
    if (b.includes('CIVIL')) return 'CIVIL';
    return bName.substring(0, 5).toUpperCase();
  };

  const branchCode = getBranchCode(form.branch || form.category);
  const examNameText = (form.exam_name || 'Second Year Engineering DECEMBER 2024').toUpperCase();
  const seatNo = form.admit_card_number || `123150${String(form.form_id).padStart(3, '0')}`;
  const gender = (form.gender || 'male').toLowerCase() === 'male' || (form.gender || 'male').toLowerCase() === 'm' ? 'M' : 'F';

  doc.font('Times-Roman').fontSize(9.5);
  doc.text(String(form.current_semester || 'III'), xSem, gridY + row1H + 7, { width: wSem, align: 'center' });
  doc.text(branchCode, xBranch, gridY + row1H + 7, { width: wBranch, align: 'center' });
  doc.text(examNameText, xExam + 5, gridY + row1H + 7, { width: wExam - 10, align: 'center' });
  doc.text(seatNo, xSeat, gridY + row1H + 7, { width: wSeat, align: 'center' });
  doc.text(gender, xGender, gridY + row1H + 7, { width: wGender, align: 'center' });

  curY = gridY + gridH;

  // ── Candidate Name Box + Photo Box Section ────────────────
  const nameBoxH = 95;
  const photoBoxW = 90;
  const nameBoxW = BOX_W - photoBoxW; // 455

  // Name Box
  doc.rect(LEFT_X, curY, nameBoxW, nameBoxH).stroke();
  doc.font('Times-Bold').fontSize(9.5).text('Candidate Name:', LEFT_X + 10, curY + 10);
  doc.font('Times-Roman').fontSize(11).text((form.full_name || 'STUDENT NAME').toUpperCase(), LEFT_X + 10, curY + 28, { width: nameBoxW - 20 });

  // Photo Box (Right side)
  const photoX = LEFT_X + nameBoxW;
  doc.rect(photoX, curY, photoBoxW, nameBoxH).stroke();
  doc.font('Times-Roman').fontSize(8.5).fillColor('#444444')
    .text('Candidate Photo', photoX, curY + 40, { width: photoBoxW, align: 'center' });
  doc.fillColor('#000000');

  curY += nameBoxH;

  // ── Course & Examination Timetable ────────────────────────
  const ttHeadH = 22;
  const colDateW = 85;
  const colTimeW = 145;
  const colSubW = 205;
  const colSignW = BOX_W - colDateW - colTimeW - colSubW; // 110

  const xDate = LEFT_X;
  const xTime = xDate + colDateW;
  const xSub = xTime + colTimeW;
  const xSign = xSub + colSubW;

  // Header Row
  doc.rect(LEFT_X, curY, BOX_W, ttHeadH).stroke();
  doc.moveTo(xTime, curY).lineTo(xTime, curY + ttHeadH).stroke();
  doc.moveTo(xSub, curY).lineTo(xSub, curY + ttHeadH).stroke();
  doc.moveTo(xSign, curY).lineTo(xSign, curY + ttHeadH).stroke();

  doc.font('Times-Bold').fontSize(8.5);
  doc.text('Date', xDate, curY + 6, { width: colDateW, align: 'center' });
  doc.text('Time', xTime, curY + 6, { width: colTimeW, align: 'center' });
  doc.text('Course Name', xSub, curY + 6, { width: colSubW, align: 'center' });
  doc.text("Jr. Supervisor's Sign", xSign, curY + 6, { width: colSignW, align: 'center' });

  curY += ttHeadH;

  // Render Schedule Rows (min 8 rows for official height)
  const totalRows = Math.max(schedules.length, 8);
  const rowHeight = 22;

  for (let i = 0; i < totalRows; i++) {
    const sch = schedules[i];
    doc.rect(LEFT_X, curY, BOX_W, rowHeight).stroke();
    doc.moveTo(xTime, curY).lineTo(xTime, curY + rowHeight).stroke();
    doc.moveTo(xSub, curY).lineTo(xSub, curY + rowHeight).stroke();
    doc.moveTo(xSign, curY).lineTo(xSign, curY + rowHeight).stroke();

    if (sch) {
      const examDateStr = sch.exam_date ? new Date(sch.exam_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'TBA';
      const timeStr = (sch.start_time && sch.end_time) ? `${sch.start_time} - ${sch.end_time}` : '10:00 AM - 01:00 PM';
      const subjectStr = `${sch.subject_code ? sch.subject_code + ' - ' : ''}${sch.subject_name}`;

      doc.font('Times-Roman').fontSize(8.5);
      doc.text(examDateStr, xDate, curY + 6, { width: colDateW, align: 'center' });
      doc.text(timeStr, xTime, curY + 6, { width: colTimeW, align: 'center' });
      doc.text(subjectStr, xSub + 5, curY + 6, { width: colSubW - 10 });
    }

    curY += rowHeight;
  }

  // ── Candidate Signature & Controller of Examinations ──────
  const signSectionH = 50;
  doc.rect(LEFT_X, curY, BOX_W, signSectionH).stroke();
  const halfSignW = BOX_W / 2; // 272.5
  doc.moveTo(LEFT_X + halfSignW, curY).lineTo(LEFT_X + halfSignW, curY + signSectionH).stroke();

  doc.font('Times-Bold').fontSize(9);
  doc.text("Candidate's Signature", LEFT_X + 15, curY + 32);
  doc.text('Controller of Examinations', LEFT_X + halfSignW, curY + 32, { width: halfSignW - 15, align: 'right' });

  curY += signSectionH;

  // ── Rules and Instructions ────────────────────────────────
  const rulesH = 792 - (curY - 25); // Fill up remaining height
  doc.rect(LEFT_X, curY, BOX_W, rulesH).stroke();

  doc.font('Times-Bold').fontSize(9).text('RULES AND INSTRUCTIONS', LEFT_X + 10, curY + 8);

  const instructions = [
    '1. Students must carry this official Admission Card and valid College ID to the examination hall for all scheduled papers.',
    '2. Candidates must be seated in the assigned examination room at least 15 minutes before the scheduled commencement.',
    '3. Possession of mobile phones, smartwatches, programmable calculators, or any unauthorized material inside the exam hall is strictly prohibited and constitutes Unfair Means.',
    '4. Candidates will not be permitted to leave the examination hall during the first 60 minutes and the last 10 minutes of the examination session.',
    '5. Verify all course codes and timetable dates carefully. In case of discrepancy, immediately report to the Examination Cell.'
  ];

  let instY = curY + 22;
  instructions.forEach((ins) => {
    doc.font('Times-Roman').fontSize(7.5).text(ins, LEFT_X + 10, instY, { width: BOX_W - 20, lineGap: 1.5 });
    instY += 18;
  });

  doc.end();
}

module.exports = {
  generatePdf,
  generateAdmitCardPdf
};

/**
 * Cleanzo Official Print & Invoice Engine
 * Generates standalone, formal A4 PDF-ready documents with official letterhead,
 * company registration, structured tables, QR verification, and official stamp.
 * Uses an isolated hidden iframe so it NEVER takes a screenshot of the dashboard.
 */

import { Order } from '@/types';

/**
 * Triggers printing of an HTML string inside a dedicated hidden iframe.
 * Avoids any pollution from the parent window or dashboard chrome.
 */
export function printHtmlDocument(title: string, htmlContent: string) {
  // Remove existing print iframes if any
  const existingFrame = document.getElementById('cleanzo-print-iframe');
  if (existingFrame) {
    existingFrame.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'cleanzo-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    console.error('Cannot access print iframe document');
    return;
  }

  doc.open();
  doc.write(htmlContent);
  doc.close();

  // Wait for images and resources to load before calling print
  iframe.contentWindow?.focus();
  setTimeout(() => {
    try {
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Print trigger error:', e);
    }
  }, 350);
}

/**
 * Generates an Official Printable Report (تقرير رسمي معتمد)
 */
export function generateOfficialReportHtml(options: {
  reportTitle: string;
  reportRef: string;
  periodLabel: string;
  generatedBy: string;
  summaryCards: Array<{ label: string; value: string | number; note?: string }>;
  tableHeaders: string[];
  tableRows: Array<Array<string | number>>;
  currency?: string;
  notes?: string;
}): string {
  const {
    reportTitle,
    reportRef,
    periodLabel,
    generatedBy,
    summaryCards,
    tableHeaders,
    tableRows,
    currency = 'ج.م',
    notes,
  } = options;

  const currentDate = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const currentTime = new Date().toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${reportTitle} - ${reportRef}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm 15mm 18mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif, 'Cairo', 'Almarai';
      color: #0F172A;
      background: #FFFFFF;
      line-height: 1.5;
      font-size: 11pt;
      padding: 0;
    }
    .report-container {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
    }
    /* Header Section */
    .header-table {
      width: 100%;
      border-bottom: 2.5px solid #0866C6;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .header-logo-box {
      vertical-align: middle;
      text-align: right;
    }
    .header-logo-box h1 {
      font-size: 20pt;
      font-weight: 900;
      color: #07345C;
      letter-spacing: -0.5px;
      display: inline-block;
    }
    .header-logo-box h1 span {
      color: #0866C6;
    }
    .header-subtitle {
      font-size: 9pt;
      color: #64748B;
      font-weight: 600;
      margin-top: 2px;
    }
    .header-meta-box {
      vertical-align: middle;
      text-align: left;
      font-size: 9pt;
      color: #334155;
    }
    .header-meta-badge {
      display: inline-block;
      background: #EAF8FC;
      color: #0866C6;
      font-weight: bold;
      padding: 3px 10px;
      border-radius: 6px;
      margin-bottom: 4px;
      border: 1px solid #B8E4F5;
      font-family: monospace;
    }
    /* Document Title Block */
    .doc-title-block {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-right: 4px solid #0866C6;
      padding: 10px 14px;
      border-radius: 8px;
      margin-bottom: 16px;
    }
    .doc-title-block h2 {
      font-size: 14pt;
      font-weight: 800;
      color: #07345C;
      margin-bottom: 4px;
    }
    .doc-title-details {
      font-size: 9pt;
      color: #475569;
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }
    /* Summary Cards */
    .summary-grid {
      display: table;
      width: 100%;
      margin-bottom: 18px;
      border-collapse: separate;
      border-spacing: 8px 0;
    }
    .summary-cell {
      display: table-cell;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 10px 12px;
      text-align: center;
      width: ${100 / Math.max(summaryCards.length, 1)}%;
    }
    .summary-label {
      font-size: 8.5pt;
      font-weight: 700;
      color: #64748B;
      margin-bottom: 3px;
    }
    .summary-value {
      font-size: 13pt;
      font-weight: 900;
      color: #07345C;
    }
    .summary-note {
      font-size: 7.5pt;
      color: #0866C6;
      font-weight: bold;
      margin-top: 2px;
    }
    /* Data Table */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 9.5pt;
    }
    .data-table th {
      background: #07345C;
      color: #FFFFFF;
      font-weight: 800;
      text-align: right;
      padding: 8px 10px;
      border: 1px solid #07345C;
    }
    .data-table td {
      padding: 7px 10px;
      border: 1px solid #CBD5E1;
      color: #1E293B;
    }
    .data-table tr:nth-child(even) td {
      background-color: #F8FAFC;
    }
    /* Official Seal & Signature Section */
    .footer-section {
      margin-top: 24px;
      padding-top: 14px;
      border-top: 1px solid #E2E8F0;
      page-break-inside: avoid;
    }
    .footer-table {
      width: 100%;
      border-collapse: collapse;
    }
    .seal-box {
      width: 40%;
      text-align: center;
      vertical-align: middle;
    }
    .official-stamp {
      display: inline-block;
      border: 2px dashed #0866C6;
      border-radius: 50%;
      width: 105px;
      height: 105px;
      padding: 8px;
      text-align: center;
      color: #07345C;
      font-size: 7.5pt;
      font-weight: bold;
      line-height: 1.2;
      background: rgba(0, 163, 224, 0.04);
      transform: rotate(-5deg);
    }
    .official-stamp .stamp-core {
      border: 1px solid #0866C6;
      border-radius: 50%;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .official-stamp .stamp-title {
      font-size: 8.5pt;
      font-weight: 900;
      color: #0866C6;
    }
    .signatures-box {
      width: 60%;
      vertical-align: top;
    }
    .sig-table {
      width: 100%;
    }
    .sig-cell {
      width: 50%;
      text-align: center;
      padding: 6px;
    }
    .sig-title {
      font-size: 9pt;
      font-weight: bold;
      color: #475569;
      margin-bottom: 35px;
    }
    .sig-line {
      border-bottom: 1.5px dotted #94A3B8;
      width: 80%;
      margin: 0 auto 4px auto;
    }
    .sig-note {
      font-size: 7.5pt;
      color: #94A3B8;
    }
    /* Legal note */
    .legal-notice {
      margin-top: 16px;
      text-align: center;
      font-size: 7.5pt;
      color: #64748B;
      border-top: 1px solid #E2E8F0;
      padding-top: 8px;
    }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- Header -->
    <table class="header-table">
      <tr>
        <td class="header-logo-box">
          <h1>CLEAN<span>ZO</span></h1>
          <div class="header-subtitle">منظومة كلينزو المتكاملة للعناية بالسيارات والمنازل • مصر</div>
          <div style="font-size: 8pt; color: #94A3B8; margin-top: 2px;">س.ت: 489210 • الرقم الضريبي: 620-149-835</div>
        </td>
        <td class="header-meta-box">
          <div class="header-meta-badge">${reportRef}</div>
          <div><strong>تاريخ الاستخراج:</strong> ${currentDate}</div>
          <div><strong>التوقيت:</strong> ${currentTime}</div>
          <div><strong>المشرف:</strong> ${generatedBy}</div>
        </td>
      </tr>
    </table>

    <!-- Document Title -->
    <div class="doc-title-block">
      <h2>${reportTitle}</h2>
      <div class="doc-title-details">
        <span><strong>النطاق الزمني:</strong> ${periodLabel}</span>
        <span><strong>العملة المعتمدة:</strong> الجنيه المصري (${currency})</span>
        <span><strong>نوع الوثيقة:</strong> تقرير تشغيلي ومالي رسمي</span>
      </div>
    </div>

    <!-- Summary Metrics -->
    ${
      summaryCards && summaryCards.length > 0
        ? `
    <div class="summary-grid">
      ${summaryCards
        .map(
          (c) => `
        <div class="summary-cell">
          <div class="summary-label">${c.label}</div>
          <div class="summary-value">${c.value}</div>
          ${c.note ? `<div class="summary-note">${c.note}</div>` : ''}
        </div>
      `
        )
        .join('')}
    </div>
    `
        : ''
    }

    <!-- Data Table -->
    <table class="data-table">
      <thead>
        <tr>
          ${tableHeaders.map((h) => `<th>${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${
          tableRows.length > 0
            ? tableRows
                .map(
                  (row) => `
              <tr>
                ${row.map((cell) => `<td>${cell !== null && cell !== undefined ? cell : '-'}</td>`).join('')}
              </tr>
            `
                )
                .join('')
            : `<tr><td colspan="${tableHeaders.length}" style="text-align:center; padding: 20px; color: #94A3B8;">لا توجد سجلات متاحة في هذه الفترة</td></tr>`
        }
      </tbody>
    </table>

    ${
      notes
        ? `
      <div style="background: #F1F5F9; border-radius: 6px; padding: 8px 12px; margin-bottom: 16px; font-size: 8.5pt; color: #334155;">
        <strong>ملاحظات الإدارة:</strong> ${notes}
      </div>
    `
        : ''
    }

    <!-- Official Seal & Signatures -->
    <div class="footer-section">
      <table class="footer-table">
        <tr>
          <td class="seal-box">
            <div class="official-stamp">
              <div class="stamp-core">
                <span class="stamp-title">CLEANZO</span>
                <span>معتمد رسمياً</span>
                <span>الإدارة العامة</span>
                <span style="font-size:6.5pt; margin-top:2px;">OFFICIAL REPORT</span>
              </div>
            </div>
          </td>
          <td class="signatures-box">
            <table class="sig-table">
              <tr>
                <td class="sig-cell">
                  <div class="sig-title">اعتماد مدير العمليات</div>
                  <div class="sig-line"></div>
                  <div class="sig-note">التوقيع والتاريخ</div>
                </td>
                <td class="sig-cell">
                  <div class="sig-title">اعتماد المدير المالي</div>
                  <div class="sig-line"></div>
                  <div class="sig-note">التوقيع والتاريخ</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <div class="legal-notice">
        هذا المستند وثيقة رسمية صادرة آلياً من منصة كلينزو الرقمية لإدارة الخدمات المتنقلة. جميع الحقوق محفوظة لشركة كلينزو © ${new Date().getFullYear()}
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generates an Official Tax Invoice (فاتورة ضريبية رسمية) for an order
 */
export function generateOfficialInvoiceHtml(order: Order, companySettings?: any): string {
  const invoiceNumber = `INV-${order.id.slice(-6).toUpperCase()}`;
  const invoiceDate = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : order.date;

  const statusLabel =
    order.status === 'completed'
      ? 'مدفوعة بالكامل (مسددة)'
      : order.status === 'confirmed'
      ? 'مؤكدة (قيد التنفيذ)'
      : order.status === 'cancelled'
      ? 'ملغاة'
      : 'قيد المعالجة';

  const statusColor =
    order.status === 'completed'
      ? '#059669'
      : order.status === 'cancelled'
      ? '#DC2626'
      : '#0866C6';

  const coupon = order.couponSnapshot || (order as any).coupon;
  const discountAmount =
    order.discount !== undefined && order.discount !== null
      ? Number(order.discount)
      : coupon?.discountAmount || coupon?.actualDiscountAmount || 0;

  const basePrice =
    order.basePrice !== undefined && order.basePrice !== null
      ? Number(order.basePrice)
      : (order as any).price || 0;
  const finalPrice =
    order.finalPrice !== undefined && order.finalPrice !== null
      ? Number(order.finalPrice)
      : Math.max(0, basePrice - discountAmount);
  const gov = order.address?.governorate || (order as any).governorate || 'المنيا';
  const city = order.address?.city || (order as any).city || 'المنيا الجديدة';
  const fullAddress =
    typeof order.address === 'string'
      ? order.address
      : `${order.address?.area || ''} ${order.address?.building ? `عمارة ${order.address.building}` : ''} ${order.address?.details || ''}`.trim() ||
        'العنوان المسجل لدى كلينزو';
  const techName = order.technician?.name || (order as any).technicianName || 'فريق كلينزو المتنقل';
  const serviceTitle =
    order.service?.title || (order as any).serviceTitle || 'خدمة تنظيف متنقلة';
  const packageName = order.packageSnapshot?.name
    ? ` • باقة: ${order.packageSnapshot.name}`
    : '';
  const addonsList = order.addons || (order as any).addOns || [];
  const vehicleDetails = (order as any).vehicleDetails;
  const homeDetails = (order as any).homeDetails;
  const paymentMethod = (order as any).paymentMethod || 'cash';

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>فاتورة رسمية - ${invoiceNumber}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm 15mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif, 'Cairo', 'Almarai';
      color: #0F172A;
      background: #FFFFFF;
      line-height: 1.5;
      font-size: 10.5pt;
    }
    .invoice-card {
      width: 100%;
      border: 1px solid #CBD5E1;
      border-radius: 12px;
      overflow: hidden;
    }
    /* Top Header */
    .inv-header {
      background: linear-gradient(135deg, #07345C 0%, #041728 100%);
      color: #FFFFFF;
      padding: 20px 24px;
    }
    .inv-header-table {
      width: 100%;
    }
    .inv-brand h1 {
      font-size: 22pt;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #FFFFFF;
    }
    .inv-brand h1 span {
      color: #0866C6;
    }
    .inv-brand p {
      font-size: 9pt;
      color: #94A3B8;
      margin-top: 2px;
    }
    .inv-meta-right {
      text-align: left;
    }
    .inv-meta-title {
      font-size: 16pt;
      font-weight: 900;
      color: #0866C6;
      margin-bottom: 4px;
    }
    .inv-number {
      font-size: 11pt;
      font-family: monospace;
      font-weight: bold;
      color: #FFFFFF;
    }
    .inv-status-pill {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 8.5pt;
      font-weight: bold;
      background: ${statusColor};
      color: #FFFFFF;
      margin-top: 6px;
    }
    /* Details Strip */
    .details-strip {
      padding: 18px 24px;
      background: #F8FAFC;
      border-bottom: 1px solid #E2E8F0;
    }
    .details-table {
      width: 100%;
      font-size: 9pt;
    }
    .details-table td {
      vertical-align: top;
      width: 50%;
      padding: 4px 8px;
    }
    .detail-heading {
      font-size: 10pt;
      font-weight: 800;
      color: #07345C;
      border-bottom: 1.5px solid #0866C6;
      padding-bottom: 4px;
      margin-bottom: 8px;
    }
    .detail-row {
      margin-bottom: 4px;
      color: #334155;
    }
    .detail-row strong {
      color: #0F172A;
    }
    /* Items Table */
    .items-box {
      padding: 20px 24px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    .items-table th {
      background: #F1F5F9;
      color: #07345C;
      font-weight: 800;
      text-align: right;
      padding: 10px 12px;
      font-size: 9.5pt;
      border-bottom: 2px solid #CBD5E1;
    }
    .items-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #E2E8F0;
      font-size: 9.5pt;
      color: #1E293B;
    }
    /* Total Box */
    .totals-table {
      width: 50%;
      margin-right: auto;
      border-collapse: collapse;
      font-size: 9.5pt;
    }
    .totals-table td {
      padding: 6px 12px;
    }
    .totals-table tr.grand-total td {
      font-size: 13pt;
      font-weight: 900;
      color: #07345C;
      border-top: 2px solid #0866C6;
      background: #EAF8FC;
      border-radius: 6px;
    }
    /* Notes & Guarantee */
    .invoice-footer-info {
      padding: 16px 24px;
      background: #FAFAFA;
      border-top: 1px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .guarantee-badge {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 8.5pt;
      color: #475569;
    }
    .official-invoice-seal {
      border: 2px dashed #059669;
      color: #059669;
      border-radius: 50%;
      width: 86px;
      height: 86px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 7.5pt;
      font-weight: bold;
      text-align: center;
      transform: rotate(-8deg);
      background: rgba(5, 150, 105, 0.05);
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <!-- Header -->
    <div class="inv-header">
      <table class="inv-header-table">
        <tr>
          <td class="inv-brand">
            <h1>CLEAN<span>ZO</span></h1>
            <p>شركة كلينزو للغسيل المتنقل والتعقيم بالبخار</p>
            <p style="font-size:8pt; color:#64748B;">المنيا الجديدة • خدمة العملاء: 01012345678 • care@cleanzo.app</p>
          </td>
          <td class="inv-meta-right">
            <div class="inv-meta-title">فاتورة ضريبية رسمية</div>
            <div class="inv-number">${invoiceNumber}</div>
            <div><span class="inv-status-pill">${statusLabel}</span></div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Client & Order Info -->
    <div class="details-strip">
      <table class="details-table">
        <tr>
          <td>
            <div class="detail-heading">بيانات العميل والطلب</div>
            <div class="detail-row"><strong>الاسم:</strong> ${order.customerName || 'عميل كلينزو'}</div>
            <div class="detail-row"><strong>رقم الهاتف:</strong> <span dir="ltr">${order.customerPhone || '-'}</span></div>
            <div class="detail-row"><strong>المحافظة / المدينة:</strong> ${gov} — ${city}</div>
            <div class="detail-row"><strong>العنوان التفصيلي:</strong> ${fullAddress}</div>
          </td>
          <td>
            <div class="detail-heading">تفاصيل الحجز والتنفيذ</div>
            <div class="detail-row"><strong>تاريخ الفاتورة:</strong> ${invoiceDate}</div>
            <div class="detail-row"><strong>موعد الخدمة المحدد:</strong> ${order.date} — ${order.time}</div>
            <div class="detail-row"><strong>الفني المسؤول:</strong> ${techName}</div>
            <div class="detail-row"><strong>طريقة الدفع:</strong> ${paymentMethod === 'card' ? 'بطاقة ائتمانية' : paymentMethod === 'wallet' ? 'محفظة إلكترونية' : 'دفع نقدي عند الاستلام (كاش)'}</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Items -->
    <div class="items-box">
      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 50%;">الخدمة / البند</th>
            <th style="width: 15%; text-align: center;">القطاع</th>
            <th style="width: 15%; text-align: center;">الكمية</th>
            <th style="width: 20%; text-align: left;">القيمة (ج.م)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>${serviceTitle}</strong>${packageName}
              ${
                vehicleDetails
                  ? `<div style="font-size: 8pt; color: #64748B; margin-top: 2px;">بيانات السيارة: ${vehicleDetails.make || ''} ${vehicleDetails.model || ''} (${vehicleDetails.plateNumber || ''})</div>`
                  : ''
              }
              ${
                homeDetails
                  ? `<div style="font-size: 8pt; color: #64748B; margin-top: 2px;">تفاصيل المكان: ${homeDetails.buildingType || 'منزل'} - مساحة: ${homeDetails.areaSize || 'قياسي'} م²</div>`
                  : ''
              }
            </td>
            <td style="text-align: center;">${order.category === 'car' ? '🚗 سيارات' : '🏠 منازل'}</td>
            <td style="text-align: center;">1</td>
            <td style="text-align: left; font-weight: bold;">${basePrice} ج.م</td>
          </tr>
          ${
            addonsList && addonsList.length > 0
              ? addonsList
                  .map(
                    (addon: any) => `
                <tr>
                  <td style="padding-right: 24px; color: #475569;">+ ${addon.name || addon.title}</td>
                  <td style="text-align: center; color: #64748B;">إضافة</td>
                  <td style="text-align: center;">1</td>
                  <td style="text-align: left; font-weight: bold;">${addon.price} ج.م</td>
                </tr>
              `
                  )
                  .join('')
              : ''
          }
        </tbody>
      </table>

      <!-- Totals Breakdown -->
      <table class="totals-table">
        <tr>
          <td>المجموع الأساسي:</td>
          <td style="text-align: left; font-weight: bold;">${basePrice} ج.م</td>
        </tr>
        ${
          discountAmount > 0
            ? `
          <tr style="color: #DC2626;">
            <td>خصم ترويجي ${coupon?.code ? `(كود: ${coupon.code})` : ''}:</td>
            <td style="text-align: left; font-weight: bold;">- ${discountAmount} ج.م</td>
          </tr>
        `
            : ''
        }
        <tr class="grand-total">
          <td>إجمالي الفاتورة الصافي:</td>
          <td style="text-align: left;">${finalPrice} ج.م</td>
        </tr>
      </table>
    </div>

    <!-- Official Seal & Footer -->
    <div class="invoice-footer-info">
      <div class="guarantee-badge">
        <div>
          <div style="font-weight: 800; color: #07345C; font-size: 9.5pt;">ضمان جودة كلينزو 100%</div>
          <div>معتمدة رسمياً وموثقة من الإدارة. في حال وجود أي استفسار يرجى الاتصال على 01012345678</div>
          <div style="font-size:7.5pt; color:#94A3B8; margin-top:2px;">الرقم الضريبي: 620-149-835 • الفاتورة الإلكترونية الموحدة</div>
        </div>
      </div>
      <div class="official-invoice-seal">
        <span style="font-size: 8pt; font-weight: 900;">CLEANZO</span>
        <span>فاتورة مسددة</span>
        <span>معتمد</span>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generates an Official Subscription Tax Invoice (فاتورة ضريبية رسمية لاشتراك دوري)
 */
export function generateOfficialSubscriptionInvoiceHtml(
  sub: any,
  companySettings?: any
): string {
  const subIdClean = String(sub.id || sub.subscriptionNumber || 'SUB').toUpperCase();
  const invoiceNumber = `INV-${subIdClean}`;
  const invoiceDate = sub.createdAt
    ? new Date(sub.createdAt).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

  const statusMap: Record<string, { label: string; color: string }> = {
    active: { label: 'اشتراك نشط وساري (مسدد)', color: '#059669' },
    completed: { label: 'مكتمل الزيارات بالكامل', color: '#0866C6' },
    expired: { label: 'منتهي الصلاحية', color: '#D97706' },
    cancelled: { label: 'اشتراك ملغي', color: '#DC2626' },
    paused: { label: 'اشتراك موقوف مؤقتاً', color: '#64748B' },
  };

  const statusInfo = statusMap[sub.status] || { label: sub.status || 'ساري', color: '#059669' };

  const planName =
    sub.planName || sub.plan?.name || sub.planSnapshot?.name || 'خطة اشتراك دوري';
  const serviceTitle =
    sub.serviceTitle || sub.service?.title || sub.serviceSnapshot?.title || 'خدمة تنظيف وغسيل متنقل';
  const categoryLabel = sub.category === 'home' ? '🏠 منازل' : '🚗 سيارات';
  const price = sub.price || 0;
  const totalVisits = sub.totalVisits || (sub.visits ? sub.visits.length : 0);
  const usedVisits = sub.usedVisits || 0;
  const remainingVisits =
    sub.remainingVisits !== undefined
      ? sub.remainingVisits
      : Math.max(0, totalVisits - usedVisits);

  const gov =
    sub.address?.governorate ||
    sub.address?.governorateNameSnapshot ||
    'المنيا';
  const city =
    sub.address?.city ||
    sub.address?.cityNameSnapshot ||
    'المنيا الجديدة';
  const fullAddress =
    typeof sub.address === 'string'
      ? sub.address
      : `${sub.address?.area || ''} ${sub.address?.building ? `عمارة ${sub.address.building}` : ''} ${sub.address?.details || ''}`.trim() ||
        'العنوان المسجل لدى كلينزو';

  const visitsList: any[] = Array.isArray(sub.visits) ? sub.visits : [];

  const visitStatusLabels: Record<string, string> = {
    completed: 'مكتملة ومسجلة',
    confirmed: 'مؤكدة',
    assigned: 'تم تعيين فني',
    pending: 'مجدولة بانتظار الموعد',
    in_progress: 'جاري التنفيذ',
    cancelled: 'ملغاة',
  };

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>فاتورة اشتراك رسمي - ${invoiceNumber}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm 15mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif, 'Cairo', 'Almarai';
      color: #0F172A;
      background: #FFFFFF;
      line-height: 1.5;
      font-size: 10.5pt;
    }
    .invoice-card {
      width: 100%;
      border: 1px solid #CBD5E1;
      border-radius: 12px;
      overflow: hidden;
    }
    .inv-header {
      background: linear-gradient(135deg, #07345C 0%, #041728 100%);
      color: #FFFFFF;
      padding: 20px 24px;
    }
    .inv-header-table {
      width: 100%;
    }
    .inv-brand h1 {
      font-size: 22pt;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #FFFFFF;
    }
    .inv-brand h1 span {
      color: #0866C6;
    }
    .inv-brand p {
      font-size: 9pt;
      color: #94A3B8;
      margin-top: 2px;
    }
    .inv-meta-right {
      text-align: left;
    }
    .inv-meta-title {
      font-size: 16pt;
      font-weight: 900;
      color: #0866C6;
      margin-bottom: 4px;
    }
    .inv-number {
      font-size: 11pt;
      font-family: monospace;
      font-weight: bold;
      color: #FFFFFF;
    }
    .inv-status-pill {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 8.5pt;
      font-weight: bold;
      background: ${statusInfo.color};
      color: #FFFFFF;
      margin-top: 6px;
    }
    .details-strip {
      padding: 18px 24px;
      background: #F8FAFC;
      border-bottom: 1px solid #E2E8F0;
    }
    .details-table {
      width: 100%;
      font-size: 9pt;
    }
    .details-table td {
      vertical-align: top;
      width: 50%;
      padding: 4px 8px;
    }
    .detail-heading {
      font-size: 10pt;
      font-weight: 800;
      color: #07345C;
      border-bottom: 1.5px solid #0866C6;
      padding-bottom: 4px;
      margin-bottom: 8px;
    }
    .detail-row {
      margin-bottom: 4px;
      color: #334155;
    }
    .detail-row strong {
      color: #0F172A;
    }
    .items-box {
      padding: 20px 24px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    .items-table th {
      background: #F1F5F9;
      color: #07345C;
      font-weight: 800;
      text-align: right;
      padding: 10px 12px;
      font-size: 9.5pt;
      border-bottom: 2px solid #CBD5E1;
    }
    .items-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #E2E8F0;
      font-size: 9.5pt;
      color: #1E293B;
    }
    .totals-table {
      width: 50%;
      margin-right: auto;
      border-collapse: collapse;
      font-size: 9.5pt;
    }
    .totals-table td {
      padding: 6px 12px;
    }
    .totals-table tr.grand-total td {
      font-size: 13pt;
      font-weight: 900;
      color: #07345C;
      border-top: 2px solid #0866C6;
      background: #EAF8FC;
      border-radius: 6px;
    }
    .visits-box {
      padding: 0 24px 20px 24px;
    }
    .visits-title {
      font-size: 10pt;
      font-weight: 800;
      color: #07345C;
      margin-bottom: 8px;
    }
    .visits-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5pt;
    }
    .visits-table th {
      background: #F8FAFC;
      padding: 6px 8px;
      border: 1px solid #E2E8F0;
      color: #475569;
      font-weight: 700;
    }
    .visits-table td {
      padding: 6px 8px;
      border: 1px solid #E2E8F0;
      color: #334155;
    }
    .invoice-footer-info {
      padding: 16px 24px;
      background: #FAFAFA;
      border-top: 1px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .guarantee-badge {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 8.5pt;
      color: #475569;
    }
    .official-invoice-seal {
      border: 2px dashed #059669;
      color: #059669;
      border-radius: 50%;
      width: 86px;
      height: 86px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 7.5pt;
      font-weight: bold;
      text-align: center;
      transform: rotate(-8deg);
      background: rgba(5, 150, 105, 0.05);
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="inv-header">
      <table class="inv-header-table">
        <tr>
          <td class="inv-brand">
            <h1>CLEAN<span>ZO</span></h1>
            <p>شركة كلينزو للغسيل والتعقيم المتنقل • منظومة الاشتراكات الدورية</p>
            <p style="font-size:8pt; color:#94A3B8;">المنيا الجديدة • خدمة العملاء: 01012345678 • subscriptions@cleanzo.app</p>
          </td>
          <td class="inv-meta-right">
            <div class="inv-meta-title">فاتورة اشتراك دوري معتمد</div>
            <div class="inv-number">${invoiceNumber}</div>
            <div><span class="inv-status-pill">${statusInfo.label}</span></div>
          </td>
        </tr>
      </table>
    </div>

    <div class="details-strip">
      <table class="details-table">
        <tr>
          <td>
            <div class="detail-heading">بيانات المشترك</div>
            <div class="detail-row"><strong>الاسم:</strong> ${sub.customerName || 'عميل كلينزو'}</div>
            <div class="detail-row"><strong>رقم الهاتف:</strong> <span dir="ltr">${sub.customerPhone || '-'}</span></div>
            <div class="detail-row"><strong>المحافظة / المدينة:</strong> ${gov} — ${city}</div>
            <div class="detail-row"><strong>العنوان:</strong> ${fullAddress}</div>
            ${
              sub.vehicleDetails
                ? `<div class="detail-row"><strong>بيانات المركبة:</strong> ${sub.vehicleDetails.make || ''} ${sub.vehicleDetails.model || ''} (${sub.vehicleDetails.plateNumber || ''})</div>`
                : ''
            }
          </td>
          <td>
            <div class="detail-heading">تفاصيل الاشتراك والعقد</div>
            <div class="detail-row"><strong>رقم الاشتراك:</strong> ${sub.id || sub.subscriptionNumber}</div>
            <div class="detail-row"><strong>تاريخ الفاتورة:</strong> ${invoiceDate}</div>
            <div class="detail-row"><strong>فترة سريان الاشتراك:</strong> ${sub.startDate || '-'} إلى ${sub.endDate || '-'}</div>
            <div class="detail-row"><strong>دورة التجديد:</strong> الدورة رقم ${sub.renewalCycle || 1} ${sub.autoRenew ? '(تجديد تلقائي مفعل)' : ''}</div>
            <div class="detail-row"><strong>رصيد الزيارات:</strong> ${usedVisits} من ${totalVisits} زيارة منفذة (${remainingVisits} زيارة متبقية)</div>
          </td>
        </tr>
      </table>
    </div>

    <div class="items-box">
      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 50%;">باقة الاشتراك / الخدمة</th>
            <th style="width: 15%; text-align: center;">القطاع</th>
            <th style="width: 15%; text-align: center;">عدد الزيارات</th>
            <th style="width: 20%; text-align: left;">القيمة التعاقدية (ج.م)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>${planName}</strong>
              <div style="font-size: 8.5pt; color: #64748B; margin-top: 3px;">
                الخدمة الأساسية: ${serviceTitle} • مدة الصلاحية: 30 يوماً
              </div>
            </td>
            <td style="text-align: center;">${categoryLabel}</td>
            <td style="text-align: center; font-weight: bold;">${totalVisits} زيارة</td>
            <td style="text-align: left; font-weight: bold;">${price} ج.م</td>
          </tr>
        </tbody>
      </table>

      <table class="totals-table">
        <tr>
          <td>قيمة الباقة الأساسية:</td>
          <td style="text-align: left; font-weight: bold;">${price} ج.م</td>
        </tr>
        <tr class="grand-total">
          <td>إجمالي الفاتورة المسدد:</td>
          <td style="text-align: left;">${price} ج.م</td>
        </tr>
      </table>
    </div>

    ${
      visitsList.length > 0
        ? `
    <div class="visits-box">
      <div class="visits-title">جدول مواعيد زيارات الاشتراك المجددة والمعتمدة (${visitsList.length} زيارات)</div>
      <table class="visits-table">
        <thead>
          <tr>
            <th style="width: 10%;">#</th>
            <th style="width: 25%;">التاريخ والموعد</th>
            <th style="width: 35%;">ملاحظات وتفاصيل الزيارة</th>
            <th style="width: 30%;">حالة الزيارة</th>
          </tr>
        </thead>
        <tbody>
          ${visitsList
            .map(
              (v: any, idx: number) => `
            <tr>
              <td style="text-align: center; font-weight: bold;">الزيارة ${v.visitIndex || idx + 1}</td>
              <td style="font-family: monospace;">${v.date || '-'} (${v.time || '-'})</td>
              <td>${v.rescheduledFrom ? `<span style="color:#D97706;">معاد جدولتها من: ${v.rescheduledFrom}</span>` : 'موعد مجدول اعتيادي'}</td>
              <td><span style="font-weight: bold;">${visitStatusLabels[v.status] || v.status}</span></td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
    `
        : ''
    }

    <div class="invoice-footer-info">
      <div class="guarantee-badge">
        <div>
          <div style="font-weight: 800; color: #07345C; font-size: 9.5pt;">ضمان جودة كلينزو 100% لاشتراكات العناية المتنقلة</div>
          <div>هذه الفاتورة وثيقة مالية وتشغيلية رسمية صادرة آلياً ومسجلة بسجلات شركة كلينزو.</div>
          <div style="font-size:7.5pt; color:#94A3B8; margin-top:2px;">الرقم الضريبي: 620-149-835 • س.ت: 489210 • منصة الاشتراكات الموحدة</div>
        </div>
      </div>
      <div class="official-invoice-seal">
        <span style="font-size: 8pt; font-weight: 900;">CLEANZO</span>
        <span>اشتراك مسدد</span>
        <span>معتمد رسمياً</span>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}


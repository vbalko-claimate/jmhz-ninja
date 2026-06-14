import { Document, Page, Text, View, StyleSheet, Font, renderToBuffer } from '@react-pdf/renderer';
import path from 'node:path';
import React from 'react';
import type { PayrollExport } from './data';
import { monthLabel } from '@/lib/utils';

// The built-in PDF fonts (Helvetica) only cover Latin-1, so Czech caron
// letters (č ě ř š ž ň ů …) silently dropped. DejaVu Sans has full Czech
// coverage. lib/ is copied into the runtime image (see Dockerfile) and the
// server runs from the app root, so resolve the TTFs via process.cwd().
const FONT_DIR = path.join(process.cwd(), 'lib', 'exports', 'fonts');
Font.register({
  family: 'DejaVuSans',
  fonts: [
    { src: path.join(FONT_DIR, 'DejaVuSans.ttf') },
    { src: path.join(FONT_DIR, 'DejaVuSans-Bold.ttf'), fontWeight: 'bold' },
  ],
});

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: 'DejaVuSans' },
  h1: { fontSize: 16, marginBottom: 4, fontWeight: 'bold' },
  sub: { fontSize: 9, color: '#666', marginBottom: 12 },
  row: { flexDirection: 'row', borderBottom: '1px solid #ddd', paddingVertical: 4 },
  cellName: { flex: 2 },
  cellRight: { flex: 1, textAlign: 'right' },
  headerRow: { flexDirection: 'row', borderBottom: '2px solid #333', paddingVertical: 4, fontWeight: 'bold' },
  totalRow: { flexDirection: 'row', paddingVertical: 6, borderTop: '2px solid #333', marginTop: 4, fontWeight: 'bold' },
});

function PayrollPdf({ data }: { data: PayrollExport }) {
  let sumGross = 0,
    sumTax = 0,
    sumNet = 0;
  data.rows.forEach((r) => {
    sumGross += Number(r.totalGross);
    sumTax += Number(r.taxAmount);
    sumNet += Number(r.netAmount);
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>
          {data.appConfig.svjName || '(SVJ)'} — Payroll {monthLabel(data.month)} {data.year}
        </Text>
        <Text style={styles.sub}>
          IČO: {data.appConfig.svjIco || '-'} · Stav: {data.period.status}
        </Text>

        <View style={styles.headerRow}>
          <Text style={styles.cellName}>Zaměstnanec</Text>
          <Text style={styles.cellRight}>Základ</Text>
          <Text style={styles.cellRight}>Bonus</Text>
          <Text style={styles.cellRight}>Hrubá</Text>
          <Text style={styles.cellRight}>Daň</Text>
          <Text style={styles.cellRight}>Čistá</Text>
        </View>

        {data.rows.map((r) => (
          <View key={r.employeeId} style={styles.row}>
            <Text style={styles.cellName}>
              {r.lastName} {r.firstName}
            </Text>
            <Text style={styles.cellRight}>{r.baseReward}</Text>
            <Text style={styles.cellRight}>{r.extraReward}</Text>
            <Text style={styles.cellRight}>{r.totalGross}</Text>
            <Text style={styles.cellRight}>{r.taxAmount}</Text>
            <Text style={styles.cellRight}>{r.netAmount}</Text>
          </View>
        ))}

        <View style={styles.totalRow}>
          <Text style={styles.cellName}>CELKEM</Text>
          <Text style={styles.cellRight}></Text>
          <Text style={styles.cellRight}></Text>
          <Text style={styles.cellRight}>{sumGross.toFixed(2)}</Text>
          <Text style={styles.cellRight}>{sumTax.toFixed(2)}</Text>
          <Text style={styles.cellRight}>{sumNet.toFixed(2)}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function payrollToPdfBuffer(data: PayrollExport): Promise<Buffer> {
  return renderToBuffer(<PayrollPdf data={data} />);
}

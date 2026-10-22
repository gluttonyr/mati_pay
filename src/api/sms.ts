import client from './client';

export type SmsStatut = 'ATTRIBUE' | 'SANS_TRANSACTION' | 'A_RAPPROCHER' | 'IGNORE';

export type Sms = {
  trackingId: string;
  expediteur: string;
  corps: string;
  receivedAt: string;
  operateur: string | null;
  montant: number | string | null;
  telephone: string | null;
  reference: string | null;
  statut: SmsStatut;
  origineAttribution: 'AUTO_MATI_PAY' | 'MATISTORE' | 'MANUEL' | null;
  motif: string | null;
  createdAt: string;
  updatedAt: string;
  transaction: {
    trackingId: string;
    statut: string;
    montant: number | string;
    numeroTelephone: string | null;
    createdAt: string;
    client: string | null;
  } | null;
  attribuePar: string | null;
};

export type SmsPage = { items: Sms[]; total: number; counts: { SANS_TRANSACTION: number; A_RAPPROCHER: number } };

export type ListSmsParams = { page: number; limit: number; statut?: SmsStatut; search?: string; transactionId?: string };

export const listSms = async (params: ListSmsParams) =>
  (await client.get('/sms-capture', { params })).data.data as SmsPage;

export const getSms = async (id: string) => (await client.get(`/sms-capture/${id}`)).data.data as Sms;

export const smsCandidates = async (transactionId: string) =>
  (await client.get('/sms-capture/candidates', { params: { transactionId } })).data.data as Sms[];

export const fmtMontant = (m: number | string | null) =>
  m == null ? '—' : `${Number(m).toLocaleString('fr-FR')} FCFA`;

export type AssignResult = { transactionId: string; creditSucceeded: boolean };

export const assignSms = async (smsId: string, transactionId: string, confirmPhoneMismatch: boolean) =>
  (await client.post(`/sms-capture/${smsId}/assign`, { transactionId, confirmPhoneMismatch })).data.data as AssignResult;

// Backend phonesMatch: digits only, equal or the shorter (>= 8 digits) is a suffix of the longer.
export const phonesMatch = (first: string, second: string) => {
  const a = first.replace(/\D/g, '');
  const b = second.replace(/\D/g, '');
  if (!a || !b) return false;
  if (a === b) return true;
  const [s, l] = a.length < b.length ? [a, b] : [b, a];
  return s.length >= 8 && l.endsWith(s);
};

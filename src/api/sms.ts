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

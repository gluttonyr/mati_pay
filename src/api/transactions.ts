import client from './client';

export type Transaction = {
  trackingId: string;
  userName?: string;
  type: 'DEPOT' | 'RETRAIT';
  statut: string;
  montant: number | string;
  operateur?: string;
  numeroTelephone?: string;
  referencePaiement?: string;
  valideParId?: number;
  captureReconciliationRequired: boolean;
  motifRejet?: string | null;
  createdAt: string;
};

export type TransactionPage = {
  items: Transaction[];
  total: number;
  hasMore: boolean;
  counts: { claims: number; captureReconciliation: number };
};

export type ListTransactionsParams = {
  page: number;
  limit: number;
  search?: string;
  type?: 'DEPOT' | 'RETRAIT';
  status?: string;
  captureReconciliation?: boolean;
  open?: boolean;
};

export const listTransactions = async (params: ListTransactionsParams) =>
  (await client.get('/transactions/admin', { params })).data.data as TransactionPage;

export const getTransaction = async (id: string) =>
  (await client.get(`/transactions/${id}`)).data.data as Transaction;

export const STATUT_LABEL: Record<string, { label: string; tone: 'success' | 'warning' | 'error' | 'neutral' }> = {
  EN_ATTENTE_AUTO: { label: 'En attente', tone: 'warning' },
  EN_VERIFICATION: { label: 'En vérification', tone: 'warning' },
  EN_ATTENTE_PREUVE: { label: 'Preuve attendue', tone: 'warning' },
  EN_ATTENTE_ADMIN: { label: 'À traiter', tone: 'warning' },
  EN_RECLAMATION: { label: 'Réclamation', tone: 'error' },
  VALIDEE: { label: 'Validée', tone: 'success' },
  REJETEE: { label: 'Refusée', tone: 'error' },
  ANNULEE: { label: 'Annulée', tone: 'neutral' },
};

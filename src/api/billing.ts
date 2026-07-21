import client from './client';
import type {
  BillingPlansResponse, BillingCredits, BillingSummary,
  BillingPlanId, CheckoutResponse, CancelSubscriptionResponse,
  InvoiceDateRange, InvoicesResponse, InvoicePdfResponse,
  StartTrialPlan, StartTrialResponse,
} from '../types';

export const getBillingPlans = () =>
  client.get<BillingPlansResponse>('/billing/plans');

export const getBillingCredits = () =>
  client.get<BillingCredits>('/billing/credits');

export const getBillingSummary = () =>
  client.get<BillingSummary>('/billing/summary');

export const createCheckout = (planId: BillingPlanId) =>
  client.post<CheckoutResponse>('/billing/checkout', { plan_id: planId });

export const cancelSubscription = () =>
  client.post<CancelSubscriptionResponse>('/billing/cancel');

export const startTrial = (plan: StartTrialPlan) =>
  client.post<StartTrialResponse>('/billing/start-trial', { plan });

export const getInvoices = (dateRange: InvoiceDateRange = 'all', page = 1, pageSize = 20) =>
  client.get<InvoicesResponse>('/billing/invoices', {
    date_range: dateRange,
    page: String(page),
    page_size: String(pageSize),
  });

export const getInvoicePdfUrl = (invoiceId: string) =>
  client.get<InvoicePdfResponse>(`/billing/invoices/${invoiceId}/pdf`).then((r) => r.pdf_url);

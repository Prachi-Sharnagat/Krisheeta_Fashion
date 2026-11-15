import { getToken } from './auth';

const API_BASE = 'http://localhost:5000/api';

export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export interface RazorpayOrderResponse {
  success: boolean;
  data?: {
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
  };
  error?: string;
}

export const createRazorpayOrder = async (invoiceId: string): Promise<RazorpayOrderResponse> => {
  const res = await fetch(`${API_BASE}/payments/razorpay/order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`
    },
    body: JSON.stringify({ invoiceId })
  });

  return await res.json();
};

export interface VerifyRazorpayPayload {
  invoiceId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface VerifyRazorpayResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export const verifyRazorpayPayment = async (payload: VerifyRazorpayPayload): Promise<VerifyRazorpayResponse> => {
  const res = await fetch(`${API_BASE}/payments/razorpay/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`
    },
    body: JSON.stringify(payload)
  });

  return await res.json();
};

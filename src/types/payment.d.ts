
interface RazorpayOptions {
  key?: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  image?: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, callback: (response: any) => void) => void;
}

interface CashfreeOptions {
  mode: "sandbox" | "production";
}

interface CashfreeCheckoutOptions {
  paymentSessionId: string;
  redirectTarget: "_self" | "_blank" | "_modal";
}

interface CashfreeInstance {
  checkout: (options: CashfreeCheckoutOptions) => Promise<any>;
}

interface Window {
  Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  Cashfree: new (options: CashfreeOptions) => CashfreeInstance;
}

/**
 * IvoryPay Payment Types
 */

export type IvoryPayCrypto = 'USDT' | 'USDC' | 'SOL';
export type IvoryPayFiat = 'NGN' | 'GHS' | 'ZAR' | 'KES';

export interface IvoryPayCreatePaymentLinkRequest {
  name: string;
  description: string;
  baseFiat: IvoryPayFiat;
  amount: string | number;
  successMessage?: string;
  redirectLink?: string;
}

export interface IvoryPayPaymentLink {
  uuid: string;
  name: string;
  description: string;
  baseFiat: IvoryPayFiat;
  amount: number;
  successMessage: string | null;
  imageFilePath: string | null;
  businessId: string;
  userId: string;
  reference: string;
  environment: 'TEST' | 'LIVE';
  redirectLink: string | null;
  customerId: string | null;
  completedAt: string;
  deletedAt: string | null;
  createdAt: string;
  isActive: number;
}

export interface IvoryPayCreatePaymentLinkResponse {
  success: boolean;
  message: string;
  data: IvoryPayPaymentLink;
}

export interface IvoryPayInitiateTransactionRequest {
  baseFiat: IvoryPayFiat;
  amount: number;
  crypto: IvoryPayCrypto;
  email: string;
  reference?: string;
  metadata?: Record<string, any>;
}

export interface IvoryPayTransaction {
  id: string;
  uuid?: string;
  email: string;
  address: string;
  reference: string;
  expectedAmountInUSD: number;
  expectedAmountInCrypto: number;
  feeInCrypto: number;
  expectedAmountWithFeeInCrypto: number;
  crypto: IvoryPayCrypto;
  baseFiat: IvoryPayFiat;
  baseFiatToUSDRate: number;
  usdToCryptoRate: number;
  status?: 'pending' | 'success' | 'expired' | 'failed';
  receivedAmountInCrypto?: number;
  receivedAmountInBaseFiat?: number;
  failureReason?: string | null;
}

export interface IvoryPayInitiateTransactionResponse {
  success: boolean;
  message: string;
  data: IvoryPayTransaction;
}

export interface IvoryPayVerifyTransactionResponse {
  success: boolean;
  message: string;
  data: {
    uuid: string;
    reference: string;
    cryptoTransactionHash: string | null;
    expectedAmountInCrypto: number;
    expectedAmountInUSD: number;
    expectedAmountInBaseFiat: number;
    expectedAmountInBusinessPrimaryFiat: number;
    receivedAmountInCrypto: number;
    receivedAmountInUSD: number;
    receivedAmountInBaseFiat: number;
    receivedAmountInBusinessPrimaryFiat: number;
    excessAmountReceivedInCrypto: number;
    feeInCrypto: number;
    expectedAmountInCryptoPlusFee: number;
    crypto: IvoryPayCrypto;
    baseFiat: IvoryPayFiat;
    businessPrimaryFiat: IvoryPayFiat;
    baseFiatToUSDRate: number;
    baseFiatToBusinessPrimaryFiatRate: number;
    usdToCryptoRate: number;
    address: string;
    metadata: Record<string, any> | null;
    environment: 'TEST' | 'LIVE';
    origin: string;
    businessId: string;
    userId: string;
    customerId: string;
    expiresAt: string;
    completedAt: string;
    status: 'pending' | 'success' | 'expired' | 'failed';
    failureReason: string | null;
    createdAtDateOnly: string;
    createdAt: string;
    customer?: {
      uuid: string;
      refCode: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
      phoneNumber: string | null;
      totalSpendInUSD: number;
      businessId: string;
      userId: string;
      context: string;
      createdAtDateOnly: string;
      createdAt: string;
    };
  };
}

export interface IvoryPayWebhookEvent {
  event: 'transaction.success' | 'transaction.failed' | 'virtualAccountTransfer.success' | 'payoutRequest.success' | 'payoutRequest.failed' | 'payoutRequest.declined';
  data: {
    uuid: string;
    reference: string;
    status: string;
    amount?: number;
    expectedAmountInBaseFiat?: number;
    receivedAmountInBaseFiat?: number;
    baseFiat?: IvoryPayFiat;
    crypto?: IvoryPayCrypto;
    metadata?: Record<string, any>;
    [key: string]: any;
  };
}

export interface IvoryPayVirtualAccountRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  bvn?: string;
}

export interface IvoryPayVirtualAccount {
  uuid: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode: string;
  status: string;
  customerId: string;
  businessId: string;
  createdAt: string;
}

export interface IvoryPayVirtualAccountResponse {
  success: boolean;
  message: string;
  data: IvoryPayVirtualAccount;
}

export interface IvoryPaySwapRequest {
  inputCryptocurrency: IvoryPayCrypto;
  outputCryptocurrency: IvoryPayCrypto;
  inputCryptocurrencyAmount: number;
}

export interface IvoryPaySwap {
  uuid: string;
  inputCryptocurrency: IvoryPayCrypto;
  outputCryptocurrency: IvoryPayCrypto;
  conversionRate: number;
  localFiat: IvoryPayFiat;
  inputCryptocurrencyAmount: number;
  minOutputCryptocurrencyAmount: number;
  actualOutputCryptocurrencyAmount: number | null;
  amountInUSD: number;
  amountInLocalFiat: number;
  usdToLocalFiatRate: number;
  feeInCrypto: number;
  feeInUSD: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  environment: 'TEST' | 'LIVE';
  completedAt: string | null;
  createdAt: string;
}

export interface IvoryPaySwapResponse {
  success: boolean;
  message: string;
  data: IvoryPaySwap;
}

export type PaymentGateway = 'paystack' | 'ivorypay';

export interface PaymentGatewayConfig {
  activeGateway: PaymentGateway;
  paystackEnabled: boolean;
  ivorypayEnabled: boolean;
  ivorypayDefaultCrypto: IvoryPayCrypto;
  ivorypayAutoSwapToUsdt: boolean;
}

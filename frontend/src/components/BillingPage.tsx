import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CreditCard, Check, Loader2, History, TrendingUp, AlertCircle } from 'lucide-react';
import { getCreditBalance, getUsageHistory, getPurchaseHistory, createCheckoutSession, verifyCheckoutSession } from '../lib/api';
import { useStore } from '../store/useStore';

type Purchase = {
  id: string;
  amountCents: number;
  displayAmount: string;
  status: string;
  createdAt: string;
};

type UsageEntry = {
  id: string;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
  endpoint: string;
  createdAt: string;
};

export function BillingPage({ success = false }: { success?: boolean }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  const creditBalance = useStore((state) => state.creditBalance);
  const setCreditBalance = useStore((state) => state.setCreditBalance);
  
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [usage, setUsage] = useState<UsageEntry[]>([]);
  const [verifyingSession, setVerifyingSession] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'balance' | 'purchases' | 'usage'>('balance');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (success && sessionId) {
      verifyPurchase();
    }
  }, [success, sessionId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [balanceRes, purchasesRes, usageRes] = await Promise.all([
        getCreditBalance(),
        getPurchaseHistory(20),
        getUsageHistory(50),
      ]);
      
      setCreditBalance(balanceRes.data.creditBalance);
      setPurchases(purchasesRes.data.purchases || []);
      setUsage(usageRes.data.history || []);
    } catch (error) {
      console.error('Error loading billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const verifyPurchase = async () => {
    if (!sessionId) return;
    
    setVerifyingSession(true);
    try {
      const response = await verifyCheckoutSession(sessionId);
      if (response.data.purchase.status === 'completed') {
        setPurchaseSuccess(true);
        setCreditBalance(response.data.creditBalance);
        await loadData();
      }
    } catch (error) {
      console.error('Error verifying purchase:', error);
    } finally {
      setVerifyingSession(false);
    }
  };

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      const successUrl = `${window.location.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${window.location.origin}/billing`;
      
      const response = await createCheckoutSession(successUrl, cancelUrl);
      
      // Redirect to Stripe Checkout
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-orange-500 p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-500/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold font-mono">Billing & Credits</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto p-6">
        {/* Success Message */}
        {purchaseSuccess && (
          <div className="mb-6 p-4 border border-green-500 bg-green-500/10 flex items-center gap-3">
            <Check className="w-6 h-6 text-green-500" />
            <div>
              <div className="font-semibold text-green-500">Purchase Successful!</div>
              <div className="text-sm text-gray-400">$10.00 in credits has been added to your account.</div>
            </div>
          </div>
        )}

        {verifyingSession && (
          <div className="mb-6 p-4 border border-orange-500/30 flex items-center gap-3">
            <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
            <div className="text-gray-400">Verifying your purchase...</div>
          </div>
        )}

        {/* Balance Card */}
        <div className="border border-orange-500 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400 uppercase tracking-wide mb-1">Current Balance</div>
              <div className="text-4xl font-bold font-mono text-orange-500">
                ${(creditBalance / 100).toFixed(2)}
              </div>
            </div>
            <button
              onClick={handlePurchase}
              disabled={purchasing}
              className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-black font-semibold hover:bg-orange-400 transition-colors disabled:opacity-50"
            >
              {purchasing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  Buy $10 Credits
                </>
              )}
            </button>
          </div>
          
          {creditBalance < 100 && (
            <div className="mt-4 p-3 border border-yellow-500/30 bg-yellow-500/10 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              <span className="text-sm text-yellow-500">Low balance! Some features require at least $1.00 in credits.</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-orange-500 mb-6">
          <div className="flex">
            {(['balance', 'purchases', 'usage'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-mono uppercase tracking-wide transition-colors ${
                  activeTab === tab
                    ? 'text-orange-500 border-b-2 border-orange-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'balance' && (
          <div className="space-y-6">
            <div className="border border-orange-500/30 p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-orange-500 mb-4">How Credits Work</h3>
              <div className="space-y-4 text-sm text-gray-400">
                <p>
                  Credits are used to power AI features like chat, data aggregation, and score generation.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-900 border border-orange-500/20">
                    <div className="font-semibold text-white mb-1">AI Chat</div>
                    <div>~$0.01 - $0.05 per message</div>
                  </div>
                  <div className="p-4 bg-gray-900 border border-orange-500/20">
                    <div className="font-semibold text-white mb-1">Data Aggregation</div>
                    <div>~$0.50 - $2.00 per country</div>
                  </div>
                  <div className="p-4 bg-gray-900 border border-orange-500/20">
                    <div className="font-semibold text-white mb-1">Score Generation</div>
                    <div>~$0.01 - $0.03 per request</div>
                  </div>
                  <div className="p-4 bg-gray-900 border border-orange-500/20">
                    <div className="font-semibold text-white mb-1">Article Summary</div>
                    <div>~$0.001 per article</div>
                  </div>
                </div>
                <p className="text-xs">
                  Prices include a 20% markup to cover infrastructure costs. Actual costs depend on message length and complexity.
                </p>
              </div>
            </div>

            <div className="border border-orange-500/30 p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-orange-500 mb-4">Pricing</h3>
              <div className="flex items-center justify-between p-4 bg-gray-900 border border-orange-500">
                <div>
                  <div className="text-xl font-bold">$10.00</div>
                  <div className="text-sm text-gray-400">Credit Package</div>
                </div>
                <button
                  onClick={handlePurchase}
                  disabled={purchasing}
                  className="px-4 py-2 bg-orange-500 text-black font-semibold hover:bg-orange-400 transition-colors disabled:opacity-50"
                >
                  Purchase
                </button>
              </div>
              <p className="mt-4 text-xs text-gray-500">
                All payments are processed securely through Stripe. Credits never expire.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'purchases' && (
          <div className="space-y-3">
            {purchases.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No purchases yet</p>
              </div>
            ) : (
              purchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="flex items-center justify-between p-4 border border-orange-500/30"
                >
                  <div>
                    <div className="font-semibold">{purchase.displayAmount} Credit Package</div>
                    <div className="text-sm text-gray-400">
                      {new Date(purchase.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 text-xs font-semibold ${
                      purchase.status === 'completed'
                        ? 'bg-green-500/20 text-green-500 border border-green-500'
                        : purchase.status === 'pending'
                        ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500'
                        : 'bg-red-500/20 text-red-500 border border-red-500'
                    }`}
                  >
                    {purchase.status}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'usage' && (
          <div className="space-y-3">
            {usage.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No usage history yet</p>
              </div>
            ) : (
              usage.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 border border-orange-500/30"
                >
                  <div>
                    <div className="font-mono text-sm">{entry.endpoint}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(entry.createdAt).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {entry.inputTokens.toLocaleString()} in / {entry.outputTokens.toLocaleString()} out tokens
                    </div>
                  </div>
                  <div className="font-mono text-orange-500">
                    -${(entry.costCents / 100).toFixed(4)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}

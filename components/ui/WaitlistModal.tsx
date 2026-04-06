'use client'
import { useState } from 'react'
import { X, Shield, CheckCircle } from 'lucide-react'
import { joinWaitlist } from '@/lib/supabase/waitlist-actions'

interface WaitlistModalProps {
  isOpen: boolean
  onClose: () => void
  tier: 'soc_pro' | 'command_control'
  tierName: string
  onSuccess?: (tier: 'soc_pro' | 'command_control') => void
}

export default function WaitlistModal({ isOpen, onClose, tier, tierName, onSuccess }: WaitlistModalProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!email) return
    setLoading(true)
    setError('')
    const result = await joinWaitlist(email, tier)
    
    if (result.error) {
      setLoading(false)
      setError(result.error)
    } else {
      // Send email via communication API
      try {
        await fetch("/api/communications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "Early Access / Waitlist",
            userEmail: email,
            name: `Waitlist User (Tier: ${tierName})`,
            message: `User joined the waitlist for ${tierName}.`,
          }),
        });
      } catch (err) {
        console.error("Failed to send notification email:", err);
      }
      
      setLoading(false)
      setSuccess(true)
      onSuccess?.(tier)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative liquid-glass rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8b949e] hover:text-[#e6edf3] transition-colors"
        >
          <X size={18} />
        </button>

        {!success ? (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#2dd4bf]/10 flex items-center justify-center">
                <Shield size={20} className="text-[#2dd4bf]" />
              </div>
              <div>
                <h3 className="text-[#e6edf3] font-bold text-lg">Join the Waitlist</h3>
                <p className="text-[#8b949e] text-sm">{tierName} â€” Coming Soon</p>
              </div>
            </div>

            <p className="text-[#8b949e] text-sm mb-6 leading-relaxed">
              We're finalizing payment processing. Enter your email and we'll notify you the moment {tierName} is available.
            </p>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="your@email.com"
              className="w-full bg-[#0d1117] border border-white/10 rounded-full px-6 py-3 text-[#e6edf3] text-sm placeholder-[#8b949e] focus:outline-none focus:border-[#2dd4bf] transition-colors mb-3"
            />

            {error && <p className="text-[#f85149] text-xs mb-3">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={loading || !email}
              className="w-full bg-[#2dd4bf] text-[#0d1117] font-semibold py-3 px-6 rounded-full hover:bg-[#14b8a6] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? 'Joining...' : 'Notify Me When Available'}
            </button>
          </>
        ) : (
          <div className="text-center py-4">
            <CheckCircle size={48} className="text-[#2dd4bf] mx-auto mb-4" />
            <h3 className="text-[#e6edf3] font-bold text-lg mb-2">You're on the list!</h3>
            <p className="text-[#8b949e] text-sm">We'll email you at <span className="text-[#2dd4bf]">{email}</span> when {tierName} launches.</p>
            <button onClick={onClose} className="mt-6 text-[#8b949e] text-sm hover:text-[#e6edf3] transition-colors">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}


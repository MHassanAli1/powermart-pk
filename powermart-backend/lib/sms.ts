/**
 * SMS/WhatsApp Service
 * 
 * This module re-exports WhatsApp functions for OTP delivery.
 * Uses self-hosted Baileys library - completely FREE.
 * 
 * First-time setup:
 * 1. Start the server
 * 2. Scan QR code shown in terminal with WhatsApp
 * 3. Session is saved in ./whatsapp-session/
 * 
 * Add to .gitignore:
 *   whatsapp-session/
 */

export {
  sendPhoneVerificationOTP,
  sendVendorPhoneOTP,
  isSMSConfigured,
  isWhatsAppReady,
  initWhatsApp,
  getWhatsAppStatus,
} from './whatsapp.ts';

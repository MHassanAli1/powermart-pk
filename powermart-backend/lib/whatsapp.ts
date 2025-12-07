/**
 * WhatsApp Service using Baileys (Self-hosted, FREE)
 * 
 * This service uses WhatsApp Web protocol to send messages.
 * On first run, scan the QR code with your WhatsApp to authenticate.
 * Session is persisted in ./whatsapp-session folder.
 * 
 * Security Notes:
 * - Uses end-to-end encryption (same as WhatsApp Web)
 * - Session files contain sensitive auth data - keep secure
 * - Add whatsapp-session/ to .gitignore
 */

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import type { WASocket } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const appName = process.env.APP_NAME ?? 'PowerMart';
const SESSION_DIR = join(process.cwd(), 'whatsapp-session');

// Singleton socket instance
let socket: WASocket | null = null;
let isConnecting = false;
let isReady = false;
let connectionPromise: Promise<void> | null = null;

/**
 * Format phone number to WhatsApp JID format
 * @param phone - Phone number (can be local or international format)
 * @returns WhatsApp JID (e.g., "923001234567@s.whatsapp.net")
 */
function formatToJID(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If starts with 0, replace with Pakistan country code (92)
  if (cleaned.startsWith('0')) {
    cleaned = '92' + cleaned.substring(1);
  }
  
  // Remove leading + if present (already cleaned but just in case)
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  
  return `${cleaned}@s.whatsapp.net`;
}

/**
 * Initialize WhatsApp connection
 * Shows QR code in terminal on first run
 */
async function initializeConnection(): Promise<void> {
  if (isReady && socket) {
    return;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  if (isConnecting) {
    // Wait for existing connection attempt
    await new Promise(resolve => setTimeout(resolve, 1000));
    return initializeConnection();
  }

  isConnecting = true;

  connectionPromise = new Promise(async (resolve, reject) => {
    try {
      // Ensure session directory exists
      if (!existsSync(SESSION_DIR)) {
        mkdirSync(SESSION_DIR, { recursive: true });
      }

      // Load or create auth state
      const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

      // Create socket connection
      socket = makeWASocket({
        auth: state,
        printQRInTerminal: false, // We'll handle QR ourselves for better UX
        browser: [appName, 'Chrome', '120.0.0'],
        syncFullHistory: false,
        markOnlineOnConnect: false,
      });

      // Handle connection updates
      socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          console.log('\n📱 WhatsApp QR Code - Scan with your phone:\n');
          qrcode.generate(qr, { small: true });
          console.log('\n⏳ Waiting for scan...\n');
        }

        if (connection === 'close') {
          const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
          
          if (reason === DisconnectReason.loggedOut) {
            console.log('❌ WhatsApp logged out. Please delete whatsapp-session folder and restart.');
            isReady = false;
            socket = null;
          } else {
            console.log('🔄 WhatsApp disconnected. Reconnecting...');
            isConnecting = false;
            connectionPromise = null;
            // Attempt reconnection
            setTimeout(() => initializeConnection(), 3000);
          }
        }

        if (connection === 'open') {
          console.log('✅ WhatsApp connected successfully!');
          isReady = true;
          isConnecting = false;
          resolve();
        }
      });

      // Save credentials when updated
      socket.ev.on('creds.update', saveCreds);

    } catch (error) {
      console.error('Failed to initialize WhatsApp:', error);
      isConnecting = false;
      connectionPromise = null;
      reject(error);
    }
  });

  return connectionPromise;
}

/**
 * Check if a phone number is registered on WhatsApp
 */
async function isOnWhatsApp(phone: string): Promise<boolean> {
  try {
    await initializeConnection();
    if (!socket) return false;

    const jid = formatToJID(phone);
    const results = await socket.onWhatsApp(jid.replace('@s.whatsapp.net', ''));
    const result = results?.[0];
    return result?.exists ?? false;
  } catch (error) {
    console.error('Error checking WhatsApp status:', error);
    return false;
  }
}

/**
 * Send a WhatsApp text message
 */
async function sendMessage(
  to: string,
  message: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    await initializeConnection();

    if (!socket || !isReady) {
      return { 
        success: false, 
        error: 'WhatsApp not connected. Please scan QR code first.' 
      };
    }

    const jid = formatToJID(to);

    // Check if number exists on WhatsApp
    const exists = await isOnWhatsApp(to);
    if (!exists) {
      return { 
        success: false, 
        error: `Phone number ${to} is not registered on WhatsApp.` 
      };
    }

    // Send the message
    const result = await socket.sendMessage(jid, { text: message });

    console.log(`📤 WhatsApp message sent to ${to}`);
    
    const messageId = result?.key?.id;
    return { 
      success: true, 
      ...(messageId && { messageId })
    };
  } catch (error: any) {
    console.error('Failed to send WhatsApp message:', error);
    return { 
      success: false, 
      error: error?.message ?? 'Failed to send WhatsApp message' 
    };
  }
}

/**
 * Send phone verification OTP via WhatsApp
 */
export async function sendPhoneVerificationOTP(
  phoneNumber: string,
  otpCode: string
): Promise<{ success: boolean; error?: string }> {
  const message = `*${appName}*\n\n🔐 Your verification code is:\n\n*${otpCode}*\n\n⏰ Valid for 5 minutes.\n\n⚠️ Do not share this code with anyone.`;
  
  return sendMessage(phoneNumber, message);
}

/**
 * Send vendor KYC phone verification OTP via WhatsApp
 */
export async function sendVendorPhoneOTP(
  phoneNumber: string,
  otpCode: string,
  vendorName?: string
): Promise<{ success: boolean; error?: string }> {
  const greeting = vendorName ? `Hi ${vendorName}!\n\n` : '';
  const message = `${greeting}*${appName} Vendor Verification*\n🔐 Your OTP is:*${otpCode}*\n\nValid for 5 minutes.\n\n✅ Once verified, you can start selling on ${appName}!`;
  
  return sendMessage(phoneNumber, message);
}

/**
 * Check if WhatsApp is connected and ready
 */
export function isWhatsAppReady(): boolean {
  return isReady && socket !== null;
}

/**
 * Initialize WhatsApp connection on server start
 * Call this in your main index.ts to connect early
 */
export async function initWhatsApp(): Promise<void> {
  console.log('🔌 Initializing WhatsApp connection...');
  try {
    await initializeConnection();
  } catch (error) {
    console.error('WhatsApp initialization failed:', error);
  }
}

/**
 * Get WhatsApp connection status
 */
export function getWhatsAppStatus(): { 
  connected: boolean; 
  ready: boolean;
  message: string;
} {
  if (isReady && socket) {
    return { connected: true, ready: true, message: 'WhatsApp is connected and ready' };
  }
  if (isConnecting) {
    return { connected: false, ready: false, message: 'WhatsApp is connecting... Check terminal for QR code' };
  }
  return { connected: false, ready: false, message: 'WhatsApp not initialized' };
}

// Alias for backward compatibility with sms.ts
export const isSMSConfigured = isWhatsAppReady;

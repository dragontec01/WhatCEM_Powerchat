import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ChannelConnection, Contact } from "@shared/db/schema";
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhoneNumber(phone?: string): string {
  if (!phone) return "";
  
  const cleaned = phone.replace(/\D/g, "");
  
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length > 10) {
    return `+${cleaned.slice(0, cleaned.length - 10)} ${cleaned.slice(-10, -7)} ${cleaned.slice(-7, -4)} ${cleaned.slice(-4)}`;
  }
  
  return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");
}

export function findChannelConnectionForContact(
  contact: Contact,
  connections: ChannelConnection[]
): ChannelConnection | undefined {
  if (!contact || !connections?.length) return undefined;
  
  if (contact.identifierType === 'whatsapp') {
    return connections.find(conn => 
      (conn.channelType === 'whatsapp' || conn.channelType === 'whatsapp_unofficial') && 
      conn.status === 'active'
    );
  }
  
  if (contact.identifierType) {
    return connections.find(conn => 
      conn.channelType === contact.identifierType && 
      conn.status === 'active'
    );
  }
  
  return undefined;
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return 'Invalid date';
  }
}
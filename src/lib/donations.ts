import { db } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

export interface Donatie {
  id?: string;
  naam: string;
  bedragPerKm: number;
  bericht?: string;
  vraag?: string;
  antwoord?: string;
  publiek: boolean;
  contact?: string;
  timestamp?: Timestamp;
}

export const TOTALE_KM = 100;

export async function voegDonatieToe(
  donatie: Omit<Donatie, 'id' | 'timestamp'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'donations'), {
    ...donatie,
    timestamp: serverTimestamp(),
  });
  return ref.id;
}

export async function beantwoordVraag(id: string, antwoord: string): Promise<void> {
  await updateDoc(doc(db, 'donations', id), { antwoord });
}

export async function haalDonaties(): Promise<Donatie[]> {
  const q = query(collection(db, 'donations'), orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Donatie));
}

export function berekenTotaal(donaties: Donatie[]): number {
  return donaties.reduce((som, d) => som + d.bedragPerKm * TOTALE_KM, 0);
}

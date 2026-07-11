import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  writeBatch
} from "firebase/firestore";
import { db, isFirebasePlaceholder } from "../firebase";
import { Series, Volume } from "../types";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: localStorage.getItem("comic_tracker_user_id"),
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Local Storage fallback helpers
function getLocalSeries(): Series[] {
  try {
    const data = localStorage.getItem("manga_series");
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalSeries(series: Series[]) {
  localStorage.setItem("manga_series", JSON.stringify(series));
}

function getLocalVolumes(): Volume[] {
  try {
    const data = localStorage.getItem("manga_volumes");
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalVolumes(volumes: Volume[]) {
  localStorage.setItem("manga_volumes", JSON.stringify(volumes));
}

// Get or create unique user ID for local browser data compartmentalization
export function getOrCreateUserId(): string {
  let userId = localStorage.getItem("comic_tracker_user_id");
  if (!userId) {
    userId = "user_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem("comic_tracker_user_id", userId);
  }
  return userId;
}

// Clean undefined properties from an object so Firestore doesn't throw unsupported field errors
export function cleanUndefined<T extends object>(obj: T): T {
  const result = { ...obj } as any;
  Object.keys(result).forEach(key => {
    if (result[key] === undefined) {
      delete result[key];
    }
  });
  return result;
}

// Get series list, with in-memory sorting to avoid needing a composite index in Firestore
export async function getSeriesList(userId: string): Promise<Series[]> {
  if (isFirebasePlaceholder) {
    const list = getLocalSeries().filter(s => s.userId === userId);
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }
  const path = "series";
  try {
    const ref = collection(db, path);
    const q = query(ref, where("userId", "==", userId));
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Series));
    // Sort descending by createdAt in-memory
    return list.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function addSeries(series: Omit<Series, "id" | "createdAt">): Promise<Series> {
  if (isFirebasePlaceholder) {
    const generatedId = "series_" + Math.random().toString(36).substring(2, 11);
    const data: Series = cleanUndefined({
      ...series,
      id: generatedId,
      createdAt: Date.now()
    });
    const list = getLocalSeries();
    list.push(data);
    saveLocalSeries(list);
    return data;
  }
  const path = "series";
  const ref = collection(db, path);
  const newDoc = doc(ref);
  const data: Series = cleanUndefined({
    ...series,
    id: newDoc.id,
    createdAt: Date.now()
  });
  try {
    await setDoc(newDoc, data);
    return data;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${path}/${newDoc.id}`);
  }
}

export async function updateSeries(id: string, updates: Partial<Omit<Series, "id" | "userId" | "createdAt">>): Promise<void> {
  if (isFirebasePlaceholder) {
    const list = getLocalSeries();
    const idx = list.findIndex(s => s.id === id);
    if (idx !== -1) {
      list[idx] = cleanUndefined({ ...list[idx], ...updates });
      saveLocalSeries(list);
    }
    return;
  }
  const path = `series/${id}`;
  try {
    const ref = doc(db, "series", id);
    await updateDoc(ref, cleanUndefined(updates));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteSeries(id: string): Promise<void> {
  if (isFirebasePlaceholder) {
    // Delete series
    const list = getLocalSeries().filter(s => s.id !== id);
    saveLocalSeries(list);
    
    // Delete volumes of this series
    const vols = getLocalVolumes().filter(v => v.seriesId !== id);
    saveLocalVolumes(vols);
    return;
  }
  const seriesPath = `series/${id}`;
  try {
    // Delete series doc
    await deleteDoc(doc(db, "series", id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, seriesPath);
  }
  
  // Also delete all volumes of this series
  const volumes = await getVolumes(id);
  if (volumes.length > 0) {
    const batch = writeBatch(db);
    volumes.forEach(vol => {
      batch.delete(doc(db, "volumes", vol.id));
    });
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "volumes (batch delete)");
    }
  }
}

export async function getVolumes(seriesId: string): Promise<Volume[]> {
  if (isFirebasePlaceholder) {
    const list = getLocalVolumes().filter(v => v.seriesId === seriesId);
    return list.sort((a, b) => a.volumeNumber - b.volumeNumber);
  }
  const path = "volumes";
  try {
    const ref = collection(db, path);
    const q = query(ref, where("seriesId", "==", seriesId));
    const snapshot = await getDocs(q);
    const result = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Volume));
    
    // Sort by volumeNumber numerically
    return result.sort((a, b) => a.volumeNumber - b.volumeNumber);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveVolume(volume: Omit<Volume, "id" | "createdAt"> & { id?: string }): Promise<Volume> {
  const volumeId = volume.id || `${volume.seriesId}_vol_${volume.volumeNumber}`;
  const data: Volume = cleanUndefined({
    ...volume,
    id: volumeId,
    createdAt: Date.now()
  });

  if (isFirebasePlaceholder) {
    const list = getLocalVolumes();
    const idx = list.findIndex(v => v.id === volumeId);
    if (idx !== -1) {
      list[idx] = data;
    } else {
      list.push(data);
    }
    saveLocalVolumes(list);
    return data;
  }
  const path = "volumes";
  const docRef = doc(db, path, volumeId);
  
  try {
    await setDoc(docRef, data);
    return data;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${path}/${volumeId}`);
  }
}

export async function saveMultipleVolumes(volumes: Omit<Volume, "id" | "createdAt">[]): Promise<void> {
  if (isFirebasePlaceholder) {
    const list = getLocalVolumes();
    volumes.forEach(vol => {
      const volumeId = `${vol.seriesId}_vol_${vol.volumeNumber}`;
      const cleanVol = cleanUndefined({
        ...vol,
        id: volumeId,
        createdAt: Date.now()
      });
      const idx = list.findIndex(v => v.id === volumeId);
      if (idx !== -1) {
        list[idx] = cleanVol;
      } else {
        list.push(cleanVol);
      }
    });
    saveLocalVolumes(list);
    return;
  }
  const batch = writeBatch(db);
  const ref = collection(db, "volumes");
  
  volumes.forEach(vol => {
    const volumeId = `${vol.seriesId}_vol_${vol.volumeNumber}`;
    const docRef = doc(ref, volumeId);
    const cleanVol = cleanUndefined({
      ...vol,
      id: volumeId,
      createdAt: Date.now()
    });
    batch.set(docRef, cleanVol);
  });
  
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "volumes (batch write)");
  }
}

export async function deleteVolume(id: string): Promise<void> {
  if (isFirebasePlaceholder) {
    const list = getLocalVolumes().filter(v => v.id !== id);
    saveLocalVolumes(list);
    return;
  }
  const path = `volumes/${id}`;
  try {
    await deleteDoc(doc(db, "volumes", id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

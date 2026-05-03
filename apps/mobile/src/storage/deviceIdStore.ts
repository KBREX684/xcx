// 设备 ID 与稳定标识：避免使用 IMEI/AndroidID/IDFA 等高敏字段。生成一次本地 UUID 落在
// SecureStore，随设备生命周期复用。卸载即重置 = 应用宝合规可接受。
import * as SecureStore from "expo-secure-store";

const KEY = "acp.device.id";
const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export async function getStableDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(KEY);
  if (existing && existing.length >= 8) return existing;
  const id = `mb_${Date.now().toString(36)}_${random(20)}`;
  await SecureStore.setItemAsync(KEY, id);
  return id;
}

function random(length: number): string {
  const out: string[] = [];
  const cryptoLike = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } })
    .crypto;
  if (cryptoLike?.getRandomValues) {
    const bytes = new Uint8Array(length);
    cryptoLike.getRandomValues(bytes);
    for (let i = 0; i < length; i += 1) {
      out.push(ALPHABET[(bytes[i] ?? 0) % ALPHABET.length] ?? "0");
    }
    return out.join("");
  }
  for (let i = 0; i < length; i += 1) {
    out.push(ALPHABET[Math.floor(Math.random() * ALPHABET.length)] ?? "0");
  }
  return out.join("");
}

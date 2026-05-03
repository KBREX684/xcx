// 权限服务：CAMERA / NOTIFICATIONS / MEDIA_LIBRARY 仅在业务触发时申请；不在冷启动期
// 主动请求。系统对话框的二次拒绝必须落到引导页，提示用户去系统设置开启。
import { Camera } from "expo-camera";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export type PermissionKey = "camera" | "notifications";
export type PermissionStatus = "granted" | "denied" | "undetermined";

export const permissionService = {
  async requestCamera(): Promise<PermissionStatus> {
    const result = await Camera.requestCameraPermissionsAsync();
    return mapStatus(result.status);
  },
  async getCamera(): Promise<PermissionStatus> {
    const result = await Camera.getCameraPermissionsAsync();
    return mapStatus(result.status);
  },
  async requestNotifications(): Promise<PermissionStatus> {
    if (Platform.OS === "ios") {
      const result = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
      return result.granted ? "granted" : "denied";
    }
    const result = await Notifications.requestPermissionsAsync();
    return result.granted ? "granted" : "denied";
  },
};

function mapStatus(status: string): PermissionStatus {
  if (status === "granted") return "granted";
  if (status === "denied") return "denied";
  return "undetermined";
}

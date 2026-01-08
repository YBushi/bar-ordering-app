const DEVICE_TOKEN_KEY = "device_token";

export function getDeviceToken(): string | null {
    return localStorage.getItem(DEVICE_TOKEN_KEY);
}

export function setDeviceToken(token: string) {
    localStorage.setItem(DEVICE_TOKEN_KEY, token);
}

export function deleteDeviceToken() {
    localStorage.removeItem(DEVICE_TOKEN_KEY);
}
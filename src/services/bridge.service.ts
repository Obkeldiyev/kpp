import axios from "axios";
import FormData from "form-data";

const bridgeUrl = (process.env.BRIDGE_URL || "http://127.0.0.1:5001").replace(/\/+$/, "");

type BridgeDevice = { ip_address?: string | null; sdk_port?: number | null; sdk_username?: string | null; sdk_password?: string | null };

export async function connectBridgeDevice(device: BridgeDevice) {
    if (!device.ip_address || !device.sdk_username || !device.sdk_password) throw new Error("Device credentials are incomplete");
    const response = await axios.post(`${bridgeUrl}/connect`, {
        ip: device.ip_address,
        port: device.sdk_port || 8000,
        username: device.sdk_username,
        password: device.sdk_password,
    }, { timeout: 15000 });
    return response.data;
}

export async function enrollFaceOnBridge(device: BridgeDevice, personId: string, file: Express.Multer.File) {
    await connectBridgeDevice(device);
    const form = new FormData();
    form.append("person_id", personId);
    form.append("file", file.buffer, { filename: file.originalname, contentType: file.mimetype });
    const response = await axios.post(`${bridgeUrl}/face/upload-to-device`, form, {
        headers: form.getHeaders(),
        timeout: 90000,
        maxContentLength: 20 * 1024 * 1024,
        maxBodyLength: 20 * 1024 * 1024,
    });
    return response.data;
}
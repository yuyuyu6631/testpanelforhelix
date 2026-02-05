import { message } from 'antd';

const MESSAGE_DURATION = 3; // seconds
const THROTTLE_TIME = 3000; // 3 seconds window for dup check

const lastMessages: Record<string, number> = {};

const showMessage = (type: 'success' | 'error' | 'warning' | 'info', content: string) => {
    const now = Date.now();

    // Key based on type + content
    const key = `${type}-${content}`;

    if (lastMessages[key] && now - lastMessages[key] < THROTTLE_TIME) {
        // Skip duplicate
        return;
    }

    lastMessages[key] = now;

    // Clear old keys periodically to avoid memory leak (simple heuristic)
    if (Object.keys(lastMessages).length > 100) {
        // Clear all or just oldest? For simplicity, clear all except current
        for (let k in lastMessages) {
            if (now - lastMessages[k] > THROTTLE_TIME) delete lastMessages[k];
        }
    }

    message[type]({
        content,
        duration: MESSAGE_DURATION,
        key: content // AntD key to update existing instead of stacking if desired, but we throttle completely
    });
};

export const msg = {
    success: (content: string) => showMessage('success', content),
    error: (content: string) => showMessage('error', content),
    warning: (content: string) => showMessage('warning', content),
    info: (content: string) => showMessage('info', content),
};

export default msg;

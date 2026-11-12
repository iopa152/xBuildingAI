import * as net from "node:net";
import * as tls from "node:tls";

export interface SmtpConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    from: string;
}

/**
 * Minimal SMTP client (no dependencies): implicit TLS on 465, STARTTLS on
 * other ports. Supports AUTH PLAIN and single-recipient text/HTML mail.
 */
export async function sendMail(
    cfg: SmtpConfig,
    to: string,
    subject: string,
    html: string,
    timeoutMs = 15000,
): Promise<void> {
    if (!cfg.host) throw new Error("SMTP 主机未配置");
    const port = Number(cfg.port) || 465;
    const socket: net.Socket =
        port === 465
            ? tls.connect({ host: cfg.host, port, servername: cfg.host })
            : net.connect({ host: cfg.host, port });

    const done = (err: Error | null): Promise<void> =>
        new Promise((resolve, reject) => {
            if (err) reject(err);
            else resolve();
        });
    socket.setTimeout(timeoutMs, () => done(new Error("连接超时")));

    const readReply = (): Promise<string> =>
        new Promise((resolve, reject) => {
            let buf = "";
            const onData = (chunk: Buffer) => {
                buf += chunk.toString("utf8");
                // a reply line is complete when "NNN " (space) appears for the last line
                const lines = buf.split("\r\n");
                const last = lines[lines.length - 2];
                if (last && /^\d{3} /.test(last)) {
                    socket.off("data", onData);
                    resolve(buf);
                }
            };
            const onError = (err: Error) => {
                socket.off("data", onData);
                reject(err);
            };
            socket.on("data", onData);
            socket.once("error", onError);
            socket.once("timeout", () => {
                socket.off("data", onData);
                reject(new Error("SMTP 响应超时"));
            });
        });

    const cmd = async (line: string, expect: RegExp): Promise<string> => {
        socket.write(line + "\r\n");
        const reply = await readReply();
        if (!expect.test(reply.trim().split("\r\n").pop() ?? "")) {
            throw new Error(`SMTP ${line.split(" ")[0]} 失败: ${reply.trim().slice(0, 200)}`);
        }
        return reply;
    };

    try {
        await new Promise<void>((resolve, reject) => {
            socket.once("connect", () => resolve());
            socket.once("error", (err) => reject(err));
            socket.once("timeout", () => reject(new Error("连接超时")));
        });
        await readReply(); // banner

        let upgraded = false;
        await cmd(`EHLO hellodrama.local`, /^250/);
        if (port !== 465) {
            const ehlo = await cmd("STARTTLS", /^220/).catch(() => "");
            if (ehlo.startsWith("220")) {
                const tlsSocket = tls.connect(
                    { socket, servername: cfg.host },
                    () => undefined,
                );
                await new Promise<void>((resolve, reject) => {
                    tlsSocket.once("secureConnect", () => resolve());
                    tlsSocket.once("error", (e) => reject(e));
                });
                // swap the socket reference used by cmd/readReply
                (socket as unknown as { write: (d: string) => void }).write = (d: string) =>
                    tlsSocket.write(d);
                tlsSocket.on("data", (d) => socket.emit("data", d));
                await cmd(`EHLO hellodrama.local`, /^250/);
                upgraded = true;
            }
        }

        const authPlain = Buffer.from(`\u0000${cfg.username}\u0000${cfg.password}`).toString("base64");
        await cmd(`AUTH PLAIN ${authPlain}`, /^235/);
        await cmd(`MAIL FROM:<${cfg.from || cfg.username}>`, /^250/);
        await cmd(`RCPT TO:<${to}>`, /^25[04]/);
        await cmd("DATA", /^354/);

        const headers =
            `From: ${cfg.from || cfg.username}\r\n` +
            `To: ${to}\r\n` +
            `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=\r\n` +
            `MIME-Version: 1.0\r\n` +
            `Content-Type: text/html; charset=UTF-8\r\n` +
            `\r\n`;
        const body = html.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
        socket.write(headers + body + "\r\n.\r\n");
        await readReply();

        socket.write("QUIT\r\n");
        socket.end();
        void upgraded;
    } catch (err) {
        socket.destroy();
        throw err;
    }
}

/** TCP reachability probe used by the 配置中心 test-connection */
export function probeTcp(host: string, port: number, timeoutMs = 4000): Promise<void> {
    return new Promise((resolve, reject) => {
        const socket = net.createConnection({ host, port });
        const finish = (err: Error | null) => {
            socket.destroy();
            err ? reject(err) : resolve();
        };
        socket.setTimeout(timeoutMs, () => finish(new Error("连接超时")));
        socket.on("connect", () => finish(null));
        socket.on("error", (err) => finish(err));
    });
}

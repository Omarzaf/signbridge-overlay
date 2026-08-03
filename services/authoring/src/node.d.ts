declare module "node:process" {
  interface Process {
    env: Record<string, string | undefined>;
    argv: string[];
    stdout: { write: (str: string) => boolean };
    stderr: { write: (str: string) => boolean };
  }
  const process: Process;
  export default process;
}

declare module "node:buffer" {
  export class Buffer {
    static from(data: string, encoding?: string): Buffer;
    static concat(list: readonly any[], totalLength?: number): Buffer;
    subarray(start?: number, end?: number): Buffer;
    length: number;
    toString(encoding?: string): string;
  }
}

declare module "node:http" {
  export interface IncomingMessage {
    method?: string;
    url?: string;
    statusCode?: number;
    headers: Record<string, string | string[] | undefined>;
    socket?: { remoteAddress?: string };
    destroy(): void;
    on(event: "data", listener: (chunk: any) => void): this;
    on(event: "end", listener: () => void): this;
    on(event: "error", listener: (err: any) => void): this;
  }

  export interface ServerResponse {
    writeHead(statusCode: number, headers?: Record<string, string>): this;
    end(data?: string | Uint8Array): this;
  }

  export interface Server {
    listen(port: number, host?: string, callback?: () => void): this;
    listen(port: number, callback?: () => void): this;
    close(callback?: () => void): this;
    address(): { address: string; family: string; port: number } | string | null;
  }

  export interface ClientRequest {
    write(chunk: any): boolean;
    end(): void;
  }

  export function createServer(
    requestListener?: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>,
  ): Server;

  export function request(
    url: string | URL,
    options?: any,
    callback?: (res: IncomingMessage) => void,
  ): ClientRequest;
}

declare module "node:crypto" {
  export function createHash(algorithm: string): {
    update(data: string | Uint8Array, inputEncoding?: string): {
      digest(encoding: "hex"): string;
    };
    digest(encoding: "hex"): string;
  };
  export function randomBytes(size: number): {
    toString(encoding: "hex"): string;
  };
}

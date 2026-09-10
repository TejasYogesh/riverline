declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

declare module "npm:@supabase/supabase-js@2" {
  export function createClient(...args: any[]): any;
}

declare module "npm:@google/genai" {
  export class GoogleGenAI {
    constructor(options: { apiKey: string });
    interactions: any;
  }
}

declare module 'mammoth' {
 export interface MammothMessage {
 type: 'warning' | 'error';
 message: string;
 }

 export interface MammothResult {
 value: string;
 messages: MammothMessage[];
 }

 export interface MammothInput {
 buffer?: Buffer;
 path?: string;
 }

 export interface ConvertOptions {
 styleMap?: string[];
 includeDefaultStyleMap?: boolean;
 convertImage?: (element: ImageElement) => Promise<ImageResult>;
 }

 export interface ImageElement {
 read: (encoding: string) => Promise<Buffer>;
 contentType: string;
 }

 export interface ImageResult {
 src: string;
 }

 export function extractRawText(input: MammothInput): Promise<MammothResult>;
 export function convertToHtml(
 input: MammothInput,
 options?: ConvertOptions,
 ): Promise<MammothResult>;
 export function convertToMarkdown(
 input: MammothInput,
 options?: ConvertOptions,
 ): Promise<MammothResult>;
}

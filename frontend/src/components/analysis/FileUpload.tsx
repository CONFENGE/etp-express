import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Allowed file extensions for upload
 */
const ALLOWED_EXTENSIONS = ['.pdf', '.docx'];

/**
 * Allowed MIME types for upload
 */
const ALLOWED_MIME_TYPES = [
 'application/pdf',
 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/**
 * Maximum file size in bytes (10MB)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Props for FileUpload component
 */
export interface FileUploadProps {
 /**
 * Callback when a valid file is selected
 */
 onFileSelect: (file: File) => void;
 /**
 * Callback when file is removed
 */
 onFileRemove?: () => void;
 /**
 * Whether upload is disabled
 */
 disabled?: boolean;
 /**
 * Currently selected file (controlled mode)
 */
 selectedFile?: File | null;
 /**
 * Error message to display
 */
 error?: string | null;
 /**
 * Class name for additional styling
 */
 className?: string;
}

/**
 * Formats file size in human readable format
 */
function formatFileSize(bytes: number): string {
 if (bytes < 1024) return `${bytes} B`;
 if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
 return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Validates a file against allowed types and size
 */
function validateFile(file: File): string | null {
 // Check file type
 const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
 if (!ALLOWED_EXTENSIONS.includes(extension)) {
 return `Formato inválido. Apenas ${ALLOWED_EXTENSIONS.join(', ')} são aceitos.`;
 }

 if (!ALLOWED_MIME_TYPES.includes(file.type)) {
 return `Tipo de arquivo inválido. Apenas PDF e DOCX são aceitos.`;
 }

 // Check file size
 if (file.size > MAX_FILE_SIZE) {
 return `Arquivo muito grande. Tamanho máximo: ${formatFileSize(MAX_FILE_SIZE)}`;
 }

 if (file.size === 0) {
 return 'Arquivo vazio. Selecione um arquivo válido.';
 }

 return null;
}

/**
 * FileUpload Component
 *
 * Provides drag-and-drop and click-to-upload functionality for PDF/DOCX files.
 * Validates file type and size on the client side before upload.
 *
 * @example
 * ```tsx
 * <FileUpload
 * onFileSelect={(file) => console.log('Selected:', file.name)}
 * onFileRemove={() => console.log('Removed')}
 * />
 * ```
 */
export function FileUpload({
 onFileSelect,
 onFileRemove,
 disabled = false,
 selectedFile = null,
 error: externalError = null,
 className,
}: FileUploadProps) {
 const [isDragging, setIsDragging] = useState(false);
 const [validationError, setValidationError] = useState<string | null>(null);
 const inputRef = useRef<HTMLInputElement>(null);

 const error = externalError || validationError;

 /**
 * Handle file selection from input or drop
 */
 const handleFile = useCallback(
 (file: File) => {
 setValidationError(null);

 const validationResult = validateFile(file);
 if (validationResult) {
 setValidationError(validationResult);
 return;
 }

 onFileSelect(file);
 },
 [onFileSelect],
 );

 /**
 * Handle drag events
 */
 const handleDragEnter = useCallback(
 (e: React.DragEvent) => {
 e.preventDefault();
 e.stopPropagation();
 if (!disabled) {
 setIsDragging(true);
 }
 },
 [disabled],
 );

 const handleDragLeave = useCallback((e: React.DragEvent) => {
 e.preventDefault();
 e.stopPropagation();
 setIsDragging(false);
 }, []);

 const handleDragOver = useCallback(
 (e: React.DragEvent) => {
 e.preventDefault();
 e.stopPropagation();
 if (!disabled) {
 setIsDragging(true);
 }
 },
 [disabled],
 );

 const handleDrop = useCallback(
 (e: React.DragEvent) => {
 e.preventDefault();
 e.stopPropagation();
 setIsDragging(false);

 if (disabled) return;

 const files = e.dataTransfer.files;
 if (files.length > 0) {
 handleFile(files[0]);
 }
 },
 [disabled, handleFile],
 );

 /**
 * Handle input change
 */
 const handleInputChange = useCallback(
 (e: React.ChangeEvent<HTMLInputElement>) => {
 const files = e.target.files;
 if (files && files.length > 0) {
 handleFile(files[0]);
 }
 // Reset input value to allow re-selecting same file
 e.target.value = '';
 },
 [handleFile],
 );

 /**
 * Handle click to open file dialog
 */
 const handleClick = useCallback(() => {
 if (!disabled) {
 inputRef.current?.click();
 }
 }, [disabled]);

 /**
 * Handle file removal
 */
 const handleRemove = useCallback(
 (e: React.MouseEvent) => {
 e.stopPropagation();
 setValidationError(null);
 onFileRemove?.();
 },
 [onFileRemove],
 );

 /**
 * Handle keyboard navigation
 */
 const handleKeyDown = useCallback(
 (e: React.KeyboardEvent) => {
 if (e.key === 'Enter' || e.key === ' ') {
 e.preventDefault();
 handleClick();
 }
 },
 [handleClick],
 );

 // File is selected - show preview
 if (selectedFile) {
 return (
 <Card className={cn('relative', className)}>
 <CardContent className="p-6">
 <div className="flex items-center gap-4">
 <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
 <FileText className="h-6 w-6 text-primary" aria-hidden="true" />
 </div>
 <div className="flex-1 min-w-0">
 <p className="font-medium truncate" title={selectedFile.name}>
 {selectedFile.name}
 </p>
 <p className="text-sm text-muted-foreground">
 {formatFileSize(selectedFile.size)}
 </p>
 </div>
 {!disabled && (
 <Button
 variant="ghost"
 size="icon"
 onClick={handleRemove}
 aria-label="Remover arquivo"
 className="flex-shrink-0"
 >
 <X className="h-4 w-4" />
 </Button>
 )}
 </div>
 {error && (
 <div className="mt-4 flex items-center gap-2 text-destructive text-sm">
 <AlertCircle className="h-4 w-4" aria-hidden="true" />
 <span>{error}</span>
 </div>
 )}
 </CardContent>
 </Card>
 );
 }

 // No file selected - show drop zone
 return (
 <Card
 className={cn(
 'relative transition-colors cursor-pointer',
 isDragging && 'border-primary bg-primary/5',
 disabled && 'opacity-50 cursor-not-allowed',
 error && 'border-destructive',
 className,
 )}
 onClick={handleClick}
 onKeyDown={handleKeyDown}
 onDragEnter={handleDragEnter}
 onDragLeave={handleDragLeave}
 onDragOver={handleDragOver}
 onDrop={handleDrop}
 tabIndex={disabled ? -1 : 0}
 role="button"
 aria-label="Área de upload de arquivo"
 aria-describedby={error ? 'file-upload-error' : 'file-upload-hint'}
 >
 <CardContent className="p-8">
 <input
 ref={inputRef}
 type="file"
 accept={ALLOWED_EXTENSIONS.join(',')}
 onChange={handleInputChange}
 disabled={disabled}
 className="sr-only"
 aria-hidden="true"
 />

 <div className="flex flex-col items-center text-center">
 <div
 className={cn(
 'w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors',
 isDragging ? 'bg-primary/20' : 'bg-muted',
 )}
 >
 <Upload
 className={cn(
 'h-8 w-8 transition-colors',
 isDragging ? 'text-primary' : 'text-muted-foreground',
 )}
 aria-hidden="true"
 />
 </div>

 <p className="font-medium mb-1">
 {isDragging
 ? 'Solte o arquivo aqui'
 : 'Arraste um documento ou clique para selecionar'}
 </p>

 <p id="file-upload-hint" className="text-sm text-muted-foreground">
 Formatos aceitos: PDF, DOCX (máx. {formatFileSize(MAX_FILE_SIZE)})
 </p>

 {error && (
 <div
 id="file-upload-error"
 className="mt-4 flex items-center gap-2 text-destructive text-sm"
 role="alert"
 >
 <AlertCircle className="h-4 w-4" aria-hidden="true" />
 <span>{error}</span>
 </div>
 )}
 </div>
 </CardContent>
 </Card>
 );
}

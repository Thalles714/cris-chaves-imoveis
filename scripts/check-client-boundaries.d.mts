export interface SourceFile {
	absolutePath: string;
	relativePath: string;
	content: string;
}

export function isServerOnlySpecifier(specifier: string): boolean;

export function isClientCapableModule(relativePath: string): boolean;

export function analyzeSourceFiles(files: SourceFile[]): string[];

export function findSourceViolations(projectRoot?: string): Promise<string[]>;

export function findBundleViolations(projectRoot?: string): Promise<string[]>;

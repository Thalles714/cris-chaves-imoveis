import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
	return (
		<svg aria-hidden="true" fill="none" focusable="false" viewBox="0 0 24 24" {...props}>
			{children}
		</svg>
	);
}

const strokeProps = {
	stroke: "currentColor",
	strokeLinecap: "round" as const,
	strokeLinejoin: "round" as const,
	strokeWidth: 1.7,
};

export function ChevronDownIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="m6 9 6 6 6-6" {...strokeProps} />
		</Icon>
	);
}

export function ChevronLeftIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="m14.5 6-6 6 6 6" {...strokeProps} />
		</Icon>
	);
}

export function ChevronRightIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="m9.5 6 6 6-6 6" {...strokeProps} />
		</Icon>
	);
}

export function CloseIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M6 6l12 12M18 6 6 18" {...strokeProps} />
		</Icon>
	);
}

export function HeartIcon({
	filled = false,
	...props
}: IconProps & { filled?: boolean }) {
	return (
		<Icon {...props}>
			<path
				d="M20.8 4.8a5.5 5.5 0 0 0-7.8 0L12 5.8l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.4l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8Z"
				fill={filled ? "currentColor" : "none"}
				{...strokeProps}
			/>
		</Icon>
	);
}

export function MenuIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M4 7h16M4 12h16M4 17h16" {...strokeProps} />
		</Icon>
	);
}

export function CheckIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="m5 12 4 4L19 6" {...strokeProps} />
		</Icon>
	);
}

export function AlertIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M12 8.5V13M12 17h.01" {...strokeProps} />
			<path
				d="M10.3 3.7 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z"
				{...strokeProps}
			/>
		</Icon>
	);
}

export function BuildingIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path
				d="M4 21V7l8-4v18M12 9h8v12M2 21h20M7 8v2M7 13v2M7 18v2M16 12v2M16 17v2"
				{...strokeProps}
			/>
		</Icon>
	);
}

export function SearchIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<circle cx="11" cy="11" r="7" {...strokeProps} />
			<path d="m16.5 16.5 4 4" {...strokeProps} />
		</Icon>
	);
}

export function SunIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<circle cx="12" cy="12" r="3.5" {...strokeProps} />
			<path
				d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"
				{...strokeProps}
			/>
		</Icon>
	);
}

export function HomeIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M3 11.5 12 4l9 7.5M5.5 10v10h13V10M9 20v-6h6v6" {...strokeProps} />
		</Icon>
	);
}

export function PlusIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M12 5v14M5 12h14" {...strokeProps} />
		</Icon>
	);
}

export function UsersIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path
				d="M16 20v-1.5a4.5 4.5 0 0 0-4.5-4.5h-4A4.5 4.5 0 0 0 3 18.5V20"
				{...strokeProps}
			/>
			<circle cx="9.5" cy="7.5" r="3.5" {...strokeProps} />
			<path
				d="M17 11a3 3 0 1 0-1.7-5.5M17.5 14.5A4 4 0 0 1 21 18.5V20"
				{...strokeProps}
			/>
		</Icon>
	);
}

export function AuditIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M7 4h10M7 4v16h10V4M9.5 9h5M9.5 13h5M9.5 17h3" {...strokeProps} />
		</Icon>
	);
}

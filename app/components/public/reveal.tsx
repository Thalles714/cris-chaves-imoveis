import { useEffect, useRef } from "react";
import type { CSSProperties, HTMLAttributes } from "react";

import { cx } from "~/components/ui/utils";

type RevealProps = HTMLAttributes<HTMLDivElement> & {
	delay?: number;
};

export function Reveal({ delay = 0, className, children, style, ...props }: RevealProps) {
	const elementRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const element = elementRef.current;
		if (!element) return;

		element.dataset.revealReady = "true";
		if (!("IntersectionObserver" in window)) {
			element.dataset.revealVisible = "true";
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				if (!entries.some((entry) => entry.isIntersecting)) return;
				element.dataset.revealVisible = "true";
				observer.disconnect();
			},
			{ rootMargin: "0px 0px -10%", threshold: 0.12 },
		);
		observer.observe(element);
		return () => observer.disconnect();
	}, []);

	return (
		<div
			ref={elementRef}
			className={cx("cc-reveal", className)}
			style={{ ...style, "--cc-reveal-delay": `${delay}ms` } as CSSProperties}
			{...props}
		>
			{children}
		</div>
	);
}

export function RevealObserver({ selector = ".cc-home-reveal" }: { selector?: string }) {
	useEffect(() => {
		const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
		if (!elements.length) return;
		for (const element of elements) element.dataset.revealReady = "true";

		if (!("IntersectionObserver" in window)) {
			for (const element of elements) element.dataset.revealVisible = "true";
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					(entry.target as HTMLElement).dataset.revealVisible = "true";
					observer.unobserve(entry.target);
				}
			},
			{ rootMargin: "0px 0px -10%", threshold: 0.12 },
		);
		for (const element of elements) observer.observe(element);
		return () => observer.disconnect();
	}, [selector]);

	return null;
}

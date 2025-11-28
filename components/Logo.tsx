import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

type Props = {
	size?: number; 
	src?: string; 
	showText?: boolean; 
	tagline?: string; 
	className?: string;
};

export default function Logo({
	size = 36,
	src = '/logo-placeholder.svg',
	showText = true,
	tagline,
	className,
}: Props) {
	const [imgSrc, setImgSrc] = useState(src);

	return (
		<Link
			href="/"
			className={`flex items-center gap-3 ${className ?? ''}`}
			aria-label="Scentistry Home"
		>
			<Image
				src={imgSrc}
				alt="Scentistry"
				width={size}
				height={size}
				className="object-contain drop-shadow-sm"
				onError={() => setImgSrc('/logo-placeholder.svg')}
				priority
			/>
			{showText && (
				<div className="leading-tight">
					<span className="block font-serif text-xl tracking-wide text-brand-dark">Scentistry</span>
					{tagline && (
						<span className="block text-xs text-brand-dark/70">{tagline}</span>
					)}
				</div>
			)}
		</Link>
	);
}


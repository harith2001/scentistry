import * as React from 'react';

interface Props {
  title: string;
  subtitle?: string;
  className?: string;
}

export default function SectionHeading({ title, subtitle, className }: Props) {
  return (
    <div className={["text-center space-y-3", className].filter(Boolean).join(' ')}>
      <h2 className="text-3xl md:text-4xl font-serif text-black tracking-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="mx-auto max-w-2xl text-black/70 font-sans">
          {subtitle}
        </p>
      )}
      <div className="mx-auto w-24 gold-divider rounded-full" />
    </div>
  );
}

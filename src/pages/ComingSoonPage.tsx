export default function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="space-y-2 py-8">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-slate-600">Cette section sera disponible prochainement.</p>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 mt-auto">
      <div className="container mx-auto px-4">
        <p className="font-semibold text-slate-700">3D Demo Project</p>
        <p className="mt-1 text-[11px] text-slate-400">
          © {new Date().getFullYear()} 3D Demo. Base Next.js Architecture.
        </p>
      </div>
    </footer>
  );
}

export default Footer;

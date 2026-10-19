import { useInView } from "./useInView";

const CATEGORIAS = [
  {
    nombre: "rostro",
    href: "tienda.html#dermocosmetica",
    video: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260518_203023_87a26602-2898-4acc-a396-c7a2b5ad84fd.mp4",
  },
  {
    nombre: "accesorios",
    href: "tienda.html#cuidado-personal",
    video: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260518_203415_b86e3f19-2aec-46cd-9a86-b64c40118e38.mp4",
  },
  {
    nombre: "cuerpo",
    href: "tienda.html#cuidado-personal",
    video: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260518_203051_85fee398-ea01-4aa0-972b-137a74213be5.mp4",
  },
];

export default function Categorias({ categorias = CATEGORIAS }) {
  const { ref, isVisible } = useInView(0.1);

  return (
    <section className="bg-white text-white min-h-screen flex flex-col justify-center">
      <div
        ref={ref}
        className={`grid grid-cols-1 md:grid-cols-3 transition-all duration-1000 ease-out ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
        }`}
      >
        {categorias.map((cat, index) => (
          <div
            key={cat.nombre}
            className="group relative flex flex-col justify-between items-start p-6 sm:p-8 md:p-12 min-h-[400px] sm:min-h-[500px] md:min-h-[750px] overflow-hidden"
            style={{ transitionDelay: `${index * 150}ms` }}
          >
            <video
              src={cat.video}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors duration-500" />

            <h2
              className="relative z-10 text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-medium transition-transform duration-500 group-hover:-translate-y-2"
              style={{ writingMode: "vertical-lr", transform: "rotate(180deg)" }}
            >
              {cat.nombre}
            </h2>

            <button
              type="button"
              onClick={() => { if (cat.href) window.location.href = cat.href; }}
              className="btn-primary relative z-10 mt-auto px-8 py-3 bg-white text-black rounded-full text-sm"
            >
              ver {cat.nombre}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

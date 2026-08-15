export default function GradientBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Animated Gradient Border */}
      <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-brand-gradient-start via-brand-gradient-middle to-brand-gradient-end animate-gradient bg-[length:200%_200%] opacity-30" />
      
      {/* Subtle Glow Effect */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-brand-gradient-start/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-brand-gradient-end/10 rounded-full blur-3xl" />
      
      {/* Decorative Dots */}
      <div className="absolute top-8 right-8 flex gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-brand-gradient-start/20" />
        <div className="w-1.5 h-1.5 rounded-full bg-brand-gradient-middle/20" />
        <div className="w-1.5 h-1.5 rounded-full bg-brand-gradient-end/20" />
      </div>
      <div className="absolute bottom-8 left-8 flex gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-brand-gradient-end/20" />
        <div className="w-1.5 h-1.5 rounded-full bg-brand-gradient-middle/20" />
        <div className="w-1.5 h-1.5 rounded-full bg-brand-gradient-start/20" />
      </div>
    </div>
  );
}
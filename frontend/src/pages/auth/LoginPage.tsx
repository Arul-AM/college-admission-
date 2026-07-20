import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Lock, User, AlertCircle, MapPin, BookOpen } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { login } from '../../services/api';
import { getErrorMessage } from '../../utils';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>();

  // Campus banner — drop real CEG photos into /public/images/campus/
  // and update this list with the filenames. Captions are optional.
  // Sourced from Wikimedia Commons (CC-BY-SA) — verify each file's category
  // page confirms "College of Engineering, Guindy" before adding new ones,
  // and credit photographers somewhere on-site (e.g. an About/Credits section)
  // per the CC-BY-SA attribution requirement.
  const campusPhotos = [
    {
      src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Anna_university_02.jpg/960px-Anna_university_02.jpg',
      caption: 'Anna University Campus',
    },
    {
      src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Anna_university_Auditorium.jpg/960px-Anna_university_Auditorium.jpg',
      caption: 'Auditorium',
    },
    {
      src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Anna_university_3.jpg/960px-Anna_university_3.jpg',
      caption: 'Campus View',
    },
    {
      src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Anna_university_04.jpg/960px-Anna_university_04.jpg',
      caption: 'Campus Grounds',
    },
  ];
  const [bannerIndex, setBannerIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setBannerIndex((i) => (i + 1) % campusPhotos.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const orbs = Array.from({ length: 6 }, (_, i) => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: 80 + Math.random() * 140,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      hue: [210, 230, 250, 200, 220, 240][i],
      alpha: 0.12 + Math.random() * 0.1,
    }));

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: 0.6 + Math.random() * 1.6,
      vy: -0.25 - Math.random() * 0.35,
      alpha: 0.2 + Math.random() * 0.5,
    }));

    const draw = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const o of orbs) {
        o.x += o.vx;
        o.y += o.vy;
        if (o.x < -o.r) o.x = canvas.width + o.r;
        if (o.x > canvas.width + o.r) o.x = -o.r;
        if (o.y < -o.r) o.y = canvas.height + o.r;
        if (o.y > canvas.height + o.r) o.y = -o.r;

        const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
        g.addColorStop(0, `hsla(${o.hue},80%,65%,${o.alpha})`);
        g.addColorStop(1, `hsla(${o.hue},80%,65%,0)`);
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      }

      for (const p of particles) {
        p.y += p.vy;
        if (p.y < -4) {
          p.y = canvas.height + 4;
          p.x = Math.random() * canvas.width;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current!);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      setError('Username and password are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await login(form.username, form.password);
      setAuth(res.data.user, res.data.token);
      if (res.data.user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/staff/queue');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">

      {/* Animated canvas: orbs + particles */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Shimmer sweep */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 2,
          background:
            'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.04) 50%, transparent 60%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 7s ease-in-out infinite',
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 3,
          background:
            'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.35) 100%)',
        }}
      />

      {/* Page Content — two columns on large screens: CEG info + login card */}
      <div
        className="w-full max-w-5xl relative grid grid-cols-1 lg:grid-cols-5 gap-10 items-center"
        style={{ zIndex: 10 }}
      >

        {/* Left panel — CEG institutional info, fills the empty space on wide screens */}
        <div className="hidden lg:flex lg:col-span-3 flex-col justify-center pr-8 border-r border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-lg leading-tight">
                College of Engineering, Guindy
              </p>
              <p className="text-blue-200 text-sm">Anna University, Chennai</p>
            </div>
          </div>

          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Admission Management<br />System
          </h2>
          <p className="text-blue-100/80 text-base leading-relaxed mb-6 max-w-md">
            A unified platform for processing student admissions across
            document verification, certificate checks, and final enrollment —
            built for CEG's admissions staff and administrators.
          </p>

          {/* Autoplay campus photo banner */}
          <div className="relative w-full max-w-md h-56 rounded-xl overflow-hidden border border-white/15 shadow-lg mb-8 bg-white/5">
            {campusPhotos.map((photo, i) => (
              <img
                key={photo.src}
                src={photo.src}
                alt={photo.caption}
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out"
                style={{ opacity: i === bannerIndex ? 1 : 0 }}
              />
            ))}
            {/* Caption + gradient scrim */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 pt-8 pb-3">
              <p className="text-white text-sm font-medium">{campusPhotos[bannerIndex].caption}</p>
            </div>
            {/* Dots */}
            <div className="absolute top-3 right-3 flex gap-1.5">
              {campusPhotos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setBannerIndex(i)}
                  aria-label={`Show photo ${i + 1}`}
                  className="w-1.5 h-1.5 rounded-full transition-all"
                  style={{
                    backgroundColor: i === bannerIndex ? 'white' : 'rgba(255,255,255,0.4)',
                    width: i === bannerIndex ? '14px' : '6px',
                  }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <BookOpen className="w-5 h-5 text-blue-200 mt-0.5 flex-shrink-0" />
              <p className="text-blue-100/70 text-sm">
                Established in 1794 — Asia's oldest technical institution
              </p>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-blue-200 mt-0.5 flex-shrink-0" />
              <p className="text-blue-100/70 text-sm">
                Sardar Patel Road, Guindy, Chennai&nbsp;–&nbsp;600025
              </p>
            </div>
          </div>
        </div>

        {/* Right panel — login card */}
        <div className="lg:col-span-2 w-full max-w-md mx-auto">

          {/* Header (mobile + tablet only, since left panel covers this on desktop) */}
          <div className="text-center mb-8 lg:hidden">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 backdrop-blur mb-4">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Admission Portal</h1>
            <p className="text-blue-200 mt-2">College Admission Management System</p>
          </div>

          {/* Login Card — fully transparent glass */}
          <div className="bg-transparent backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-6 text-center">Sign In</h2>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/20 border border-red-400/40 rounded-lg p-3 mb-5 text-red-300 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="text"
                    placeholder="Enter your username"
                    value={form.username}
                    onChange={e => setForm({ ...form, username: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent"
                    autoFocus
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="password"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white/20 hover:bg-white/30 disabled:bg-white/10 text-white font-semibold py-2.5 rounded-lg border border-white/30 transition-colors duration-200"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* Demo credentials — all 6 staff stages, Admin removed */}
            <div className="mt-6 pt-5 border-t border-white/10">
              <p className="text-xs text-white/40 text-center font-medium mb-3">Staff Login Shortcuts</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label: 'Stage 1 · Document Verification', short: 'Stage 1', un: 'staff1', pw: 'Staff@123' },
                  { label: 'Stage 2 · Certificate Verification', short: 'Stage 2', un: 'staff2', pw: 'Staff@123' },
                  { label: 'Stage 3 · Online Verification', short: 'Stage 3', un: 'staff3', pw: 'Staff@123' },
                  { label: 'Stage 4 · Admission Verification', short: 'Stage 4', un: 'staff4', pw: 'Staff@123' },
                  { label: 'Stage 5 · Admission Completion', short: 'Stage 5', un: 'staff5', pw: 'Staff@123' },
                  { label: 'Help Desk', short: 'Help Desk', un: 'staff6', pw: 'Staff@123' },
                ].map(c => (
                  <button
                    key={c.un}
                    title={c.label}
                    onClick={() => setForm({ username: c.un, password: c.pw })}
                    className="bg-white/10 hover:bg-white/20 border border-white/20 rounded p-2 text-left transition-colors"
                  >
                    <div className="font-medium text-white/80">{c.short}</div>
                    <div className="text-white/40">{c.un}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-center text-blue-200 text-sm mt-6">
            © 2026 College Admission Management System
          </p>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0%, 100% { background-position: 200% 0; }
          50% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
